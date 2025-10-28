-- Diagnose Signup Issues
-- Run these queries to identify the problem

-- 1. Check if the trigger exists
SELECT 
  t.tgname as trigger_name,
  c.relname as table_name,
  p.proname as function_name,
  pg_get_triggerdef(t.oid) as trigger_definition
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE t.tgname = 'on_auth_user_created';

-- 2. Check if the function exists and its definition
SELECT 
  proname as function_name,
  prosrc as function_source,
  provolatile,
  prosecdef as security_definer
FROM pg_proc 
WHERE proname = 'handle_new_user';

-- 3. Check profiles table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'profiles'
ORDER BY ordinal_position;

-- 4. Check for any constraints that might be failing
SELECT
  con.conname as constraint_name,
  con.contype as constraint_type,
  CASE con.contype
    WHEN 'c' THEN 'CHECK'
    WHEN 'f' THEN 'FOREIGN KEY'
    WHEN 'p' THEN 'PRIMARY KEY'
    WHEN 'u' THEN 'UNIQUE'
    ELSE con.contype::text
  END as constraint_type_name,
  pg_get_constraintdef(con.oid) as constraint_definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
WHERE rel.relname = 'profiles';

-- 5. Check RLS policies on profiles
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd as command,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies 
WHERE tablename = 'profiles';

-- 6. Check if there are any existing profiles
SELECT COUNT(*) as profile_count FROM profiles;

-- 7. Check recent auth.users (if you have access)
-- SELECT id, email, created_at FROM auth.users ORDER BY created_at DESC LIMIT 5;

-- 8. Test profile creation manually (replace 'test-uuid' with actual UUID)
-- INSERT INTO profiles (id, username, referral_code, token_balance, total_earned, signup_bonus_claimed)
-- VALUES (
--   'test-uuid-here'::uuid,
--   'testuser',
--   'REFTEST123',
--   100,
--   100,
--   TRUE
-- );

-- 9. Check for any foreign key constraints that might be failing
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'profiles';

-- 10. Check grants/permissions
SELECT 
  grantee,
  table_schema,
  table_name,
  privilege_type
FROM information_schema.table_privileges
WHERE table_schema = 'public' 
  AND table_name IN ('profiles', 'transactions')
ORDER BY table_name, grantee, privilege_type;

