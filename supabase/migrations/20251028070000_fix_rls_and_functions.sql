-- Fix RLS policies and missing functions
-- This migration fixes the 400/406 errors in the application

-- =====================================================
-- 1. FIX GAMING_ACTIVITY RLS POLICIES
-- =====================================================

-- Drop overly restrictive policies
DROP POLICY IF EXISTS "Users can view own gaming activity" ON gaming_activity;
DROP POLICY IF EXISTS "Service role can view all gaming activity" ON gaming_activity;
DROP POLICY IF EXISTS "Users can insert own gaming activity" ON gaming_activity;
DROP POLICY IF EXISTS "Service role can insert gaming activity" ON gaming_activity;
DROP POLICY IF EXISTS "Users can update own gaming activity" ON gaming_activity;

-- Create more permissive policies
CREATE POLICY "Users can view own gaming activity"
  ON gaming_activity FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can view all gaming activity"
  ON gaming_activity FOR SELECT
  USING (auth.role() = 'service_role');

CREATE POLICY "Users can insert own gaming activity"
  ON gaming_activity FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can insert gaming activity"
  ON gaming_activity FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Users can update own gaming activity"
  ON gaming_activity FOR UPDATE
  USING (auth.uid() = user_id);

-- =====================================================
-- 2. CREATE/FIX RPC FUNCTIONS
-- Note: Run 20251028069900_drop_duplicate_functions.sql FIRST!
-- =====================================================

