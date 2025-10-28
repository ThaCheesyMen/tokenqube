-- ============================================================================
-- COMPLETE SETUP: Profile Enhancements + Achievement System
-- Run this in Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- PART 1: PROFILE ENHANCEMENTS
-- ============================================================================

-- Add profile customization columns
DO $$ 
BEGIN
  -- Add columns if they don't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'bio') THEN
    ALTER TABLE profiles ADD COLUMN bio TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'custom_status') THEN
    ALTER TABLE profiles ADD COLUMN custom_status TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'status_emoji') THEN
    ALTER TABLE profiles ADD COLUMN status_emoji TEXT DEFAULT '😎';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'status') THEN
    ALTER TABLE profiles ADD COLUMN status TEXT DEFAULT 'online';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'avatar_url') THEN
    ALTER TABLE profiles ADD COLUMN avatar_url TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'banner_url') THEN
    ALTER TABLE profiles ADD COLUMN banner_url TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'accent_color') THEN
    ALTER TABLE profiles ADD COLUMN accent_color TEXT DEFAULT '#5865F2';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'profile_theme') THEN
    ALTER TABLE profiles ADD COLUMN profile_theme TEXT DEFAULT 'default';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'profile_visibility') THEN
    ALTER TABLE profiles ADD COLUMN profile_visibility TEXT DEFAULT 'public';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'show_email') THEN
    ALTER TABLE profiles ADD COLUMN show_email BOOLEAN DEFAULT FALSE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'show_games') THEN
    ALTER TABLE profiles ADD COLUMN show_games BOOLEAN DEFAULT TRUE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'show_activity') THEN
    ALTER TABLE profiles ADD COLUMN show_activity BOOLEAN DEFAULT TRUE;
  END IF;
END $$;

-- Update any invalid values
UPDATE profiles SET status = 'online' WHERE status IS NULL OR status NOT IN ('online', 'idle', 'dnd', 'invisible');
UPDATE profiles SET profile_visibility = 'public' WHERE profile_visibility IS NULL OR profile_visibility NOT IN ('public', 'friends', 'private');
UPDATE profiles SET profile_theme = 'default' WHERE profile_theme IS NULL OR profile_theme NOT IN ('default', 'gradient', 'dark', 'custom');

-- Create storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-images', 'profile-images', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- PART 2: ACHIEVEMENT SYSTEM
-- ============================================================================

-- Drop existing tables if they exist (clean slate)
DROP TABLE IF EXISTS achievement_unlocks CASCADE;
DROP TABLE IF EXISTS user_achievements CASCADE;
DROP TABLE IF EXISTS steam_achievements CASCADE;

-- Table for storing Steam achievements metadata
CREATE TABLE steam_achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id TEXT NOT NULL,
  achievement_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  icon_url TEXT,
  icon_gray_url TEXT,
  hidden BOOLEAN DEFAULT FALSE,
  global_percentage DECIMAL(5, 2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(game_id, achievement_id)
);

-- Table for tracking user achievement progress
CREATE TABLE user_achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  game_id TEXT NOT NULL,
  achievement_id TEXT NOT NULL,
  achievement_name TEXT NOT NULL,
  achievement_description TEXT,
  icon_url TEXT,
  unlocked BOOLEAN DEFAULT FALSE,
  unlock_time TIMESTAMPTZ,
  tokens_awarded INTEGER DEFAULT 0,
  rarity_tier TEXT DEFAULT 'common',
  global_percentage DECIMAL(5, 2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, game_id, achievement_id)
);

-- Table for achievement unlock history
CREATE TABLE achievement_unlocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  game_id TEXT NOT NULL,
  game_name TEXT NOT NULL,
  achievement_id TEXT NOT NULL,
  achievement_name TEXT NOT NULL,
  achievement_description TEXT,
  icon_url TEXT,
  tokens_earned INTEGER NOT NULL,
  rarity_tier TEXT NOT NULL,
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  notified BOOLEAN DEFAULT FALSE
);

-- Indexes
CREATE INDEX idx_steam_achievements_game ON steam_achievements(game_id);
CREATE INDEX idx_user_achievements_user ON user_achievements(user_id);
CREATE INDEX idx_user_achievements_game ON user_achievements(user_id, game_id);
CREATE INDEX idx_user_achievements_unlocked ON user_achievements(user_id, unlocked);
CREATE INDEX idx_achievement_unlocks_user ON achievement_unlocks(user_id, unlocked_at DESC);
CREATE INDEX idx_achievement_unlocks_notified ON achievement_unlocks(user_id, notified) WHERE notified = FALSE;

-- Enable RLS
ALTER TABLE steam_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievement_unlocks ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view steam achievements"
ON steam_achievements FOR SELECT
USING (true);

