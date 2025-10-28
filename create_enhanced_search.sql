-- ============================================================================
-- Enhanced Search System - Database Setup
-- ============================================================================
-- This script creates a comprehensive search system for users, games, squads
-- Run this in your Supabase SQL Editor.
-- ============================================================================

-- Create search_history table
CREATE TABLE IF NOT EXISTS search_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  query text NOT NULL,
  search_type text DEFAULT 'all', -- 'all', 'users', 'games', 'squads'
  filters jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT NOW()
);

-- Create saved_searches table
CREATE TABLE IF NOT EXISTS saved_searches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  query text NOT NULL,
  search_type text DEFAULT 'all',
  filters jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT NOW()
);

-- Create indexes for search_history
CREATE INDEX IF NOT EXISTS idx_search_history_user ON search_history(user_id);
CREATE INDEX IF NOT EXISTS idx_search_history_created ON search_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_search_history_query ON search_history(query);

-- Create indexes for saved_searches
CREATE INDEX IF NOT EXISTS idx_saved_searches_user ON saved_searches(user_id);

-- Enable RLS
ALTER TABLE search_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_searches ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own search history" ON search_history;
DROP POLICY IF EXISTS "Users can manage their own search history" ON search_history;
DROP POLICY IF EXISTS "Users can view their saved searches" ON saved_searches;
DROP POLICY IF EXISTS "Users can manage their saved searches" ON saved_searches;

-- Search history policies
CREATE POLICY "Users can view their own search history"
  ON search_history FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage their own search history"
  ON search_history FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Saved searches policies
CREATE POLICY "Users can view their saved searches"
  ON saved_searches FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage their saved searches"
  ON saved_searches FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Function to search users
CREATE OR REPLACE FUNCTION search_users(
  p_query text,
  p_limit integer DEFAULT 20,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  username text,
  status text,
  avatar_url text,
  level integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.username,
    'online'::text as status,
    NULL::text as avatar_url,
    0::integer as level
  FROM profiles p
  WHERE p.username ILIKE '%' || p_query || '%'
  ORDER BY 
    CASE WHEN p.username ILIKE p_query || '%' THEN 1 ELSE 2 END,
    p.username
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Function to search squads
CREATE OR REPLACE FUNCTION search_squads(
  p_query text,
  p_is_public_only boolean DEFAULT true,
  p_limit integer DEFAULT 20,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  name text,
  description text,
  is_public boolean,
  member_count bigint,
  owner_username text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.name,
    s.description,
    s.is_public,
    COUNT(DISTINCT sm.user_id) as member_count,
    p.username as owner_username
  FROM squads s
  LEFT JOIN squad_members sm ON s.id = sm.squad_id
  LEFT JOIN profiles p ON s.owner_id = p.id
  WHERE (s.name ILIKE '%' || p_query || '%' 
    OR s.description ILIKE '%' || p_query || '%')
    AND (NOT p_is_public_only OR s.is_public)
  GROUP BY s.id, s.name, s.description, s.is_public, p.username
  ORDER BY 
    CASE WHEN s.name ILIKE p_query || '%' THEN 1 ELSE 2 END,
    s.name
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Function to search games
CREATE OR REPLACE FUNCTION search_games(
  p_query text,
  p_limit integer DEFAULT 20,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  game_name text,
  platform text,
  hours_played_sum numeric,
  player_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ug.game_name,
    ug.platform,
    SUM(ug.hours_played) as hours_played_sum,
    COUNT(DISTINCT ug.user_id) as player_count
  FROM user_games ug
  WHERE ug.game_name ILIKE '%' || p_query || '%'
  GROUP BY ug.game_name, ug.platform
  ORDER BY 
    CASE WHEN ug.game_name ILIKE p_query || '%' THEN 1 ELSE 2 END,
    COUNT(DISTINCT ug.user_id) DESC,
    ug.game_name
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Function to save search
CREATE OR REPLACE FUNCTION save_search(
  p_name text,
  p_query text,
  p_search_type text DEFAULT 'all',
  p_filters jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_search_id uuid;
BEGIN
  INSERT INTO saved_searches (user_id, name, query, search_type, filters)
  VALUES (auth.uid(), p_name, p_query, p_search_type, p_filters)
  RETURNING id INTO v_search_id;
  
  RETURN v_search_id;
END;
$$;

-- Function to record search
CREATE OR REPLACE FUNCTION record_search(
  p_query text,
  p_search_type text DEFAULT 'all',
  p_filters jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO search_history (user_id, query, search_type, filters)
  VALUES (auth.uid(), p_query, p_search_type, p_filters);
END;
$$;

-- Function to get recent searches
CREATE OR REPLACE FUNCTION get_recent_searches(
  p_limit integer DEFAULT 10
)
RETURNS TABLE (
  query text,
  search_type text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    sh.query,
    sh.search_type,
    MAX(sh.created_at) as created_at
  FROM search_history sh
  WHERE sh.user_id = auth.uid()
  GROUP BY sh.query, sh.search_type
  ORDER BY created_at DESC
  LIMIT p_limit;
END;
$$;

-- Function to clear search history
CREATE OR REPLACE FUNCTION clear_search_history()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM search_history
  WHERE user_id = auth.uid();
END;
$$;

COMMENT ON TABLE search_history IS 'User search history';
COMMENT ON TABLE saved_searches IS 'Saved searches for quick access';
COMMENT ON FUNCTION search_users IS 'Search for users by username';
COMMENT ON FUNCTION search_squads IS 'Search for squads by name or description';
COMMENT ON FUNCTION search_games IS 'Search for games by name';
COMMENT ON FUNCTION save_search IS 'Save a search for later';
COMMENT ON FUNCTION record_search IS 'Record a search in history';
COMMENT ON FUNCTION get_recent_searches IS 'Get recent searches';
COMMENT ON FUNCTION clear_search_history IS 'Clear search history';
