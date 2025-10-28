-- Temporarily disable RLS to test if that's the issue
-- Run this to test if RLS is blocking the trigger

-- Disable RLS on profiles table temporarily
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Disable RLS on transactions table temporarily  
ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;

-- Now try the trigger again
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- Create a simple version of the function
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_referral_code text;
  user_username text;
BEGIN
  -- Get username from metadata or email
  user_username := COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1));
  
  -- Generate a simple referral code
  new_referral_code := 'REF' || substr(NEW.id::text, 1, 8);
  
  -- Insert profile
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
    user_username,
    new_referral_code,
    100,
    100,
    0,
    true
  );

  -- Insert transaction
  INSERT INTO transactions (
    user_id, 
    amount, 
    type, 
    description
  ) VALUES (
    NEW.id, 
    100, 
    'signup_bonus', 
    'Welcome bonus for signing up!'
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the signup
    RAISE WARNING 'Error in handle_new_user for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
