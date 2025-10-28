-- ============================================================================
-- Enhanced Game Tracking - Database Setup
-- ============================================================================
-- This script enhances game tracking with:
--   - Currently playing status
--   - Join friend's game functionality
--   - Enhanced game data storage
--   - Activity tracking for gaming sessions
-- Run this in your Supabase SQL Editor.
-- ============================================================================

-- Add currently_playing column to profiles if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'currently_playing'
  ) THEN
    ALTER TABLE profiles ADD COLUMN currently_playing jsonb;
  END IF;
END $$;

-- Create game_sessions table for tracking active gaming sessions
CREATE TABLE IF NOT EXISTS game_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  game_id uuid REFERENCES user_games(id) ON DELETE CASCADE NOT NULL,
  started_at timestamptz DEFAULT NOW(),
  ended_at timestamptz,
  hours_played numeric(10,2) DEFAULT 0,
  is_active boolean DEFAULT true
);

-- Create join_game_requests table
CREATE TABLE IF NOT EXISTS join_game_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  to_user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  game_id uuid REFERENCES user_games(id) ON DELETE CASCADE,
  status text DEFAULT 'pending', -- 'pending', 'accepted', 'rejected', 'expired'
  message text,
  created_at timestamptz DEFAULT NOW(),
  expires_at timestamptz DEFAULT NOW() + INTERVAL '1 hour'
);

