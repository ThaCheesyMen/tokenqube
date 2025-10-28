-- Achievements System with Token Rewards

-- Table for storing Steam achievements metadata
CREATE TABLE IF NOT EXISTS steam_achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id TEXT NOT NULL,
  achievement_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  icon_url TEXT,
  icon_gray_url TEXT,
  hidden BOOLEAN DEFAULT FALSE,
  global_percentage DECIMAL(5, 2), -- % of players who unlocked it
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(game_id, achievement_id)
);

-- Table for tracking user achievement progress
CREATE TABLE IF NOT EXISTS user_achievements (
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
  rarity_tier TEXT DEFAULT 'common', -- common, rare, epic, legendary
  global_percentage DECIMAL(5, 2), -- % of players who unlocked it
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, game_id, achievement_id)
);

-- Table for achievement unlock history (for notifications)
CREATE TABLE IF NOT EXISTS achievement_unlocks (
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
CREATE INDEX IF NOT EXISTS idx_steam_achievements_game ON steam_achievements(game_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_game ON user_achievements(user_id, game_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_unlocked ON user_achievements(user_id, unlocked);
CREATE INDEX IF NOT EXISTS idx_achievement_unlocks_user ON achievement_unlocks(user_id, unlocked_at DESC);
CREATE INDEX IF NOT EXISTS idx_achievement_unlocks_notified ON achievement_unlocks(user_id, notified) WHERE notified = FALSE;

-- RLS Policies
ALTER TABLE steam_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievement_unlocks ENABLE ROW LEVEL SECURITY;

-- Anyone can view Steam achievements
CREATE POLICY "Anyone can view steam achievements"
ON steam_achievements FOR SELECT
USING (true);

-- Users can view their own achievements
CREATE POLICY "Users can view own achievements"
ON user_achievements FOR SELECT
USING (auth.uid() = user_id);

-- Service role can manage achievements
CREATE POLICY "Service can manage achievements"
ON user_achievements FOR ALL
USING (auth.role() = 'service_role');

-- Users can view their own unlock history
CREATE POLICY "Users can view own unlocks"
ON achievement_unlocks FOR SELECT
USING (auth.uid() = user_id);

-- Service role can manage unlocks
CREATE POLICY "Service can manage unlocks"
ON achievement_unlocks FOR ALL
USING (auth.role() = 'service_role');

-- Function to calculate token reward based on rarity
CREATE OR REPLACE FUNCTION calculate_achievement_tokens(p_global_percentage DECIMAL)
RETURNS TABLE(tokens INTEGER, rarity TEXT)
LANGUAGE plpgsql
AS $$
BEGIN
  -- Rarity-based token rewards
  -- Ultra Rare (0-5%): 100 tokens, legendary
  -- Rare (5-20%): 50 tokens, epic
  -- Uncommon (20-50%): 25 tokens, rare
  -- Common (50-100%): 10 tokens, common
  
  IF p_global_percentage IS NULL OR p_global_percentage <= 0 THEN
    -- Default for unknown achievements
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

-- Function to process new achievement unlocks and award tokens
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

  -- Calculate token reward based on rarity
  SELECT * INTO v_reward_result
  FROM calculate_achievement_tokens(p_global_percentage);
  
  v_tokens := v_reward_result.tokens;
  v_rarity := v_reward_result.rarity;

  -- Insert or update user achievement
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

  -- Award tokens to user
  UPDATE profiles
  SET total_tokens = total_tokens + v_tokens
  WHERE id = p_user_id;

  -- Create unlock notification record
  INSERT INTO achievement_unlocks (
    user_id, game_id, game_name, achievement_id, achievement_name,
    achievement_description, icon_url, tokens_earned, rarity_tier, unlocked_at
  )
  VALUES (
    p_user_id, p_game_id, p_game_name, p_achievement_id, p_achievement_name,
    p_achievement_description, p_icon_url, v_tokens, v_rarity, p_unlock_time
  );

  -- Return result
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

-- Function to get recent achievement unlocks
CREATE OR REPLACE FUNCTION get_recent_unlocks(p_user_id UUID, p_limit INTEGER DEFAULT 10)
RETURNS TABLE(
  id UUID,
  game_name TEXT,
  achievement_name TEXT,
  achievement_description TEXT,
  icon_url TEXT,
  tokens_earned INTEGER,
  rarity_tier TEXT,
  unlocked_at TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    au.id,
    au.game_name,
    au.achievement_name,
    au.achievement_description,
    au.icon_url,
    au.tokens_earned,
    au.rarity_tier,
    au.unlocked_at
  FROM achievement_unlocks au
  WHERE au.user_id = p_user_id
  ORDER BY au.unlocked_at DESC
  LIMIT p_limit;
END;
$$;

-- Function to get achievement progress for a game
CREATE OR REPLACE FUNCTION get_game_achievement_progress(p_user_id UUID, p_game_id TEXT)
RETURNS TABLE(
  achievement_id TEXT,
  achievement_name TEXT,
  achievement_description TEXT,
  icon_url TEXT,
  icon_gray_url TEXT,
  unlocked BOOLEAN,
  unlock_time TIMESTAMPTZ,
  tokens_awarded INTEGER,
  rarity_tier TEXT,
  global_percentage DECIMAL
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ua.achievement_id,
    ua.achievement_name,
    ua.achievement_description,
    ua.icon_url,
    sa.icon_gray_url,
    ua.unlocked,
    ua.unlock_time,
    ua.tokens_awarded,
    ua.rarity_tier,
    sa.global_percentage
  FROM user_achievements ua
  LEFT JOIN steam_achievements sa ON sa.game_id = ua.game_id AND sa.achievement_id = ua.achievement_id
  WHERE ua.user_id = p_user_id AND ua.game_id = p_game_id
  ORDER BY ua.unlocked DESC, ua.achievement_name;
END;
$$;

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_achievement_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_steam_achievements_timestamp
BEFORE UPDATE ON steam_achievements
FOR EACH ROW
EXECUTE FUNCTION update_achievement_timestamp();

CREATE TRIGGER update_user_achievements_timestamp
BEFORE UPDATE ON user_achievements
FOR EACH ROW
EXECUTE FUNCTION update_achievement_timestamp();

-- Comments
COMMENT ON TABLE steam_achievements IS 'Metadata for all Steam achievements';
COMMENT ON TABLE user_achievements IS 'Tracks user progress on achievements';
COMMENT ON TABLE achievement_unlocks IS 'History of achievement unlocks for notifications';
COMMENT ON FUNCTION process_achievement_unlock IS 'Processes achievement unlock and awards tokens';
COMMENT ON FUNCTION get_user_achievement_stats IS 'Returns achievement statistics for a user';

