-- Simple check to see what's in the database
-- Run this in Supabase SQL Editor

-- Check if there are any profiles
SELECT COUNT(*) as profile_count FROM profiles;

-- Check if there are any profiles for your user
SELECT * FROM profiles WHERE id = 'b3c03223-cba8-4299-9a87-4f56854fb868';

-- Check if the trigger exists
SELECT * FROM information_schema.triggers WHERE trigger_name = 'on_auth_user_created';

-- Check if the function exists
SELECT * FROM information_schema.routines WHERE routine_name = 'handle_new_user';

-- Check RLS status
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'profiles';
