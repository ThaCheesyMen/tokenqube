-- ================================================================
-- QUICK CHECK: View your current streak and recent transactions
-- ================================================================

-- 1. Check if login_streak column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name IN ('login_streak', 'last_daily_login', 'total_earned')
ORDER BY column_name;

-- 2. Check your current profile data (replace with your user ID or use this)
SELECT 
  id,
  username,
  login_streak,
  last_daily_login,
  token_balance,
  total_earned,
  created_at
FROM profiles
WHERE username = 'your_username_here' -- REPLACE THIS
OR id = '4c4ef0a4-6689-46df-b215-37a9d2bcc089'; -- OR USE YOUR USER ID

-- 3. Check recent token transactions
SELECT 
  created_at,
  amount,
  type,
  category,
  source,
  description
FROM token_transactions
WHERE user_id = '4c4ef0a4-6689-46df-b215-37a9d2bcc089' -- REPLACE WITH YOUR USER ID
ORDER BY created_at DESC
LIMIT 10;

-- 4. Check if check_daily_login function exists and its definition
SELECT 
  proname as function_name,
  pg_get_functiondef(oid) as definition
FROM pg_proc
WHERE proname = 'check_daily_login';

-- 5. Check if add_tokens function exists
SELECT 
  proname as function_name,
  pronargs as num_args
FROM pg_proc
WHERE proname = 'add_tokens';

-- ================================================================
-- MANUAL FIX: Set your streak manually (if needed)
-- ================================================================

-- Uncomment and run this ONLY if the column exists but your streak is 0
-- UPDATE profiles 
-- SET 
--   login_streak = 1,
--   last_daily_login = NOW()
-- WHERE id = '4c4ef0a4-6689-46df-b215-37a9d2bcc089'; -- REPLACE WITH YOUR USER ID

-- ================================================================
-- MANUAL TEST: Call check_daily_login
-- ================================================================

-- Test the daily login function directly
SELECT check_daily_login('4c4ef0a4-6689-46df-b215-37a9d2bcc089'::UUID); -- REPLACE WITH YOUR USER ID

