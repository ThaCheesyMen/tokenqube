-- ============================================================================
-- FIX PLAYTIME CALCULATION FOR GAMING ACCOUNTS
-- Updates total_playtime_hours to accurately reflect actual game hours
-- ============================================================================

-- Function to recalculate total playtime for a gaming account
CREATE OR REPLACE FUNCTION recalculate_account_playtime(p_account_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE gaming_accounts
  SET total_playtime_hours = (
    SELECT COALESCE(SUM(hours_played), 0)
    FROM user_games
    WHERE gaming_account_id = p_account_id
      AND hours_played > 0  -- Only count games with actual playtime
  )
  WHERE id = p_account_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically update total_playtime_hours when user_games changes
CREATE OR REPLACE FUNCTION update_gaming_account_playtime()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the gaming account's total playtime
  UPDATE gaming_accounts
  SET total_playtime_hours = (
    SELECT COALESCE(SUM(hours_played), 0)
    FROM user_games
    WHERE gaming_account_id = COALESCE(NEW.gaming_account_id, OLD.gaming_account_id)
      AND hours_played > 0
  )
  WHERE id = COALESCE(NEW.gaming_account_id, OLD.gaming_account_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_update_account_playtime ON user_games;

-- Create trigger
CREATE TRIGGER trigger_update_account_playtime
AFTER INSERT OR UPDATE OR DELETE ON user_games
FOR EACH ROW
EXECUTE FUNCTION update_gaming_account_playtime();

-- Recalculate all existing gaming accounts' playtime
DO $$
DECLARE
  account_record RECORD;
BEGIN
  FOR account_record IN SELECT id FROM gaming_accounts LOOP
    PERFORM recalculate_account_playtime(account_record.id);
  END LOOP;
END $$;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_user_games_account_hours 
ON user_games(gaming_account_id, hours_played DESC)
WHERE hours_played > 0;

COMMENT ON FUNCTION recalculate_account_playtime IS 'Recalculates total playtime for a gaming account based on actual game hours';
COMMENT ON FUNCTION update_gaming_account_playtime IS 'Trigger function to auto-update gaming account total playtime';

-- ============================================================================
-- ADD PROFILE ENHANCEMENTS
-- ============================================================================

-- Add profile view tracking
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profile_views INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_profile_view_at TIMESTAMPTZ;

-- Add currently playing tracking
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS currently_playing TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS currently_playing_since TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS currently_playing_game_id TEXT;

-- Add last played tracking to user_games
ALTER TABLE user_games ADD COLUMN IF NOT EXISTS last_played_at TIMESTAMPTZ;

-- Add profile badges
CREATE TABLE IF NOT EXISTS profile_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  badge_key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT NOT NULL,
  requirement JSONB NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES profile_badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  is_showcased BOOLEAN DEFAULT FALSE,
  UNIQUE(user_id, badge_id)
);

-- Add calling system tables
CREATE TABLE IF NOT EXISTS calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  caller_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  callee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  call_type TEXT NOT NULL CHECK (call_type IN ('voice', 'video')),
  status TEXT NOT NULL DEFAULT 'ringing' CHECK (status IN ('ringing', 'active', 'ended', 'missed', 'declined')),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  answered_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  party_id UUID REFERENCES parties(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_calls_caller ON calls(caller_id);
CREATE INDEX IF NOT EXISTS idx_calls_callee ON calls(callee_id);
CREATE INDEX IF NOT EXISTS idx_calls_status ON calls(status);
CREATE INDEX IF NOT EXISTS idx_calls_started ON calls(started_at DESC);

-- RLS for calls
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own calls" ON calls;
CREATE POLICY "Users can view own calls"
  ON calls FOR SELECT
  TO authenticated
  USING (caller_id = auth.uid() OR callee_id = auth.uid());

DROP POLICY IF EXISTS "Users can create calls" ON calls;
CREATE POLICY "Users can create calls"
  ON calls FOR INSERT
  TO authenticated
  WITH CHECK (caller_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own calls" ON calls;
CREATE POLICY "Users can update own calls"
  ON calls FOR UPDATE
  TO authenticated
  USING (caller_id = auth.uid() OR callee_id = auth.uid());

-- RLS for badges
ALTER TABLE profile_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view badges" ON profile_badges;
CREATE POLICY "Anyone can view badges"
  ON profile_badges FOR SELECT
  TO authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS "Users can view own badges" ON user_badges;
CREATE POLICY "Users can view own badges"
  ON user_badges FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own badges" ON user_badges;
CREATE POLICY "Users can update own badges"
  ON user_badges FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Seed profile badges
INSERT INTO profile_badges (badge_key, name, description, icon, requirement)
VALUES
  ('early_adopter', 'Early Adopter', 'Joined in the first month', '⭐', '{"joined_before": "2025-11-01"}'::jsonb),
  ('no_life_gamer', 'No-Life Gamer', 'Played over 1000 hours', '🎮', '{"total_playtime": 1000}'::jsonb),
  ('token_millionaire', 'Token Millionaire', 'Earned over 1 million tokens', '💰', '{"total_earned": 1000000}'::jsonb),
  ('social_butterfly', 'Social Butterfly', 'Referred 10+ friends', '🦋', '{"referrals": 10}'::jsonb),
  ('achievement_hunter', 'Achievement Hunter', 'Unlocked 50+ achievements', '🏆', '{"achievements": 50}'::jsonb),
  ('party_starter', 'Party Starter', 'Created 100+ parties', '🎉', '{"parties_created": 100}'::jsonb),
  ('marketplace_master', 'Marketplace Master', 'Completed 500+ trades', '🛒', '{"trades": 500}'::jsonb),
  ('quest_master', 'Quest Master', 'Completed 100+ quests', '⚔️', '{"quests_completed": 100}'::jsonb),
  ('voice_champion', 'Voice Champion', 'Spent 100+ hours in voice chat', '🎙️', '{"voice_hours": 100}'::jsonb),
  ('premium_member', 'Premium Member', 'Active premium subscription', '👑', '{"has_premium": true}'::jsonb)
ON CONFLICT (badge_key) DO NOTHING;

-- Function to increment profile views
CREATE OR REPLACE FUNCTION increment_profile_view(p_profile_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE profiles
  SET profile_views = profile_views + 1,
      last_profile_view_at = NOW()
  WHERE id = p_profile_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update currently playing
CREATE OR REPLACE FUNCTION update_currently_playing(
  p_user_id UUID,
  p_game_name TEXT,
  p_game_id TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  UPDATE profiles
  SET currently_playing = p_game_name,
      currently_playing_since = NOW(),
      currently_playing_game_id = p_game_id
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clear currently playing
CREATE OR REPLACE FUNCTION clear_currently_playing(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE profiles
  SET currently_playing = NULL,
      currently_playing_since = NULL,
      currently_playing_game_id = NULL
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to initiate a call
CREATE OR REPLACE FUNCTION initiate_call(
  p_callee_id UUID,
  p_call_type TEXT
)
RETURNS UUID AS $$
DECLARE
  v_call_id UUID;
BEGIN
  INSERT INTO calls (caller_id, callee_id, call_type, status)
  VALUES (auth.uid(), p_callee_id, p_call_type, 'ringing')
  RETURNING id INTO v_call_id;
  
  -- Create notification for callee
  INSERT INTO notifications (user_id, title, message, type, data)
  VALUES (
    p_callee_id,
    'Incoming Call',
    (SELECT username FROM profiles WHERE id = auth.uid()) || ' is calling you',
    'system',
    jsonb_build_object('call_id', v_call_id, 'call_type', p_call_type, 'caller_id', auth.uid())
  );
  
  RETURN v_call_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to answer a call
CREATE OR REPLACE FUNCTION answer_call(p_call_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE calls
  SET status = 'active',
      answered_at = NOW()
  WHERE id = p_call_id
    AND callee_id = auth.uid()
    AND status = 'ringing';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to end a call
CREATE OR REPLACE FUNCTION end_call(p_call_id UUID)
RETURNS VOID AS $$
DECLARE
  v_started_at TIMESTAMPTZ;
  v_answered_at TIMESTAMPTZ;
BEGIN
  SELECT started_at, answered_at INTO v_started_at, v_answered_at
  FROM calls
  WHERE id = p_call_id
    AND (caller_id = auth.uid() OR callee_id = auth.uid());
  
  UPDATE calls
  SET status = CASE
        WHEN answered_at IS NULL THEN 
          CASE WHEN caller_id = auth.uid() THEN 'ended' ELSE 'missed' END
        ELSE 'ended'
      END,
      ended_at = NOW(),
      duration_seconds = CASE
        WHEN v_answered_at IS NOT NULL THEN
          EXTRACT(EPOCH FROM (NOW() - v_answered_at))::INTEGER
        ELSE 0
      END
  WHERE id = p_call_id
    AND (caller_id = auth.uid() OR callee_id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to decline a call
CREATE OR REPLACE FUNCTION decline_call(p_call_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE calls
  SET status = 'declined',
      ended_at = NOW()
  WHERE id = p_call_id
    AND callee_id = auth.uid()
    AND status = 'ringing';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

