-- ================================================================
-- SIMPLE, CLEAN FIX - No syntax errors
-- Copy and paste this ENTIRE file into Supabase SQL Editor and click RUN
-- ================================================================

-- Step 1: Add missing columns
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS login_streak INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_daily_login TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_earned INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_spent INTEGER DEFAULT 0;

-- Step 2: Create daily_login_rewards table if missing
CREATE TABLE IF NOT EXISTS daily_login_rewards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  streak_count INTEGER NOT NULL DEFAULT 1,
  tokens_earned INTEGER NOT NULL,
  login_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, login_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_login_rewards_user_date 
ON daily_login_rewards(user_id, login_date DESC);

ALTER TABLE daily_login_rewards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own login rewards" ON daily_login_rewards;
CREATE POLICY "Users can view own login rewards"
ON daily_login_rewards FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can insert login rewards" ON daily_login_rewards;
CREATE POLICY "System can insert login rewards"
ON daily_login_rewards FOR INSERT
WITH CHECK (true);

-- Step 3: Fix add_tokens function
DROP FUNCTION IF EXISTS add_tokens(UUID, INTEGER, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS add_tokens(UUID, INTEGER, TEXT) CASCADE;
DROP FUNCTION IF EXISTS add_tokens(UUID, INTEGER) CASCADE;

CREATE FUNCTION add_tokens(
  p_user_id UUID,
  p_amount INTEGER,
  p_source TEXT DEFAULT 'playtime',
  p_description TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  v_category TEXT;
  v_description TEXT;
BEGIN
  v_category := CASE p_source
    WHEN 'playtime' THEN 'playtime'
    WHEN 'gaming_session' THEN 'playtime'
    WHEN 'daily_login' THEN 'reward'
    WHEN 'quest' THEN 'quest'
    WHEN 'achievement' THEN 'reward'
    WHEN 'referral' THEN 'referral'
    WHEN 'leaderboard' THEN 'reward'
    ELSE 'other'
  END;

  v_description := COALESCE(
    p_description,
    CASE p_source
      WHEN 'playtime' THEN 'Earned from gaming session'
      WHEN 'gaming_session' THEN 'Earned from gaming session'
      WHEN 'daily_login' THEN 'Daily login reward'
      WHEN 'quest' THEN 'Quest completion reward'
      WHEN 'achievement' THEN 'Achievement unlocked'
      WHEN 'referral' THEN 'Friend referral bonus'
      WHEN 'leaderboard' THEN 'Leaderboard reward'
      ELSE 'Token reward'
    END
  );

  UPDATE profiles
  SET 
    token_balance = token_balance + p_amount,
    total_earned = COALESCE(total_earned, 0) + p_amount,
    updated_at = NOW()
  WHERE id = p_user_id;

  INSERT INTO token_transactions (
    user_id,
    amount,
    type,
    category,
    source,
    description,
    created_at
  ) VALUES (
    p_user_id,
    p_amount,
    'earn',
    v_category,
    p_source,
    v_description,
    NOW()
  );

  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION add_tokens(UUID, INTEGER, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION add_tokens(UUID, INTEGER, TEXT, TEXT) TO anon;

-- Step 4: Fix check_daily_login function
DROP FUNCTION IF EXISTS check_daily_login(UUID) CASCADE;

CREATE FUNCTION check_daily_login(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  v_last_login DATE;
  v_current_streak INTEGER := 0;
  v_tokens_reward INTEGER := 50;
BEGIN
  SELECT 
    last_daily_login::DATE,
    COALESCE(login_streak, 0)
  INTO v_last_login, v_current_streak
  FROM profiles
  WHERE id = p_user_id;

  -- Check if already claimed today
  IF v_last_login = CURRENT_DATE THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Already claimed today',
      'streak', v_current_streak,
      'tokens', 0
    );
  END IF;

  -- Calculate new streak
  IF v_last_login = CURRENT_DATE - INTERVAL '1 day' THEN
    v_current_streak := v_current_streak + 1;
  ELSIF v_last_login IS NULL OR v_last_login < CURRENT_DATE - INTERVAL '1 day' THEN
    v_current_streak := 1;
  END IF;

  -- Calculate bonus tokens based on streak
  v_tokens_reward := 50 + (LEAST(v_current_streak, 30) * 5);

  -- Update user profile with new streak
  UPDATE profiles
  SET 
    last_daily_login = NOW(),
    login_streak = v_current_streak,
    updated_at = NOW()
  WHERE id = p_user_id;

  -- Award tokens using add_tokens
  PERFORM add_tokens(
    p_user_id,
    v_tokens_reward,
    'daily_login',
    'Daily login reward (streak: ' || v_current_streak || ')'
  );

  -- Try to insert into daily_login_rewards (ignore if already exists for today)
  BEGIN
    INSERT INTO daily_login_rewards (
      user_id,
      streak_count,
      tokens_earned,
      login_date
    ) VALUES (
      p_user_id,
      v_current_streak,
      v_tokens_reward,
      CURRENT_DATE
    );
  EXCEPTION
    WHEN unique_violation THEN
      NULL; -- Ignore duplicate, already claimed
  END;

  RETURN json_build_object(
    'success', true,
    'message', 'Daily login claimed!',
    'streak', v_current_streak,
    'tokens', v_tokens_reward
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Error processing daily login',
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION check_daily_login(UUID) TO authenticated;

-- Step 5: Fix gaming_activity RLS (for 406 errors)
DROP POLICY IF EXISTS "Users can view own activity" ON gaming_activity;
DROP POLICY IF EXISTS "Users can insert own activity" ON gaming_activity;
DROP POLICY IF EXISTS "Users can update own activity" ON gaming_activity;
DROP POLICY IF EXISTS "System can insert activity" ON gaming_activity;
DROP POLICY IF EXISTS "System can update activity" ON gaming_activity;
DROP POLICY IF EXISTS "Users can manage own gaming activity" ON gaming_activity;
DROP POLICY IF EXISTS "Service role full access" ON gaming_activity;

CREATE POLICY "Users can manage own gaming activity"
ON gaming_activity
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Step 6: Fix get_leaderboard function
DROP FUNCTION IF EXISTS get_leaderboard(TEXT, INTEGER) CASCADE;

CREATE FUNCTION get_leaderboard(
  p_category TEXT DEFAULT 'hours',
  p_limit INTEGER DEFAULT 100
) RETURNS TABLE (
  user_id UUID,
  username TEXT,
  avatar_url TEXT,
  tokens INTEGER,
  level INTEGER,
  total_hours NUMERIC,
  total_games BIGINT,
  total_achievements BIGINT,
  total_tokens_earned INTEGER,
  rank BIGINT
) AS $$
BEGIN
  IF p_category = 'hours' THEN
    RETURN QUERY
    SELECT 
      p.id,
      p.username,
      p.avatar_url,
      p.token_balance,
      p.level,
      COALESCE(SUM(ga.total_playtime_hours), 0) as total_hours,
      0::BIGINT as total_games,
      0::BIGINT as total_achievements,
      COALESCE(p.total_earned, 0),
      ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(ga.total_playtime_hours), 0) DESC) as rank
    FROM profiles p
    LEFT JOIN gaming_accounts ga ON ga.user_id = p.id
    GROUP BY p.id, p.username, p.avatar_url, p.token_balance, p.level, p.total_earned
    ORDER BY total_hours DESC
    LIMIT p_limit;

  ELSIF p_category = 'games' THEN
    RETURN QUERY
    SELECT 
      p.id,
      p.username,
      p.avatar_url,
      p.token_balance,
      p.level,
      0::NUMERIC as total_hours,
      COUNT(DISTINCT ug.id) as total_games,
      0::BIGINT as total_achievements,
      COALESCE(p.total_earned, 0),
      ROW_NUMBER() OVER (ORDER BY COUNT(DISTINCT ug.id) DESC) as rank
    FROM profiles p
    LEFT JOIN user_games ug ON ug.user_id = p.id
    GROUP BY p.id, p.username, p.avatar_url, p.token_balance, p.level, p.total_earned
    ORDER BY total_games DESC
    LIMIT p_limit;

  ELSIF p_category = 'achievements' THEN
    RETURN QUERY
    SELECT 
      p.id,
      p.username,
      p.avatar_url,
      p.token_balance,
      p.level,
      0::NUMERIC as total_hours,
      0::BIGINT as total_games,
      COUNT(DISTINCT ua.id) as total_achievements,
      COALESCE(p.total_earned, 0),
      ROW_NUMBER() OVER (ORDER BY COUNT(DISTINCT ua.id) DESC) as rank
    FROM profiles p
    LEFT JOIN user_achievements ua ON ua.user_id = p.id AND ua.unlocked = true
    GROUP BY p.id, p.username, p.avatar_url, p.token_balance, p.level, p.total_earned
    ORDER BY total_achievements DESC
    LIMIT p_limit;

  ELSIF p_category = 'tokens' THEN
    RETURN QUERY
    SELECT 
      p.id,
      p.username,
      p.avatar_url,
      p.token_balance,
      p.level,
      0::NUMERIC as total_hours,
      0::BIGINT as total_games,
      0::BIGINT as total_achievements,
      COALESCE(p.total_earned, 0),
      ROW_NUMBER() OVER (ORDER BY COALESCE(p.total_earned, 0) DESC) as rank
    FROM profiles p
    ORDER BY p.total_earned DESC
    LIMIT p_limit;

  ELSE
    RETURN QUERY
    SELECT 
      p.id,
      p.username,
      p.avatar_url,
      p.token_balance,
      p.level,
      COALESCE(SUM(ga.total_playtime_hours), 0) as total_hours,
      0::BIGINT as total_games,
      0::BIGINT as total_achievements,
      COALESCE(p.total_earned, 0),
      ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(ga.total_playtime_hours), 0) DESC) as rank
    FROM profiles p
    LEFT JOIN gaming_accounts ga ON ga.user_id = p.id
    GROUP BY p.id, p.username, p.avatar_url, p.token_balance, p.level, p.total_earned
    ORDER BY total_hours DESC
    LIMIT p_limit;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_leaderboard(TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_leaderboard(TEXT, INTEGER) TO anon;

-- All done! No output messages to avoid syntax errors.

