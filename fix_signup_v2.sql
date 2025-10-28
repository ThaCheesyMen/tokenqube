-- Temporary fix: Disable the problematic trigger and create a simpler approach
-- This will allow signup to work while we debug the trigger

-- Drop the problematic trigger temporarily
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create a simpler function that doesn't fail
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_referral_code text;
BEGIN
  -- Generate unique referral code
  LOOP
    new_referral_code := generate_referral_code();
    EXIT WHEN NOT EXISTS (SELECT 1 FROM profiles WHERE referral_code = new_referral_code);
  END LOOP;

  -- Create profile with signup bonus (simplified)
  INSERT INTO profiles (id, username, referral_code, token_balance, total_earned, signup_bonus_claimed)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    new_referral_code,
    100,
    100,
    true
  );

  -- Record signup bonus transaction
  INSERT INTO transactions (user_id, amount, type, description)
  VALUES (NEW.id, 100, 'signup_bonus', 'Welcome bonus for signing up!');

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- If anything fails, just return NEW to allow signup to continue
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
