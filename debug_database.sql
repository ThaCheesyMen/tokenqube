-- Test script to check what's happening with profile creation
-- Run this in Supabase SQL Editor to debug

-- Check if the trigger exists
SELECT trigger_name, event_manipulation, action_statement 
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';

-- Check if the function exists
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_name = 'handle_new_user';

-- Check if the generate_referral_code function exists
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_name = 'generate_referral_code';

-- Check current user profiles
SELECT id, username, token_balance, referral_code, created_at 
FROM profiles 
ORDER BY created_at DESC 
LIMIT 5;

-- Check if there are any profiles for the current user
SELECT id, username, token_balance, referral_code 
FROM profiles 
WHERE id = 'b3c03223-cba8-4299-9a87-4f56854fb868';

-- Check RLS policies on profiles table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'profiles';

-- Check if RLS is enabled on profiles
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'profiles';