-- Create set_user_offline function
CREATE OR REPLACE FUNCTION set_user_offline(p_user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE profiles
  SET 
    status = 'offline',
    last_seen = NOW(),
    currently_playing = NULL,
    currently_playing_platform = NULL,
    currently_playing_since = NULL,
    game_started_at = NULL
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create update_user_heartbeat function
CREATE OR REPLACE FUNCTION update_user_heartbeat(p_user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE profiles
  SET 
    last_heartbeat = NOW(),
    last_seen = NOW(),
    status = COALESCE(status, 'online')
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create increment_party_size function
CREATE OR REPLACE FUNCTION increment_party_size(p_party_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE parties
  SET 
    current_size = current_size + 1,
    updated_at = NOW()
  WHERE id = p_party_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create decrement_party_size function
CREATE OR REPLACE FUNCTION decrement_party_size(p_party_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE parties
  SET 
    current_size = GREATEST(current_size - 1, 0),
    updated_at = NOW()
  WHERE id = p_party_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create update_currently_playing function
CREATE OR REPLACE FUNCTION update_currently_playing(
  p_user_id UUID,
  p_game_name TEXT,
  p_platform TEXT
)
RETURNS void AS $$
BEGIN
  UPDATE profiles
  SET 
    currently_playing = p_game_name,
    currently_playing_platform = p_platform,
    currently_playing_since = NOW(),
    game_started_at = NOW(),
    status = 'online'
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create clear_currently_playing function
CREATE OR REPLACE FUNCTION clear_currently_playing(p_user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE profiles
  SET 
    currently_playing = NULL,
    currently_playing_platform = NULL,
    currently_playing_since = NULL,
    game_started_at = NULL
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create add_tokens function
CREATE OR REPLACE FUNCTION add_tokens(
  p_user_id UUID,
  p_amount INTEGER,
  p_source TEXT
)
RETURNS void AS $$
BEGIN
  -- Update user balance
  UPDATE profiles
  SET 
    token_balance = token_balance + p_amount,
    total_earned = total_earned + p_amount
  WHERE id = p_user_id;

  -- Log transaction
  INSERT INTO token_transactions (user_id, amount, type, description)
  VALUES (p_user_id, p_amount, 'earn', p_source);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create update_playtime function
CREATE OR REPLACE FUNCTION update_playtime(
  p_user_id UUID,
  p_game_name TEXT,
  p_hours_to_add NUMERIC,
  p_platform TEXT
)
RETURNS void AS $$
DECLARE
  v_game_id UUID;
BEGIN
  -- Find or create the game entry
  SELECT id INTO v_game_id
  FROM user_games
  WHERE user_id = p_user_id 
    AND game_name = p_game_name 
    AND platform = p_platform
  LIMIT 1;

  IF v_game_id IS NULL THEN
    -- Create new entry
    INSERT INTO user_games (
      user_id, 
      game_name, 
      game_id,
      platform, 
      hours_played,
      total_playtime,
      last_played_at,
      gaming_account_id
    )
    SELECT 
      p_user_id,
      p_game_name,
      p_game_name, -- Use game_name as game_id if not available
      p_platform,
      p_hours_to_add,
      (p_hours_to_add * 60)::INTEGER, -- Convert to minutes
      NOW(),
      ga.id
    FROM gaming_accounts ga
    WHERE ga.user_id = p_user_id 
      AND ga.platform = p_platform
    LIMIT 1;
  ELSE
    -- Update existing entry
    UPDATE user_games
    SET 
      hours_played = hours_played + p_hours_to_add,
      total_playtime = total_playtime + (p_hours_to_add * 60)::INTEGER,
      last_played_at = NOW()
    WHERE id = v_game_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create update_quest_progress function
CREATE OR REPLACE FUNCTION update_quest_progress(
  p_quest_id UUID,
  p_user_id UUID,
  p_progress_increment NUMERIC
)
RETURNS void AS $$
BEGIN
  INSERT INTO user_quest_progress (user_id, quest_id, current_progress)
  VALUES (p_user_id, p_quest_id, p_progress_increment)
  ON CONFLICT (user_id, quest_id)
  DO UPDATE SET
    current_progress = user_quest_progress.current_progress + p_progress_increment;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 3. FIX MISSING COLUMNS IN PROFILES
-- =====================================================

-- Add missing columns if they don't exist
DO $$ 
BEGIN
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS currently_playing_since TIMESTAMPTZ;
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS game_started_at TIMESTAMPTZ;
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS rich_presence JSONB DEFAULT '{}'::jsonb;
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS status_expires_at TIMESTAMPTZ;
EXCEPTION WHEN OTHERS THEN 
  RAISE NOTICE 'Some columns may already exist';
END $$;

-- =====================================================
-- 4. CREATE TRIGGER FOR PARTY SIZE AUTO-UPDATE
-- =====================================================

-- Function to auto-update party size when members join/leave
CREATE OR REPLACE FUNCTION update_party_size_trigger()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE parties 
    SET current_size = current_size + 1
    WHERE id = NEW.party_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE parties 
    SET current_size = GREATEST(current_size - 1, 0)
    WHERE id = OLD.party_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS party_size_trigger ON party_members;
CREATE TRIGGER party_size_trigger
  AFTER INSERT OR DELETE ON party_members
  FOR EACH ROW
  EXECUTE FUNCTION update_party_size_trigger();

-- =====================================================
-- 5. GRANT PERMISSIONS
-- =====================================================

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION set_user_offline TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_heartbeat TO authenticated;
GRANT EXECUTE ON FUNCTION increment_party_size TO authenticated;
GRANT EXECUTE ON FUNCTION decrement_party_size TO authenticated;
GRANT EXECUTE ON FUNCTION update_currently_playing TO authenticated;
GRANT EXECUTE ON FUNCTION clear_currently_playing TO authenticated;
GRANT EXECUTE ON FUNCTION add_tokens TO authenticated;
GRANT EXECUTE ON FUNCTION update_playtime TO authenticated;
GRANT EXECUTE ON FUNCTION update_quest_progress TO authenticated;

-- =====================================================
-- 6. CREATE INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_gaming_activity_user_date 
  ON gaming_activity(user_id, activity_date DESC);

CREATE INDEX IF NOT EXISTS idx_user_games_user_played 
  ON user_games(user_id, last_played_at DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_profiles_status 
  ON profiles(status) WHERE status != 'offline';

CREATE INDEX IF NOT EXISTS idx_profiles_currently_playing 
  ON profiles(currently_playing) WHERE currently_playing IS NOT NULL;

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Log completion
DO $$ 
BEGIN
  RAISE NOTICE 'Migration completed successfully!';
  RAISE NOTICE 'Fixed RLS policies for gaming_activity';
  RAISE NOTICE 'Created/updated RPC functions';
  RAISE NOTICE 'Added missing profile columns';
  RAISE NOTICE 'Created performance indexes';
END $$;

