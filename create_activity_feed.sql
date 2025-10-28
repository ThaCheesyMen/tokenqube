-- ============================================================================
-- Activity Feed System - Database Setup
-- ============================================================================
-- This script creates an activity feed for tracking user and friend activities
-- Run this in your Supabase SQL Editor.
-- ============================================================================

-- Create activity_feed table
CREATE TABLE IF NOT EXISTS activity_feed (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  activity_type text NOT NULL, -- 'game_achievement', 'level_up', 'token_earned', 'friend_added', 'party_joined', 'squad_joined', etc.
  title text NOT NULL,
  description text,
  icon text,
  data jsonb DEFAULT '{}'::jsonb,
  visibility text DEFAULT 'public', -- 'public', 'friends', 'private'
  created_at timestamptz DEFAULT NOW()
);

-- Create activity_likes table for liking activities
CREATE TABLE IF NOT EXISTS activity_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id uuid REFERENCES activity_feed(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT NOW(),
  UNIQUE(activity_id, user_id)
);

-- Create activity_comments table
CREATE TABLE IF NOT EXISTS activity_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id uuid REFERENCES activity_feed(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  comment text NOT NULL,
  created_at timestamptz DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_activity_feed_user ON activity_feed(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_feed_created ON activity_feed(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_feed_type ON activity_feed(activity_type);
CREATE INDEX IF NOT EXISTS idx_activity_likes_activity ON activity_likes(activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_likes_user ON activity_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_comments_activity ON activity_comments(activity_id);

-- Enable RLS
ALTER TABLE activity_feed ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_comments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view public activities" ON activity_feed;
DROP POLICY IF EXISTS "Users can view friend activities" ON activity_feed;
DROP POLICY IF EXISTS "Users can create their own activities" ON activity_feed;
DROP POLICY IF EXISTS "Users can view activity likes" ON activity_likes;
DROP POLICY IF EXISTS "Users can like activities" ON activity_likes;
DROP POLICY IF EXISTS "Users can view activity comments" ON activity_comments;
DROP POLICY IF EXISTS "Users can comment on activities" ON activity_comments;

-- Activity feed policies
CREATE POLICY "Users can view public activities"
  ON activity_feed FOR SELECT
  TO authenticated
  USING (
    visibility = 'public' OR
    user_id = auth.uid()
  );

CREATE POLICY "Users can view friend activities"
  ON activity_feed FOR SELECT
  TO authenticated
  USING (
    visibility IN ('public', 'friends') AND
    (
      user_id IN (
        SELECT friend_id FROM friends 
        WHERE user_id = auth.uid() AND status = 'accepted'
      )
      OR user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create their own activities"
  ON activity_feed FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Activity likes policies
CREATE POLICY "Users can view activity likes"
  ON activity_likes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can like activities"
  ON activity_likes FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (user_id = auth.uid());

-- Activity comments policies
CREATE POLICY "Users can view activity comments"
  ON activity_comments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can comment on activities"
  ON activity_comments FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (user_id = auth.uid());

-- Function to create activity
CREATE OR REPLACE FUNCTION create_activity(
  p_activity_type text,
  p_title text,
  p_description text DEFAULT NULL,
  p_icon text DEFAULT NULL,
  p_data jsonb DEFAULT '{}'::jsonb,
  p_visibility text DEFAULT 'public'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_activity_id uuid;
BEGIN
  INSERT INTO activity_feed (user_id, activity_type, title, description, icon, data, visibility)
  VALUES (auth.uid(), p_activity_type, p_title, p_description, p_icon, p_data, p_visibility)
  RETURNING id INTO v_activity_id;
  
  RETURN v_activity_id;
END;
$$;

-- Function to get activity feed (with pagination)
CREATE OR REPLACE FUNCTION get_activity_feed(
  p_limit integer DEFAULT 20,
  p_offset integer DEFAULT 0,
  p_activity_types text[] DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  username text,
  avatar_url text,
  activity_type text,
  title text,
  description text,
  icon text,
  data jsonb,
  likes_count bigint,
  comments_count bigint,
  user_liked boolean,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    af.id,
    af.user_id,
    p.username,
    NULL as avatar_url,
    af.activity_type,
    af.title,
    af.description,
    af.icon,
    af.data,
    COUNT(DISTINCT al.id) as likes_count,
    COUNT(DISTINCT ac.id) as comments_count,
    EXISTS(SELECT 1 FROM activity_likes WHERE activity_id = af.id AND user_id = auth.uid()) as user_liked,
    af.created_at
  FROM activity_feed af
  INNER JOIN profiles p ON af.user_id = p.id
  LEFT JOIN activity_likes al ON af.id = al.activity_id
  LEFT JOIN activity_comments ac ON af.id = ac.activity_id
  WHERE (
    af.visibility = 'public' OR
    (af.visibility = 'friends' AND af.user_id IN (
      SELECT f.friend_id FROM friends f
      WHERE f.user_id = auth.uid() AND f.status = 'accepted'
    )) OR
    af.user_id = auth.uid()
  )
  AND (p_activity_types IS NULL OR af.activity_type = ANY(p_activity_types))
  GROUP BY af.id, af.user_id, p.username, af.activity_type, af.title, af.description, af.icon, af.data, af.created_at
  ORDER BY af.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Function to like/unlike activity
CREATE OR REPLACE FUNCTION toggle_activity_like(p_activity_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM activity_likes WHERE activity_id = p_activity_id AND user_id = auth.uid()) THEN
    DELETE FROM activity_likes WHERE activity_id = p_activity_id AND user_id = auth.uid();
  ELSE
    INSERT INTO activity_likes (activity_id, user_id) VALUES (p_activity_id, auth.uid());
  END IF;
END;
$$;

-- Function to add comment
CREATE OR REPLACE FUNCTION add_activity_comment(
  p_activity_id uuid,
  p_comment text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_comment_id uuid;
BEGIN
  INSERT INTO activity_comments (activity_id, user_id, comment)
  VALUES (p_activity_id, auth.uid(), p_comment)
  RETURNING id INTO v_comment_id;
  
  RETURN v_comment_id;
END;
$$;

-- Function to get activity comments
CREATE OR REPLACE FUNCTION get_activity_comments(
  p_activity_id uuid,
  p_limit integer DEFAULT 20,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  username text,
  avatar_url text,
  comment text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ac.id,
    ac.user_id,
    p.username,
    NULL as avatar_url,
    ac.comment,
    ac.created_at
  FROM activity_comments ac
  INNER JOIN profiles p ON ac.user_id = p.id
  WHERE ac.activity_id = p_activity_id
  ORDER BY ac.created_at ASC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Trigger to auto-create friend added activity
CREATE OR REPLACE FUNCTION create_friend_added_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_username text;
BEGIN
  IF NEW.status = 'accepted' AND OLD.status != 'accepted' THEN
    -- Get friend's username
    SELECT username INTO v_username FROM profiles WHERE id = NEW.friend_id;
    
    -- Create activity for the user
    INSERT INTO activity_feed (user_id, activity_type, title, description, icon, data)
    VALUES (NEW.user_id, 'friend_added', 'New Friend!', v_username || ' is now your friend', '👋',
      jsonb_build_object('friend_id', NEW.friend_id));
    
    -- Create activity for the friend
    SELECT username INTO v_username FROM profiles WHERE id = NEW.user_id;
    INSERT INTO activity_feed (user_id, activity_type, title, description, icon, data)
    VALUES (NEW.friend_id, 'friend_added', 'New Friend!', v_username || ' is now your friend', '👋',
      jsonb_build_object('friend_id', NEW.user_id));
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS friend_added_activity_trigger ON friends;

CREATE TRIGGER friend_added_activity_trigger
  AFTER UPDATE ON friends
  FOR EACH ROW
  WHEN (NEW.status IS DISTINCT FROM OLD.status)
  EXECUTE FUNCTION create_friend_added_activity();

COMMENT ON TABLE activity_feed IS 'User activity feed entries';
COMMENT ON TABLE activity_likes IS 'Likes on activity feed entries';
COMMENT ON TABLE activity_comments IS 'Comments on activity feed entries';
COMMENT ON FUNCTION create_activity IS 'Creates a new activity entry';
COMMENT ON FUNCTION get_activity_feed IS 'Gets the activity feed';
COMMENT ON FUNCTION toggle_activity_like IS 'Likes or unlikes an activity';
COMMENT ON FUNCTION add_activity_comment IS 'Adds a comment to an activity';
COMMENT ON FUNCTION get_activity_comments IS 'Gets comments for an activity';
