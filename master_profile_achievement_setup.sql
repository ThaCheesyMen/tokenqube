-- ===================================
-- MASTER SETUP: Profile + Achievements
-- Run this if complete_setup.sql wasn't executed
-- ===================================

BEGIN;

-- ===================================
-- PART 1: Profile Enhancements
-- ===================================

-- Add new profile columns if they don't exist
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS custom_status TEXT,
  ADD COLUMN IF NOT EXISTS status_emoji TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'online',
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS banner_url TEXT,
  ADD COLUMN IF NOT EXISTS accent_color TEXT,
  ADD COLUMN IF NOT EXISTS profile_theme TEXT DEFAULT 'default',
  ADD COLUMN IF NOT EXISTS profile_visibility TEXT DEFAULT 'public',
  ADD COLUMN IF NOT EXISTS show_email BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS show_games BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS show_activity BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS total_tokens BIGINT DEFAULT 0;

-- Update existing rows to have valid defaults
UPDATE profiles SET status = 'online' WHERE status IS NULL OR status NOT IN ('online', 'idle', 'dnd', 'invisible');
UPDATE profiles SET profile_visibility = 'public' WHERE profile_visibility IS NULL OR profile_visibility NOT IN ('public', 'friends', 'private');
UPDATE profiles SET profile_theme = 'default' WHERE profile_theme IS NULL OR profile_theme NOT IN ('default', 'gradient', 'dark', 'custom');
UPDATE profiles SET total_tokens = 0 WHERE total_tokens IS NULL;

-- Add constraints (with IF NOT EXISTS safety)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'status_valid'
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT status_valid 
      CHECK (status IN ('online', 'idle', 'dnd', 'invisible'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profile_visibility_valid'
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT profile_visibility_valid 
      CHECK (profile_visibility IN ('public', 'friends', 'private'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profile_theme_valid'
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT profile_theme_valid 
      CHECK (profile_theme IN ('default', 'gradient', 'dark', 'custom'));
  END IF;
END $$;

-- ===================================
-- PART 2: Achievement Tables
-- ===================================

-- Create steam_achievements table
CREATE TABLE IF NOT EXISTS steam_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id TEXT NOT NULL,
  achievement_id TEXT NOT NULL,
  achievement_name TEXT NOT NULL,
  achievement_description TEXT,
  icon_url TEXT,
  icon_gray_url TEXT,
  hidden BOOLEAN DEFAULT FALSE,
  global_percentage DECIMAL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(game_id, achievement_id)
);

-- Create user_achievements table
CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  game_id TEXT NOT NULL,
  achievement_id TEXT NOT NULL,
  achievement_name TEXT NOT NULL,
  achievement_description TEXT,
  icon_url TEXT,
  unlocked BOOLEAN DEFAULT FALSE,
  unlock_time TIMESTAMPTZ,
  tokens_awarded INTEGER DEFAULT 0,
  rarity_tier TEXT,
  global_percentage DECIMAL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, game_id, achievement_id)
);

-- Create achievement_unlocks table (notification/history)
CREATE TABLE IF NOT EXISTS achievement_unlocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  game_id TEXT NOT NULL,
  game_name TEXT NOT NULL,
  achievement_id TEXT NOT NULL,
  achievement_name TEXT NOT NULL,
  achievement_description TEXT,
  icon_url TEXT,
  tokens_earned INTEGER NOT NULL,
  rarity_tier TEXT NOT NULL,
  unlocked_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add viewed column separately (in case table already exists)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'achievement_unlocks' AND column_name = 'viewed'
  ) THEN
    ALTER TABLE achievement_unlocks ADD COLUMN viewed BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_unlocked ON user_achievements(user_id, unlocked);
CREATE INDEX IF NOT EXISTS idx_user_achievements_game ON user_achievements(game_id);
CREATE INDEX IF NOT EXISTS idx_achievement_unlocks_user_viewed ON achievement_unlocks(user_id, viewed);
CREATE INDEX IF NOT EXISTS idx_achievement_unlocks_time ON achievement_unlocks(unlocked_at DESC);

-- ===================================
-- PART 3: Achievement Functions
-- ===================================

-- Function: Calculate achievement token rewards based on rarity
CREATE OR REPLACE FUNCTION calculate_achievement_tokens(p_global_percentage DECIMAL DEFAULT NULL)
RETURNS TABLE(tokens INTEGER, rarity TEXT)
LANGUAGE plpgsql
AS $$
BEGIN
  -- If no global percentage provided, default to common
  IF p_global_percentage IS NULL THEN
    RETURN QUERY SELECT 5, 'common'::TEXT;
    RETURN;
  END IF;

  -- Legendary: < 1% = 100 tokens
  IF p_global_percentage < 1.0 THEN
    RETURN QUERY SELECT 100, 'legendary'::TEXT;
  -- Epic: 1-5% = 50 tokens
  ELSIF p_global_percentage < 5.0 THEN
    RETURN QUERY SELECT 50, 'epic'::TEXT;
  -- Rare: 5-15% = 25 tokens
  ELSIF p_global_percentage < 15.0 THEN
    RETURN QUERY SELECT 25, 'rare'::TEXT;
  -- Uncommon: 15-40% = 10 tokens
  ELSIF p_global_percentage < 40.0 THEN
    RETURN QUERY SELECT 10, 'uncommon'::TEXT;
  -- Common: 40%+ = 5 tokens
  ELSE
    RETURN QUERY SELECT 5, 'common'::TEXT;
  END IF;
