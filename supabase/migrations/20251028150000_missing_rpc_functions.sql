-- =============================================
-- MISSING RPC FUNCTIONS - Critical Database Functions
-- =============================================

-- Ensure user_role type exists (from RBAC migration)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('user', 'admin', 'dev', 'support', 'moderator');
        RAISE NOTICE 'Created user_role enum type';
    END IF;
END $$;

-- Drop all existing functions first to avoid conflicts
DROP FUNCTION IF EXISTS update_user_heartbeat(UUID) CASCADE;
DROP FUNCTION IF EXISTS set_user_offline(UUID) CASCADE;
DROP FUNCTION IF EXISTS check_daily_login(UUID) CASCADE;
DROP FUNCTION IF EXISTS get_platform_stats() CASCADE;
DROP FUNCTION IF EXISTS ban_user(UUID, TEXT, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS unban_user(UUID) CASCADE;
DROP FUNCTION IF EXISTS update_user_role(UUID, user_role) CASCADE;

-- Function: update_user_heartbeat
-- Purpose: Updates user's last heartbeat timestamp for online presence tracking
CREATE FUNCTION update_user_heartbeat(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE profiles
  SET 
    last_heartbeat = NOW(),
    is_online = TRUE
  WHERE id = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION update_user_heartbeat(UUID) TO authenticated;

-- Function: set_user_offline
-- Purpose: Sets user's online status to offline
CREATE FUNCTION set_user_offline(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE profiles
  SET 
    is_online = FALSE,
    last_heartbeat = NOW()
  WHERE id = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION set_user_offline(UUID) TO authenticated;

-- Function: check_daily_login (FIXED - removed ambiguous column reference)
-- Purpose: Checks and records daily login for streak tracking
CREATE FUNCTION check_daily_login(p_user_id UUID)
RETURNS TABLE(
  is_first_login_today BOOLEAN,
  current_streak INTEGER,
  tokens_awarded INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_last_login_date DATE;
  v_current_streak INTEGER;
  v_tokens INTEGER := 0;
  v_today DATE := CURRENT_DATE;
BEGIN
  -- Get user's last login date from daily_login_rewards
  SELECT dlr.login_date, dlr.streak_count 
  INTO v_last_login_date, v_current_streak
  FROM daily_login_rewards dlr
  WHERE dlr.user_id = p_user_id
  ORDER BY dlr.login_date DESC
  LIMIT 1;

  -- Check if user already logged in today
  IF v_last_login_date = v_today THEN
    RETURN QUERY SELECT FALSE, v_current_streak, 0;
    RETURN;
  END IF;

  -- Calculate streak
  IF v_last_login_date IS NULL THEN
    -- First time login
    v_current_streak := 1;
  ELSIF v_last_login_date = v_today - INTERVAL '1 day' THEN
    -- Consecutive day
    v_current_streak := COALESCE(v_current_streak, 0) + 1;
  ELSE
    -- Streak broken
    v_current_streak := 1;
  END IF;

  -- Calculate tokens based on streak (100 base + 10 per streak day, max 500)
  v_tokens := LEAST(100 + (v_current_streak * 10), 500);

  -- Record the login
  INSERT INTO daily_login_rewards (
    user_id,
    login_date,
    streak_count,
    tokens_earned,
    created_at
  ) VALUES (
    p_user_id,
    v_today,
    v_current_streak,
    v_tokens,
    NOW()
  );

  -- Award tokens to user
  UPDATE profiles
  SET token_balance = COALESCE(token_balance, 0) + v_tokens
  WHERE id = p_user_id;

  -- Log transaction
  INSERT INTO token_transactions (
    user_id,
    amount,
    type,
    category,
    source,
    description
  ) VALUES (
    p_user_id,
    v_tokens,
    'earn',
    'reward',
    'daily_login',
    'Daily login reward (streak: ' || v_current_streak || ')'
  );

  RETURN QUERY SELECT TRUE, v_current_streak, v_tokens;
END;
$$;

GRANT EXECUTE ON FUNCTION check_daily_login(UUID) TO authenticated;

-- Function: get_platform_stats
-- Purpose: Returns comprehensive platform statistics for admin dashboard
CREATE FUNCTION get_platform_stats()
RETURNS TABLE(
  total_users BIGINT,
  active_users_today BIGINT,
  total_tokens_earned NUMERIC,
  total_marketplace_volume NUMERIC,
  total_withdrawals NUMERIC,
  pending_withdrawals BIGINT,
  total_revenue_usd NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    -- Total users
    (SELECT COUNT(*) FROM profiles)::BIGINT as total_users,
    
    -- Active users today (logged in within last 24 hours)
    (SELECT COUNT(*) 
     FROM profiles 
     WHERE last_heartbeat >= NOW() - INTERVAL '24 hours')::BIGINT as active_users_today,
    
    -- Total tokens earned by all users
    (SELECT COALESCE(SUM(amount), 0) 
     FROM token_transactions 
     WHERE type = 'earn')::NUMERIC as total_tokens_earned,
    
    -- Total marketplace volume (sum of all completed transactions)
    (SELECT COALESCE(SUM(price), 0) 
     FROM marketplace_transactions 
     WHERE transaction_status = 'completed')::NUMERIC as total_marketplace_volume,
    
    -- Total withdrawals processed
    (SELECT COALESCE(SUM(amount), 0) 
     FROM token_withdrawals 
     WHERE status = 'approved')::NUMERIC as total_withdrawals,
    
    -- Pending withdrawals count
    (SELECT COUNT(*) 
     FROM token_withdrawals 
     WHERE status = 'pending')::BIGINT as pending_withdrawals,
    
    -- Total revenue in USD
    (SELECT COALESCE(SUM(gross_revenue), 0) 
     FROM platform_revenue)::NUMERIC as total_revenue_usd;
END;
$$;

GRANT EXECUTE ON FUNCTION get_platform_stats() TO authenticated;

-- Function: ban_user
-- Purpose: Bans a user with optional duration
CREATE FUNCTION ban_user(
  p_user_id UUID,
  p_reason TEXT,
  p_duration_hours INTEGER DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_banned_until TIMESTAMPTZ;
BEGIN
  -- Calculate ban end time if duration is provided
  IF p_duration_hours IS NOT NULL THEN
    v_banned_until := NOW() + (p_duration_hours || ' hours')::INTERVAL;
  END IF;

  -- Update user profile
  UPDATE profiles
  SET 
    is_banned = TRUE,
    ban_reason = p_reason,
    banned_until = v_banned_until,
    updated_at = NOW()
  WHERE id = p_user_id;

  -- Log the ban action in audit logs if table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs') THEN
    INSERT INTO audit_logs (
      action,
      user_id,
      target_user_id,
      metadata
    ) VALUES (
      'user_banned',
      auth.uid(),
      p_user_id,
      jsonb_build_object(
        'reason', p_reason,
        'duration_hours', p_duration_hours,
        'banned_until', v_banned_until
      )
    );
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION ban_user(UUID, TEXT, INTEGER) TO authenticated;

-- Function: unban_user
-- Purpose: Unbans a user
CREATE FUNCTION unban_user(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE profiles
  SET 
    is_banned = FALSE,
    ban_reason = NULL,
    banned_until = NULL,
    updated_at = NOW()
  WHERE id = p_user_id;

  -- Log the unban action
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs') THEN
    INSERT INTO audit_logs (
      action,
      user_id,
      target_user_id,
      metadata
    ) VALUES (
      'user_unbanned',
      auth.uid(),
      p_user_id,
      jsonb_build_object('unbanned_at', NOW())
    );
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION unban_user(UUID) TO authenticated;

-- Function: update_user_role
-- Purpose: Updates a user's role (admin only)
CREATE FUNCTION update_user_role(
  p_user_id UUID,
  p_new_role user_role
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin_role user_role;
BEGIN
  -- Check if caller is admin
  SELECT role INTO v_admin_role FROM profiles WHERE id = auth.uid();
  
  IF v_admin_role != 'admin' THEN
    RAISE EXCEPTION 'Only admins can update user roles';
  END IF;

  -- Update the role
  UPDATE profiles
  SET 
    role = p_new_role,
    updated_at = NOW()
  WHERE id = p_user_id;

  -- Log the role change
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs') THEN
    INSERT INTO audit_logs (
      action,
      user_id,
      target_user_id,
      metadata
    ) VALUES (
      'role_updated',
      auth.uid(),
      p_user_id,
      jsonb_build_object('new_role', p_new_role)
    );
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION update_user_role(UUID, user_role) TO authenticated;

-- Add missing columns to profiles if they don't exist
DO $$
BEGIN
  -- Add banned_until column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'banned_until') THEN
    ALTER TABLE profiles ADD COLUMN banned_until TIMESTAMPTZ;
    RAISE NOTICE 'Added banned_until column to profiles';
  END IF;

  -- Add last_active_at column (alias for last_heartbeat for compatibility)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'last_active_at') THEN
    ALTER TABLE profiles ADD COLUMN last_active_at TIMESTAMPTZ;
    -- Initialize with last_heartbeat value
    UPDATE profiles SET last_active_at = last_heartbeat WHERE last_heartbeat IS NOT NULL;
    RAISE NOTICE 'Added last_active_at column to profiles';
  END IF;

  -- Add email column if missing (should exist from auth, but just in case)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'email') THEN
    ALTER TABLE profiles ADD COLUMN email TEXT;
    RAISE NOTICE 'Added email column to profiles';
  END IF;
END $$;

-- Create a trigger to keep last_active_at in sync with last_heartbeat
DROP FUNCTION IF EXISTS sync_last_active_at() CASCADE;

CREATE FUNCTION sync_last_active_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.last_active_at := NEW.last_heartbeat;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_sync_last_active_at ON profiles;
CREATE TRIGGER trigger_sync_last_active_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  WHEN (OLD.last_heartbeat IS DISTINCT FROM NEW.last_heartbeat)
  EXECUTE FUNCTION sync_last_active_at();

-- Verification
DO $$
BEGIN
  RAISE NOTICE '✅ Missing RPC functions created successfully!';
  RAISE NOTICE '======================================';
  RAISE NOTICE '✓ update_user_heartbeat';
  RAISE NOTICE '✓ set_user_offline';
  RAISE NOTICE '✓ check_daily_login (FIXED)';
  RAISE NOTICE '✓ get_platform_stats';
  RAISE NOTICE '✓ ban_user';
  RAISE NOTICE '✓ unban_user';
  RAISE NOTICE '✓ update_user_role';
  RAISE NOTICE '======================================';
END $$;

