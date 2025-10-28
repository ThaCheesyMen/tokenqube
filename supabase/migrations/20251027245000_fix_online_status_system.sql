-- Fix Online Status System with Heartbeat
-- This migration adds proper online/offline detection

-- Add last_heartbeat column to track active connections
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS last_heartbeat TIMESTAMPTZ DEFAULT NOW();

-- Create index for quick online status queries
CREATE INDEX IF NOT EXISTS idx_profiles_last_heartbeat ON profiles(last_heartbeat);

-- Function to update user heartbeat
DROP FUNCTION IF EXISTS update_user_heartbeat(UUID);
CREATE OR REPLACE FUNCTION update_user_heartbeat(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE profiles
  SET 
    last_heartbeat = NOW(),
    status = 'online'
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to set user offline
DROP FUNCTION IF EXISTS set_user_offline(UUID);
CREATE OR REPLACE FUNCTION set_user_offline(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE profiles
  SET 
    status = 'offline',
    last_seen = NOW()
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get online friends (considers users online if heartbeat within last 2 minutes)
DROP FUNCTION IF EXISTS is_user_online(TIMESTAMPTZ);
CREATE OR REPLACE FUNCTION is_user_online(p_last_heartbeat TIMESTAMPTZ)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN p_last_heartbeat >= NOW() - INTERVAL '2 minutes';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Update existing RLS policies to allow heartbeat updates
DROP POLICY IF EXISTS "Users can update their own heartbeat" ON profiles;
CREATE POLICY "Users can update their own heartbeat"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

COMMENT ON COLUMN profiles.last_heartbeat IS 'Last time user sent a heartbeat (for online status detection)';
COMMENT ON FUNCTION update_user_heartbeat IS 'Updates user heartbeat to keep them marked as online';
COMMENT ON FUNCTION set_user_offline IS 'Sets user status to offline';

