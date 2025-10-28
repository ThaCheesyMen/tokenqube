-- ================================================================
-- CLEANUP BAD DATA - Remove the -10 transaction and set streak
-- Run this AFTER running SIMPLE_FIX_RUN_THIS.sql
-- ================================================================

-- Replace YOUR_USER_ID with your actual user ID: 4c4ef0a4-6689-46df-b215-37a9d2bcc089

-- 1. Delete the bad -10 transaction
DELETE FROM token_transactions
WHERE user_id = '4c4ef0a4-6689-46df-b215-37a9d2bcc089'
AND amount = -10
AND category = 'other'
AND description LIKE '%Daily login%';

-- 2. Fix any negative transactions from daily login
DELETE FROM token_transactions
WHERE user_id = '4c4ef0a4-6689-46df-b215-37a9d2bcc089'
AND amount < 0
AND (description LIKE '%Daily login%' OR description LIKE '%daily_login%');

-- 3. Set your streak to 1 (or keep existing if higher)
UPDATE profiles
SET 
  login_streak = GREATEST(COALESCE(login_streak, 0), 1),
  last_daily_login = NOW()
WHERE id = '4c4ef0a4-6689-46df-b215-37a9d2bcc089';

-- 4. Check your current state
SELECT 
  username,
  login_streak,
  last_daily_login,
  token_balance,
  total_earned
FROM profiles
WHERE id = '4c4ef0a4-6689-46df-b215-37a9d2bcc089';

-- 5. Check your recent transactions (should be clean now)
SELECT 
  created_at,
  amount,
  type,
  category,
  description
FROM token_transactions
WHERE user_id = '4c4ef0a4-6689-46df-b215-37a9d2bcc089'
ORDER BY created_at DESC
LIMIT 10;