-- Create game_activity_logs table
CREATE TABLE IF NOT EXISTS game_activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  game_id uuid REFERENCES user_games(id) ON DELETE CASCADE NOT NULL,
  action text NOT NULL, -- 'started_playing', 'stopped_playing', 'achievement_unlocked', etc.
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_game_sessions_user ON game_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_game ON game_sessions(game_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_active ON game_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_join_game_requests_from ON join_game_requests(from_user_id);
CREATE INDEX IF NOT EXISTS idx_join_game_requests_to ON join_game_requests(to_user_id);
CREATE INDEX IF NOT EXISTS idx_join_game_requests_status ON join_game_requests(status);
CREATE INDEX IF NOT EXISTS idx_game_activity_user ON game_activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_game_activity_created ON game_activity_logs(created_at DESC);

-- Enable RLS
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE join_game_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_activity_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own sessions" ON game_sessions;
DROP POLICY IF EXISTS "Users can view friends' active sessions" ON game_sessions;
DROP POLICY IF EXISTS "Users can manage their own sessions" ON game_sessions;
DROP POLICY IF EXISTS "Users can view their game requests" ON join_game_requests;
DROP POLICY IF EXISTS "Users can create join requests" ON join_game_requests;
DROP POLICY IF EXISTS "Users can manage join requests" ON join_game_requests;
DROP POLICY IF EXISTS "Users can view their own activity" ON game_activity_logs;

-- Game sessions policies
CREATE POLICY "Users can view their own sessions"
  ON game_sessions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can view friends' active sessions"
  ON game_sessions FOR SELECT
  TO authenticated
  USING (
    is_active = true AND
    user_id IN (
      SELECT friend_id FROM friends 
      WHERE user_id = auth.uid() AND status = 'accepted'
    )
  );

CREATE POLICY "Users can manage their own sessions"
  ON game_sessions FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Join game requests policies
CREATE POLICY "Users can view their game requests"
  ON join_game_requests FOR SELECT
  TO authenticated
  USING (from_user_id = auth.uid() OR to_user_id = auth.uid());

CREATE POLICY "Users can create join requests"
  ON join_game_requests FOR INSERT
  TO authenticated
  WITH CHECK (from_user_id = auth.uid());

CREATE POLICY "Users can manage join requests"
  ON join_game_requests FOR UPDATE
  TO authenticated
  USING (to_user_id = auth.uid())
  WITH CHECK (to_user_id = auth.uid());

-- Game activity logs policies
CREATE POLICY "Users can view their own activity"
  ON game_activity_logs FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Function to start a game session
CREATE OR REPLACE FUNCTION start_game_session(
  p_game_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session_id uuid;
  v_user_id uuid;
  v_game_name text;
BEGIN
  v_user_id := auth.uid();
  
  -- Get game name
  SELECT game_name INTO v_game_name
  FROM user_games
  WHERE id = p_game_id;
  
  -- End any active sessions
  UPDATE game_sessions
  SET is_active = false, ended_at = NOW()
  WHERE user_id = v_user_id AND is_active = true;
  
  -- Update currently playing in profile
  UPDATE profiles
  SET currently_playing = jsonb_build_object(
    'game_id', p_game_id,
    'game_name', v_game_name,
    'started_at', NOW()
  )
  WHERE id = v_user_id;
  
  -- Create new session
  INSERT INTO game_sessions (user_id, game_id, is_active)
  VALUES (v_user_id, p_game_id, true)
  RETURNING id INTO v_session_id;
  
  -- Log activity
  INSERT INTO game_activity_logs (user_id, game_id, action)
  VALUES (v_user_id, p_game_id, 'started_playing');
  
  RETURN v_session_id;
END;
$$;

-- Function to end a game session
CREATE OR REPLACE FUNCTION end_game_session(
  p_session_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_game_id uuid;
  v_hours_played numeric;
BEGIN
  v_user_id := auth.uid();
  
  -- Get session details
  SELECT game_id, 
    EXTRACT(EPOCH FROM (NOW() - started_at)) / 3600
  INTO v_game_id, v_hours_played
  FROM game_sessions
  WHERE id = p_session_id AND user_id = v_user_id;
  
  IF v_game_id IS NULL THEN
    RAISE EXCEPTION 'Session not found';
  END IF;
  
  -- Update session
  UPDATE game_sessions
  SET 
    is_active = false,
    ended_at = NOW(),
    hours_played = v_hours_played
  WHERE id = p_session_id;
  
  -- Clear currently playing
  UPDATE profiles
  SET currently_playing = NULL
  WHERE id = v_user_id;
  
  -- Update total hours in user_games
  UPDATE user_games
  SET hours_played = hours_played + v_hours_played
  WHERE id = v_game_id;
  
  -- Log activity
  INSERT INTO game_activity_logs (user_id, game_id, action, details)
  VALUES (v_user_id, v_game_id, 'stopped_playing',
    jsonb_build_object('hours_played', v_hours_played));
END;
$$;

-- Function to create join game request
CREATE OR REPLACE FUNCTION create_join_game_request(
  p_to_user_id uuid,
  p_game_id uuid,
  p_message text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_request_id uuid;
  v_from_user_id uuid;
BEGIN
  v_from_user_id := auth.uid();
  
  -- Check if users are friends
  IF NOT EXISTS (
    SELECT 1 FROM friends
    WHERE (user_id = v_from_user_id AND friend_id = p_to_user_id)
       OR (user_id = p_to_user_id AND friend_id = v_from_user_id)
    AND status = 'accepted'
  ) THEN
    RAISE EXCEPTION 'Users must be friends to send join requests';
  END IF;
  
  -- Create request
  INSERT INTO join_game_requests (from_user_id, to_user_id, game_id, message)
  VALUES (v_from_user_id, p_to_user_id, p_game_id, p_message)
  RETURNING id INTO v_request_id;
  
  -- Create notification (if notifications table exists)
  BEGIN
    INSERT INTO notifications (user_id, type, title, message, link, data)
    SELECT 
      p_to_user_id,
      'party',
      'Join Game Request',
      (SELECT username FROM profiles WHERE id = v_from_user_id) || 
      ' wants to play with you',
      '/friends',
      jsonb_build_object(
        'from_user_id', v_from_user_id,
        'game_id', p_game_id,
        'request_id', v_request_id
      );
  EXCEPTION WHEN OTHERS THEN
    -- Notifications table might not exist, ignore
    NULL;
  END;
  
  RETURN v_request_id;
END;
$$;

-- Function to accept/reject join game request
CREATE OR REPLACE FUNCTION respond_to_join_request(
  p_request_id uuid,
  p_status text -- 'accepted' or 'rejected'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_request record;
BEGIN
  -- Get request
  SELECT * INTO v_request
  FROM join_game_requests
  WHERE id = p_request_id AND to_user_id = auth.uid() AND status = 'pending';
  
  IF v_request IS NULL THEN
    RAISE EXCEPTION 'Request not found or already processed';
  END IF;
  
  -- Update status
  UPDATE join_game_requests
  SET status = p_status
  WHERE id = p_request_id;
  
  -- If accepted, create notification for requester
  IF p_status = 'accepted' THEN
    BEGIN
      INSERT INTO notifications (user_id, type, title, message, link, data)
      SELECT 
        v_request.from_user_id,
        'party',
        'Join Request Accepted',
        (SELECT username FROM profiles WHERE id = auth.uid()) || 
        ' accepted your join request',
        '/friends',
        jsonb_build_object('to_user_id', auth.uid());
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;
END;
$$;

-- Function to get friends currently playing
CREATE OR REPLACE FUNCTION get_friends_playing()
RETURNS TABLE (
  user_id uuid,
  username text,
  currently_playing jsonb,
  user_games jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.username,
    p.currently_playing,
    jsonb_agg(
      jsonb_build_object(
        'id', ug.id,
        'game_name', ug.game_name,
        'platform', ug.platform,
        'hours_played', ug.hours_played
      )
    ) as user_games
  FROM profiles p
  INNER JOIN friends f ON (
    (f.user_id = auth.uid() AND f.friend_id = p.id) OR
    (f.friend_id = auth.uid() AND f.user_id = p.id)
  )
  LEFT JOIN user_games ug ON ug.user_id = p.id
  WHERE f.status = 'accepted'
    AND p.currently_playing IS NOT NULL
  GROUP BY p.id, p.username, p.currently_playing;
END;
$$;

-- Function to expire old join requests
CREATE OR REPLACE FUNCTION expire_old_join_requests()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE join_game_requests
  SET status = 'expired'
  WHERE status = 'pending' 
    AND expires_at < NOW();
END;
$$;

-- Trigger to auto-end sessions when user goes offline
CREATE OR REPLACE FUNCTION auto_end_game_sessions()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- If user's status changed to offline
  IF NEW.status = 'offline' AND OLD.status != 'offline' THEN
    -- End all active sessions
    UPDATE game_sessions
    SET 
      is_active = false,
      ended_at = NOW()
    WHERE user_id = NEW.id AND is_active = true;
    
    -- Clear currently playing
    NEW.currently_playing := NULL;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auto_end_sessions_on_offline ON profiles;

CREATE TRIGGER auto_end_sessions_on_offline
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  WHEN (NEW.status IS DISTINCT FROM OLD.status)
  EXECUTE FUNCTION auto_end_game_sessions();

-- Function to get user's gaming statistics
CREATE OR REPLACE FUNCTION get_gaming_stats(p_user_id uuid)
RETURNS TABLE (
  total_games integer,
  total_hours numeric,
  most_played_game text,
  currently_playing jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(DISTINCT ug.id)::integer as total_games,
    COALESCE(SUM(ug.hours_played), 0) as total_hours,
    (SELECT game_name FROM user_games 
     WHERE user_id = p_user_id 
     ORDER BY hours_played DESC LIMIT 1) as most_played_game,
    p.currently_playing
  FROM profiles p
  LEFT JOIN user_games ug ON ug.user_id = p.id
  WHERE p.id = p_user_id
  GROUP BY p.id, p.currently_playing;
END;
$$;

COMMENT ON TABLE game_sessions IS 'Tracks active gaming sessions';
COMMENT ON TABLE join_game_requests IS 'Join game requests between friends';
COMMENT ON TABLE game_activity_logs IS 'Activity logs for gaming events';
COMMENT ON FUNCTION start_game_session IS 'Starts a new game session';
COMMENT ON FUNCTION end_game_session IS 'Ends a game session and updates hours';
COMMENT ON FUNCTION create_join_game_request IS 'Creates a join game request to a friend';
COMMENT ON FUNCTION respond_to_join_request IS 'Accepts or rejects a join game request';
COMMENT ON FUNCTION get_friends_playing IS 'Gets all friends currently playing games';
COMMENT ON FUNCTION get_gaming_stats IS 'Gets comprehensive gaming statistics for a user';
