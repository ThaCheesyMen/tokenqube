-- Alternative approach: Use a webhook or edge function
-- But first, let's try a simpler trigger approach

-- Drop everything and start fresh
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- Create a very simple function first
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Just insert a simple profile first
  INSERT INTO profiles (
    id, 
    username, 
    referral_code, 
    token_balance, 
    total_earned, 
    total_spent, 
    signup_bonus_claimed
  ) VALUES (
    NEW.id,
    'user_' || substr(NEW.id::text, 1, 8),
    'REF' || substr(NEW.id::text, 1, 8),
    100,
    100,
    0,
    true
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Test if we can call the function manually
-- This will help us see if the function works at all
DO $$
DECLARE
  test_user_id uuid := '7ddbd9ba-86b7-45f2-97a5-479906638e5a';
BEGIN
  -- Try to insert a profile manually using the function logic
  INSERT INTO profiles (
    id, 
    username, 
    referral_code, 
    token_balance, 
    total_earned, 
    total_spent, 
    signup_bonus_claimed
  ) VALUES (
    test_user_id,
    'manual_test',
    'MANUAL' || substr(test_user_id::text, 1, 8),
    100,
    100,
    0,
    true
  );
  
  RAISE NOTICE 'Manual insert successful for user %', test_user_id;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Manual insert failed: %', SQLERRM;
END $$;
