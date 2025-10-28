-- =====================================================
-- CURRENTLY PLAYING STATUS (Discord-style)
-- =====================================================

-- Add currently_playing column to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS currently_playing TEXT,
ADD COLUMN IF NOT EXISTS currently_playing_platform TEXT,
ADD COLUMN IF NOT EXISTS game_started_at TIMESTAMPTZ;

-- Create index for quick lookups
CREATE INDEX IF NOT EXISTS idx_profiles_currently_playing ON profiles(currently_playing) WHERE currently_playing IS NOT NULL;

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS update_currently_playing(UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS update_currently_playing(UUID, TEXT);

-- Function to update currently playing status
CREATE OR REPLACE FUNCTION update_currently_playing(
  p_user_id UUID,
  p_game_name TEXT,
  p_platform TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  UPDATE profiles
  SET 
    currently_playing = p_game_name,
    currently_playing_platform = p_platform,
    game_started_at = CASE 
      WHEN currently_playing IS NULL OR currently_playing != p_game_name 
      THEN NOW() 
      ELSE game_started_at 
    END
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clear currently playing status
CREATE OR REPLACE FUNCTION clear_currently_playing(
  p_user_id UUID
)
RETURNS VOID AS $$
BEGIN
  UPDATE profiles
  SET 
    currently_playing = NULL,
    currently_playing_platform = NULL,
    game_started_at = NULL
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable realtime for profile changes
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;

COMMENT ON COLUMN profiles.currently_playing IS 'Game the user is currently playing';
COMMENT ON COLUMN profiles.currently_playing_platform IS 'Platform of the game (Steam, Epic, etc)';
COMMENT ON COLUMN profiles.game_started_at IS 'When the user started playing the current game';