END;
$$;

-- Function: Process achievement unlock and award tokens
CREATE OR REPLACE FUNCTION process_achievement_unlock(
  p_user_id UUID,
  p_game_id TEXT,
  p_game_name TEXT,
  p_achievement_id TEXT,
  p_achievement_name TEXT,
  p_achievement_description TEXT,
  p_icon_url TEXT,
  p_unlock_time TIMESTAMPTZ,
  p_global_percentage DECIMAL DEFAULT NULL
)
RETURNS TABLE(tokens_earned INTEGER, rarity TEXT, is_new_unlock BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_already_unlocked BOOLEAN;
  v_tokens INTEGER;
  v_rarity TEXT;
  v_reward_result RECORD;
BEGIN
  -- Check if already unlocked (and exists in database)
  SELECT unlocked INTO v_already_unlocked
  FROM user_achievements
  WHERE user_id = p_user_id 
    AND game_id = p_game_id 
    AND achievement_id = p_achievement_id;

  -- If already unlocked (and exists), return early with no rewards
  IF v_already_unlocked IS NOT NULL AND v_already_unlocked = TRUE THEN
    RETURN QUERY SELECT 0, 'common'::TEXT, FALSE;
    RETURN;
  END IF;

  -- Calculate reward
  SELECT * INTO v_reward_result FROM calculate_achievement_tokens(p_global_percentage);
  v_tokens := v_reward_result.tokens;
  v_rarity := v_reward_result.rarity;

  -- Insert or update achievement
  INSERT INTO user_achievements (
    user_id, game_id, achievement_id, achievement_name, achievement_description,
    icon_url, unlocked, unlock_time, tokens_awarded, rarity_tier, global_percentage
  )
  VALUES (
    p_user_id, p_game_id, p_achievement_id, p_achievement_name, p_achievement_description,
    p_icon_url, TRUE, p_unlock_time, v_tokens, v_rarity, p_global_percentage
  )
  ON CONFLICT (user_id, game_id, achievement_id)
  DO UPDATE SET
    unlocked = TRUE,
    unlock_time = p_unlock_time,
    tokens_awarded = v_tokens,
    rarity_tier = v_rarity,
    global_percentage = p_global_percentage,
    updated_at = NOW();

  -- Award tokens to user profile
  UPDATE profiles
  SET token_balance = token_balance + v_tokens,
      total_earned = total_earned + v_tokens,
      total_tokens = total_tokens + v_tokens
  WHERE id = p_user_id;

  -- Create unlock notification record
  INSERT INTO achievement_unlocks (
    user_id, game_id, game_name, achievement_id, achievement_name,
    achievement_description, icon_url, tokens_earned, rarity_tier
  )
  VALUES (
    p_user_id, p_game_id, p_game_name, p_achievement_id, p_achievement_name,
    p_achievement_description, p_icon_url, v_tokens, v_rarity
  );

  -- Return the reward details
  RETURN QUERY SELECT v_tokens, v_rarity, TRUE;
END;
$$;

-- ===================================
-- PART 4: RLS Policies
-- ===================================

-- Enable RLS
ALTER TABLE steam_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievement_unlocks ENABLE ROW LEVEL SECURITY;

-- steam_achievements policies (read-only for users)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'steam_achievements' AND policyname = 'steam_achievements_select_all'
  ) THEN
    CREATE POLICY steam_achievements_select_all ON steam_achievements FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

-- user_achievements policies
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_achievements' AND policyname = 'user_achievements_select_own'
  ) THEN
    CREATE POLICY user_achievements_select_own ON user_achievements FOR SELECT TO authenticated 
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_achievements' AND policyname = 'user_achievements_insert_own'
  ) THEN
    CREATE POLICY user_achievements_insert_own ON user_achievements FOR INSERT TO authenticated 
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_achievements' AND policyname = 'user_achievements_update_own'
  ) THEN
    CREATE POLICY user_achievements_update_own ON user_achievements FOR UPDATE TO authenticated 
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- achievement_unlocks policies
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'achievement_unlocks' AND policyname = 'achievement_unlocks_select_own'
  ) THEN
    CREATE POLICY achievement_unlocks_select_own ON achievement_unlocks FOR SELECT TO authenticated 
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'achievement_unlocks' AND policyname = 'achievement_unlocks_update_own'
  ) THEN
    CREATE POLICY achievement_unlocks_update_own ON achievement_unlocks FOR UPDATE TO authenticated 
      USING (auth.uid() = user_id);
  END IF;
END $$;

COMMIT;

-- ===================================
-- Success Message
-- ===================================
DO $$
BEGIN
  RAISE NOTICE '✅ MASTER SETUP COMPLETE!';
  RAISE NOTICE '  - Profile columns added/updated';
  RAISE NOTICE '  - Achievement tables created';
  RAISE NOTICE '  - Achievement functions installed';
  RAISE NOTICE '  - RLS policies configured';
  RAISE NOTICE '';
  RAISE NOTICE '🎮 Next step: Sync your Steam games to populate achievements!';
END $$;

