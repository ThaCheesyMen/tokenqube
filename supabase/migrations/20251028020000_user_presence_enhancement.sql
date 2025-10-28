-- User Presence Enhancement System
-- Custom status, emoji, auto-away, rich presence

-- Add custom status fields to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS custom_status TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS status_emoji TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS status_expires_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS rich_presence JSONB DEFAULT '{}'::jsonb;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS platform TEXT DEFAULT 'web' CHECK (platform IN ('web', 'desktop', 'mobile'));

-- Create presence history table
CREATE TABLE IF NOT EXISTS presence_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL,
  custom_status TEXT,
  platform TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER
);

-- Enable RLS
ALTER TABLE presence_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "presence_history_select" ON presence_history FOR SELECT USING (
  user_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM friends 
    WHERE ((user_id = auth.uid() AND friend_id = presence_history.user_id) OR 
           (friend_id = auth.uid() AND user_id = presence_history.user_id))
    AND status = 'accepted'
  )
);

CREATE POLICY "presence_history_insert" ON presence_history FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "presence_history_update" ON presence_history FOR UPDATE USING (auth.uid() = user_id);

-- Function to update rich presence
CREATE OR REPLACE FUNCTION update_rich_presence(
  p_user_id UUID,
  p_game_name TEXT DEFAULT NULL,
  p_game_details TEXT DEFAULT NULL,
  p_party_id UUID DEFAULT NULL,
  p_party_size INTEGER DEFAULT NULL,
  p_party_max INTEGER DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  v_presence JSONB;
BEGIN
  v_presence := jsonb_build_object(
    'game_name', p_game_name,
    'game_details', p_game_details,
    'party_id', p_party_id,
    'party_size', p_party_size,
    'party_max', p_party_max,
    'updated_at', NOW()
  );

  UPDATE profiles
  SET rich_presence = v_presence,
      currently_playing = p_game_name
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to set custom status
CREATE OR REPLACE FUNCTION set_custom_status(
  p_user_id UUID,
  p_custom_status TEXT,
  p_status_emoji TEXT DEFAULT NULL,
  p_expires_minutes INTEGER DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  v_expires_at TIMESTAMPTZ;
BEGIN
  IF p_expires_minutes IS NOT NULL THEN
    v_expires_at := NOW() + (p_expires_minutes || ' minutes')::INTERVAL;
  END IF;

  UPDATE profiles
  SET custom_status = p_custom_status,
      status_emoji = p_status_emoji,
      status_expires_at = v_expires_at
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clear expired statuses
CREATE OR REPLACE FUNCTION clear_expired_statuses()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE profiles
  SET custom_status = NULL,
      status_emoji = NULL,
      status_expires_at = NULL
  WHERE status_expires_at IS NOT NULL
  AND status_expires_at < NOW();
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to auto-set away status
CREATE OR REPLACE FUNCTION auto_set_away_status()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE profiles
  SET status = 'idle'
  WHERE status = 'online'
  AND last_heartbeat < NOW() - INTERVAL '5 minutes'
  AND last_heartbeat >= NOW() - INTERVAL '15 minutes';
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to track presence changes
CREATE OR REPLACE FUNCTION track_presence_change()
RETURNS TRIGGER AS $$
BEGIN
  -- End previous presence session
  UPDATE presence_history
  SET ended_at = NOW(),
      duration_seconds = EXTRACT(EPOCH FROM (NOW() - started_at))::INTEGER
  WHERE user_id = NEW.id
  AND ended_at IS NULL;

  -- Start new presence session
  INSERT INTO presence_history (
    user_id,
    status,
    custom_status,
    platform,
    started_at
  ) VALUES (
    NEW.id,
    NEW.status,
    NEW.custom_status,
    NEW.platform,
    NOW()
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for presence tracking
DROP TRIGGER IF EXISTS track_presence_trigger ON profiles;
CREATE TRIGGER track_presence_trigger
  AFTER UPDATE OF status ON profiles
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION track_presence_change();

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_profiles_status ON profiles(status);
CREATE INDEX IF NOT EXISTS idx_profiles_last_heartbeat ON profiles(last_heartbeat);
CREATE INDEX IF NOT EXISTS idx_profiles_platform ON profiles(platform);
CREATE INDEX IF NOT EXISTS idx_presence_history_user_date ON presence_history(user_id, started_at DESC);

-- Add sample custom status presets
CREATE TABLE IF NOT EXISTS status_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL,
  emoji TEXT NOT NULL,
  duration_minutes INTEGER,
  category TEXT DEFAULT 'general',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert status presets
INSERT INTO status_presets (label, emoji, duration_minutes, category) VALUES
  ('Gaming', '🎮', NULL, 'activity'),
  ('AFK', '💤', 30, 'availability'),
  ('In a Meeting', '📞', 60, 'availability'),
  ('Studying', '📚', 120, 'activity'),
  ('Be Right Back', '⏰', 15, 'availability'),
  ('Do Not Disturb', '🔴', NULL, 'availability'),
  ('Streaming', '🎥', NULL, 'activity'),
  ('Eating', '🍕', 30, 'activity'),
  ('Working Out', '💪', 60, 'activity'),
  ('Sleeping', '😴', 480, 'availability');

-- Enable RLS
ALTER TABLE status_presets ENABLE ROW LEVEL SECURITY;

-- RLS Policy (read-only for all users)
CREATE POLICY "status_presets_select" ON status_presets FOR SELECT USING (true);

-- Enable realtime for profiles (for status updates) - if not already added
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'profiles'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
  END IF;
END $$;

COMMENT ON TABLE presence_history IS 'Track user presence changes over time for analytics';
COMMENT ON TABLE status_presets IS 'Predefined custom status templates';
COMMENT ON FUNCTION update_rich_presence IS 'Update user rich presence with game and party info';
COMMENT ON FUNCTION set_custom_status IS 'Set custom status message with emoji and expiry';

