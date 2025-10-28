-- Fix the trigger to work with RLS policies
-- This version should work properly

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- Create the generate_referral_code function
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS text AS $$
DECLARE
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
  i integer;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Create the handle_new_user function with proper security
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_referral_code text;
  user_username text;
BEGIN
  -- Get username from metadata or email
  user_username := COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1));
  
  -- Generate unique referral code
  LOOP
    new_referral_code := generate_referral_code();
    EXIT WHEN NOT EXISTS (SELECT 1 FROM profiles WHERE referral_code = new_referral_code);
  END LOOP;

  -- Insert profile (this will bypass RLS because function is SECURITY DEFINER)
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

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO postgres;
GRANT ALL ON profiles TO postgres;
GRANT ALL ON transactions TO postgres;
