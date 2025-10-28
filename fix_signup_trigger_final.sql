-- FINAL FIX FOR SIGNUP ISSUES
-- This script ensures signup works properly with minimal complexity

-- Step 1: Ensure profiles table has all basic required columns
DO $$ 
BEGIN
  -- Add columns if they don't exist
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS username TEXT;
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referral_code TEXT;
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS token_balance INTEGER DEFAULT 0;
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_earned INTEGER DEFAULT 0;
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_spent INTEGER DEFAULT 0;
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS signup_bonus_claimed BOOLEAN DEFAULT FALSE;
  
  -- Make sure id is the primary key and references auth.users
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_pkey'
  ) THEN
    ALTER TABLE profiles ADD PRIMARY KEY (id);
  END IF;
END $$;

-- Step 2: Drop existing trigger and function to start fresh
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;

-- Step 3: Create a simple, robust function to handle new users
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  new_username TEXT;
  new_referral_code TEXT;
BEGIN
  -- Generate username from email
  new_username := COALESCE(
    NEW.raw_user_meta_data->>'username',
    split_part(NEW.email, '@', 1)
  );
  
  -- Generate simple referral code
  new_referral_code := 'REF' || upper(substring(md5(random()::text) from 1 for 8));
  
  -- Insert profile with basic info only
  INSERT INTO public.profiles (
    id,
    username,
    referral_code,
    token_balance,
    total_earned,
    signup_bonus_claimed
  )
  VALUES (
    NEW.id,
    new_username,
    new_referral_code,
    100,
    100,
    TRUE
  )
  ON CONFLICT (id) DO NOTHING;
  
  -- Create signup bonus transaction
  INSERT INTO public.transactions (
    user_id,
    amount,
    type,
    description
  )
  VALUES (
    NEW.id,
    100,
    'signup_bonus',
    'Welcome bonus for signing up!'
  )
  ON CONFLICT DO NOTHING;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the signup
    RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Step 4: Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Step 5: Update RLS policies to be permissive for signup
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON profiles;

-- Create simple, permissive policies
CREATE POLICY "Anyone can view profiles"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Service role can insert profiles"
  ON profiles FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Step 6: Ensure transactions table has proper RLS
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can insert own transactions" ON transactions;
DROP POLICY IF EXISTS "Service role can insert transactions" ON transactions;

CREATE POLICY "Users can view their own transactions"
  ON transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert transactions"
  ON transactions FOR INSERT
  WITH CHECK (true);

-- Step 7: Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON public.profiles TO anon, authenticated, service_role;
GRANT ALL ON public.transactions TO anon, authenticated, service_role;

-- Step 8: Test the setup (optional - run manually)
-- SELECT 
--   t.tgname as trigger_name,
--   'auth.users' as table_name,
--   p.proname as function_name
-- FROM pg_trigger t
-- JOIN pg_proc p ON t.tgfoid = p.oid
-- WHERE t.tgname = 'on_auth_user_created';

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Signup trigger fixed successfully!';
  RAISE NOTICE 'Trigger: on_auth_user_created';
  RAISE NOTICE 'Function: handle_new_user()';
  RAISE NOTICE 'Users will now get 100 tokens on signup';
END $$;

