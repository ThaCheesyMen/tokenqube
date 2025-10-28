-- Check trigger status and test manually
-- Run this to see what's happening with the trigger

-- Check if trigger exists
SELECT 
    trigger_name, 
    event_manipulation, 
    action_timing,
    action_statement,
    action_orientation
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';

-- Check if function exists
SELECT 
    routine_name, 
    routine_type,
    data_type,
    routine_definition
FROM information_schema.routines 
WHERE routine_name = 'handle_new_user';

-- Check if there are any profiles for the new user
SELECT * FROM profiles WHERE id = '7ddbd9ba-86b7-45f2-97a5-479906638e5a';

-- Check if there are any transactions for the new user
SELECT * FROM transactions WHERE user_id = '7ddbd9ba-86b7-45f2-97a5-479906638e5a';

-- Test the function manually
SELECT handle_new_user();

-- Check if there are any recent auth.users entries
SELECT id, email, created_at, raw_user_meta_data 
FROM auth.users 
ORDER BY created_at DESC 
LIMIT 3;