CREATE POLICY "Users can view own achievements"
ON user_achievements FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Service can manage achievements"
ON user_achievements FOR ALL
USING (auth.role() = 'service_role');

CREATE POLICY "Users can view own unlocks"
ON achievement_unlocks FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Service can manage unlocks"
ON achievement_unlocks FOR ALL
USING (auth.role() = 'service_role');

-- Function to calculate token reward based on rarity
CREATE OR REPLACE FUNCTION calculate_achievement_tokens(p_global_percentage DECIMAL)
RETURNS TABLE(tokens INTEGER, rarity TEXT)
LANGUAGE plpgsql
AS $$
BEGIN
  IF p_global_percentage IS NULL OR p_global_percentage <= 0 THEN
    RETURN QUERY SELECT 10 as tokens, 'common'::TEXT as rarity;
  ELSIF p_global_percentage < 5 THEN
    RETURN QUERY SELECT 100 as tokens, 'legendary'::TEXT as rarity;
  ELSIF p_global_percentage < 20 THEN
    RETURN QUERY SELECT 50 as tokens, 'epic'::TEXT as rarity;
  ELSIF p_global_percentage < 50 THEN
    RETURN QUERY SELECT 25 as tokens, 'rare'::TEXT as rarity;
  ELSE
    RETURN QUERY SELECT 10 as tokens, 'common'::TEXT as rarity;
  END IF;
END;
$$;

-- Function to process achievement unlock and award tokens
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
    icon_url, unlocked, unlock_time, tokens_awarded, rarity_tier
  )
  VALUES (
    p_user_id, p_game_id, p_achievement_id, p_achievement_name, p_achievement_description,
    p_icon_url, TRUE, p_unlock_time, v_tokens, v_rarity
  )
  ON CONFLICT (user_id, game_id, achievement_id)
  DO UPDATE SET
    unlocked = TRUE,
    unlock_time = p_unlock_time,
    tokens_awarded = v_tokens,
    rarity_tier = v_rarity,
    updated_at = NOW();

  -- Award tokens
  UPDATE profiles SET total_tokens = total_tokens + v_tokens WHERE id = p_user_id;

  -- Create unlock record
  INSERT INTO achievement_unlocks (
    user_id, game_id, game_name, achievement_id, achievement_name,
    achievement_description, icon_url, tokens_earned, rarity_tier, unlocked_at
  )
  VALUES (
    p_user_id, p_game_id, p_game_name, p_achievement_id, p_achievement_name,
    p_achievement_description, p_icon_url, v_tokens, v_rarity, p_unlock_time
  );

  RETURN QUERY SELECT v_tokens, v_rarity, TRUE;
END;
$$;

-- Function to get user achievement stats
CREATE OR REPLACE FUNCTION get_user_achievement_stats(p_user_id UUID)
RETURNS TABLE(
  total_achievements INTEGER,
  unlocked_achievements INTEGER,
  total_tokens_from_achievements BIGINT,
  legendary_count INTEGER,
  epic_count INTEGER,
  rare_count INTEGER,
  common_count INTEGER,
  completion_percentage DECIMAL
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::INTEGER as total_achievements,
    COUNT(*) FILTER (WHERE unlocked = TRUE)::INTEGER as unlocked_achievements,
    COALESCE(SUM(tokens_awarded) FILTER (WHERE unlocked = TRUE), 0)::BIGINT as total_tokens_from_achievements,
    COUNT(*) FILTER (WHERE unlocked = TRUE AND rarity_tier = 'legendary')::INTEGER as legendary_count,
    COUNT(*) FILTER (WHERE unlocked = TRUE AND rarity_tier = 'epic')::INTEGER as epic_count,
    COUNT(*) FILTER (WHERE unlocked = TRUE AND rarity_tier = 'rare')::INTEGER as rare_count,
    COUNT(*) FILTER (WHERE unlocked = TRUE AND rarity_tier = 'common')::INTEGER as common_count,
    CASE 
      WHEN COUNT(*) > 0 THEN ROUND((COUNT(*) FILTER (WHERE unlocked = TRUE)::DECIMAL / COUNT(*)::DECIMAL) * 100, 2)
      ELSE 0
    END as completion_percentage
  FROM user_achievements
  WHERE user_id = p_user_id;
END;
$$;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Show created tables
SELECT 
  'Tables Created:' as status,
  COUNT(*) as count
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('steam_achievements', 'user_achievements', 'achievement_unlocks');

-- Show profile columns
SELECT 
  'Profile Columns Added:' as status,
  COUNT(*) as count
FROM information_schema.columns
WHERE table_name = 'profiles'
AND column_name IN ('bio', 'custom_status', 'status', 'avatar_url', 'banner_url');

SELECT '✅ Setup Complete!' as message;

