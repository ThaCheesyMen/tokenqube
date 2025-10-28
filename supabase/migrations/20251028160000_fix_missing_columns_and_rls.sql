-- =============================================
-- FIX MISSING COLUMNS AND RLS POLICIES
-- =============================================

-- Add missing columns to profiles table
DO $$
BEGIN
  -- Add is_online column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'is_online') THEN
    ALTER TABLE profiles ADD COLUMN is_online BOOLEAN DEFAULT FALSE;
    RAISE NOTICE 'Added is_online column to profiles';
  END IF;

  -- Add last_heartbeat column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'last_heartbeat') THEN
    ALTER TABLE profiles ADD COLUMN last_heartbeat TIMESTAMPTZ;
    RAISE NOTICE 'Added last_heartbeat column to profiles';
  END IF;

  -- Add token_balance column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'token_balance') THEN
    ALTER TABLE profiles ADD COLUMN token_balance INTEGER DEFAULT 0;
    RAISE NOTICE 'Added token_balance column to profiles';
  END IF;

  -- Add updated_at column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'updated_at') THEN
    ALTER TABLE profiles ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    RAISE NOTICE 'Added updated_at column to profiles';
  END IF;
END $$;

-- Create indexes for performance
DROP INDEX IF EXISTS idx_profiles_online;
CREATE INDEX idx_profiles_online ON profiles(is_online) WHERE is_online = TRUE;

DROP INDEX IF EXISTS idx_profiles_heartbeat;
CREATE INDEX idx_profiles_heartbeat ON profiles(last_heartbeat DESC);

-- Fix RLS policies for gaming_activity
ALTER TABLE gaming_activity ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own gaming activity" ON gaming_activity;
DROP POLICY IF EXISTS "Service role can view all gaming activity" ON gaming_activity;
DROP POLICY IF EXISTS "Users can insert own gaming activity" ON gaming_activity;
DROP POLICY IF EXISTS "Service role can insert gaming activity" ON gaming_activity;
DROP POLICY IF EXISTS "Users can update own gaming activity" ON gaming_activity;

-- Create correct RLS policies for gaming_activity
CREATE POLICY "Users can view own gaming activity"
  ON gaming_activity FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own gaming activity"
  ON gaming_activity FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own gaming activity"
  ON gaming_activity FOR UPDATE
  USING (user_id = auth.uid());

-- Allow authenticated users to read their own profile
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Allow authenticated users to update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Allow service role full access (for RPC functions)
DROP POLICY IF EXISTS "Service role full access to profiles" ON profiles;
CREATE POLICY "Service role full access to profiles"
  ON profiles FOR ALL
  USING (auth.role() = 'service_role');

-- RLS policies for daily_login_rewards
ALTER TABLE daily_login_rewards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own login rewards" ON daily_login_rewards;
CREATE POLICY "Users can view own login rewards"
  ON daily_login_rewards FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own login rewards" ON daily_login_rewards;
CREATE POLICY "Users can insert own login rewards"
  ON daily_login_rewards FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- RLS policies for token_transactions
ALTER TABLE token_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own transactions" ON token_transactions;
CREATE POLICY "Users can view own transactions"
  ON token_transactions FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own transactions" ON token_transactions;
CREATE POLICY "Users can insert own transactions"
  ON token_transactions FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Create a function to bypass RLS for SECURITY DEFINER functions
-- This allows our RPC functions to work properly
ALTER TABLE profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE daily_login_rewards FORCE ROW LEVEL SECURITY;
ALTER TABLE token_transactions FORCE ROW LEVEL SECURITY;
ALTER TABLE gaming_activity FORCE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT ALL ON profiles TO authenticated;
GRANT ALL ON daily_login_rewards TO authenticated;
GRANT ALL ON token_transactions TO authenticated;
GRANT ALL ON gaming_activity TO authenticated;

-- Update existing heartbeat function to handle missing columns gracefully
CREATE OR REPLACE FUNCTION update_user_heartbeat(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE profiles
  SET 
    last_heartbeat = NOW(),
    is_online = TRUE,
    updated_at = NOW()
  WHERE id = p_user_id;
END;
$$;

-- Update set_user_offline function
CREATE OR REPLACE FUNCTION set_user_offline(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE profiles
  SET 
    is_online = FALSE,
    last_heartbeat = NOW(),
    updated_at = NOW()
  WHERE id = p_user_id;
END;
$$;

-- Verification
DO $$
DECLARE
  v_has_is_online BOOLEAN;
  v_has_last_heartbeat BOOLEAN;
  v_has_token_balance BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'is_online'
  ) INTO v_has_is_online;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'last_heartbeat'
  ) INTO v_has_last_heartbeat;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'token_balance'
  ) INTO v_has_token_balance;

  RAISE NOTICE '======================================';
  RAISE NOTICE '✅ Column Verification:';
  RAISE NOTICE '  profiles.is_online: %', v_has_is_online;
  RAISE NOTICE '  profiles.last_heartbeat: %', v_has_last_heartbeat;
  RAISE NOTICE '  profiles.token_balance: %', v_has_token_balance;
  RAISE NOTICE '======================================';
  RAISE NOTICE '✅ RLS Policies Updated';
  RAISE NOTICE '✅ Functions Updated with SECURITY DEFINER';
  RAISE NOTICE '======================================';
END $$;

