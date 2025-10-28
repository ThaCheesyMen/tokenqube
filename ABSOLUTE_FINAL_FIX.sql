-- =============================================
-- ABSOLUTE FINAL FIX - RUN THIS IN SUPABASE SQL EDITOR
-- =============================================

-- Step 1: Drop and recreate check_daily_login (FIXED - no referral_stats insert)
DROP FUNCTION IF EXISTS check_daily_login(UUID) CASCADE;

CREATE FUNCTION check_daily_login(p_user_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_last_login DATE;
  v_streak INTEGER := 1;
  v_tokens INTEGER := 10;
  v_result JSONB;
BEGIN
  -- Get last login
  SELECT login_date, streak_count
  INTO v_last_login, v_streak
  FROM daily_login_rewards
  WHERE user_id = p_user_id
  ORDER BY login_date DESC
  LIMIT 1;

  -- Check if already logged in today
  IF v_last_login = CURRENT_DATE THEN
    RETURN jsonb_build_object(
      'already_claimed', true,
      'streak', v_streak,
      'tokens', 0
    );
  END IF;

  -- Calculate new streak
  IF v_last_login = CURRENT_DATE - 1 THEN
    v_streak := v_streak + 1;
  ELSIF v_last_login IS NULL OR v_last_login < CURRENT_DATE - 1 THEN
    v_streak := 1;
  END IF;

  -- Bonus tokens for streaks
  IF v_streak >= 7 THEN
    v_tokens := v_tokens + 20;
  ELSIF v_streak >= 3 THEN
    v_tokens := v_tokens + 10;
  END IF;

  -- Insert new login record
  INSERT INTO daily_login_rewards (user_id, login_date, streak_count, tokens_earned, bonus_applied)
  VALUES (p_user_id, CURRENT_DATE, v_streak, v_tokens, v_streak >= 3);

  -- Award tokens
  UPDATE profiles
  SET token_balance = token_balance + v_tokens,
      total_earned = total_earned + v_tokens
  WHERE id = p_user_id;

  -- Log transaction
  INSERT INTO token_transactions (user_id, amount, type, description)
  VALUES (p_user_id, v_tokens, 'earned', 'Daily login reward (streak: ' || v_streak || ')');

  RETURN jsonb_build_object(
    'already_claimed', false,
    'streak', v_streak,
    'tokens', v_tokens,
    'bonus_applied', v_streak >= 3
  );
END;
$$;

-- Step 2: Create update_user_heartbeat
DROP FUNCTION IF EXISTS update_user_heartbeat(UUID) CASCADE;

CREATE FUNCTION update_user_heartbeat(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE profiles
  SET 
    last_heartbeat = NOW(),
    last_active_at = NOW(),
    is_online = true
  WHERE id = p_user_id;
END;
$$;

-- Step 3: Create set_user_offline
DROP FUNCTION IF EXISTS set_user_offline(UUID) CASCADE;

CREATE FUNCTION set_user_offline(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE profiles
  SET 
    is_online = false,
    last_seen = NOW()
  WHERE id = p_user_id;
END;
$$;

-- Step 4: Create get_platform_stats
DROP FUNCTION IF EXISTS get_platform_stats() CASCADE;

CREATE FUNCTION get_platform_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_stats JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_users', COUNT(DISTINCT p.id),
    'active_users_today', COUNT(DISTINCT p.id) FILTER (WHERE p.last_active_at >= NOW() - INTERVAL '24 hours'),
    'total_tokens_earned', COALESCE(SUM(p.total_earned), 0),
    'total_tokens_spent', COALESCE(SUM(p.total_spent), 0),
    'marketplace_transactions', (SELECT COUNT(*) FROM marketplace_transactions WHERE transaction_status = 'completed'),
    'pending_withdrawals', (SELECT COUNT(*) FROM token_withdrawals WHERE status = 'pending'),
    'total_revenue', COALESCE((SELECT SUM(gross_revenue) FROM platform_revenue), 0)
  )
  INTO v_stats
  FROM profiles p
  WHERE p.deleted_at IS NULL;

  RETURN v_stats;
END;
$$;

-- Step 5: Fix gaming_activity RLS
DROP POLICY IF EXISTS "Users can view own gaming activity" ON gaming_activity;
DROP POLICY IF EXISTS "Users can insert own gaming activity" ON gaming_activity;
DROP POLICY IF EXISTS "Users can update own gaming activity" ON gaming_activity;

CREATE POLICY "Users can view own gaming activity"
  ON gaming_activity FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own gaming activity"
  ON gaming_activity FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own gaming activity"
  ON gaming_activity FOR UPDATE
  USING (auth.uid() = user_id);

-- Step 6: Fix user_achievements RLS
DROP POLICY IF EXISTS "Users can view own achievements" ON user_achievements;
DROP POLICY IF EXISTS "Users can insert own achievements" ON user_achievements;
DROP POLICY IF EXISTS "Users can update own achievements" ON user_achievements;

CREATE POLICY "Users can view own achievements"
  ON user_achievements FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own achievements"
  ON user_achievements FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own achievements"
  ON user_achievements FOR UPDATE
  USING (auth.uid() = user_id);

-- Step 7: Set your user as admin (REPLACE WITH YOUR EMAIL)
UPDATE profiles
SET role = 'admin'
WHERE email = 'your-email@example.com'; -- CHANGE THIS!

-- Step 8: Grant execute permissions
GRANT EXECUTE ON FUNCTION check_daily_login(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_heartbeat(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION set_user_offline(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_platform_stats() TO authenticated;

-- =============================================
-- SUCCESS MESSAGE
-- =============================================
DO $$
BEGIN
  RAISE NOTICE '✅ ALL FUNCTIONS CREATED SUCCESSFULLY!';
  RAISE NOTICE '⚠️  IMPORTANT: Update line 137 with your actual email address!';
  RAISE NOTICE '🔄 Now do a HARD REFRESH in your browser (Ctrl+Shift+R)';
END $$;

