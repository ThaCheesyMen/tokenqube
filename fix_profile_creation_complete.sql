-- ============================================
-- COMPLETE PROFILE CREATION FIX
-- ============================================

-- Step 1: Add all missing columns to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS token_balance INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_earned INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_spent INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS signup_bonus_claimed BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS custom_status TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS status_emoji TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'online';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS banner_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS accent_color TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profile_theme TEXT DEFAULT 'default';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profile_visibility TEXT DEFAULT 'public';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS show_email BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS show_games BOOLEAN DEFAULT TRUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS show_activity BOOLEAN DEFAULT TRUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_tokens INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_referrals INTEGER DEFAULT 0;

-- Step 2: Update NULL values to comply with constraints
UPDATE profiles SET status = 'online' WHERE status IS NULL;
UPDATE profiles SET profile_visibility = 'public' WHERE profile_visibility IS NULL;
UPDATE profiles SET profile_theme = 'default' WHERE profile_theme IS NULL;
UPDATE profiles SET token_balance = 0 WHERE token_balance IS NULL;
UPDATE profiles SET total_earned = 0 WHERE total_earned IS NULL;
UPDATE profiles SET total_spent = 0 WHERE total_spent IS NULL;
UPDATE profiles SET total_tokens = 0 WHERE total_tokens IS NULL;
UPDATE profiles SET total_referrals = 0 WHERE total_referrals IS NULL;
UPDATE profiles SET signup_bonus_claimed = FALSE WHERE signup_bonus_claimed IS NULL;

-- Step 3: Drop existing constraints if they exist
DO $$ 
BEGIN
    -- Drop old constraints
    ALTER TABLE profiles DROP CONSTRAINT IF EXISTS status_valid;
    ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profile_visibility_valid;
    ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profile_theme_valid;
EXCEPTION
    WHEN undefined_object THEN NULL;
END $$;

-- Step 4: Add constraints
ALTER TABLE profiles ADD CONSTRAINT status_valid 
  CHECK (status IN ('online', 'idle', 'dnd', 'invisible'));

ALTER TABLE profiles ADD CONSTRAINT profile_visibility_valid 
  CHECK (profile_visibility IN ('public', 'friends', 'private'));

ALTER TABLE profiles ADD CONSTRAINT profile_theme_valid 
  CHECK (profile_theme IN ('default', 'gradient', 'dark', 'custom'));

-- Step 5: Drop and recreate the trigger function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;

-- Step 6: Create improved trigger function
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  new_referral_code TEXT;
  max_attempts INTEGER := 10;
  attempt INTEGER := 0;
BEGIN
  -- Generate unique referral code
  LOOP
    new_referral_code := 'REF' || upper(substring(md5(random()::text) from 1 for 8));
    
    -- Check if code exists
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE referral_code = new_referral_code) THEN
      EXIT;
    END IF;
    
    attempt := attempt + 1;
    IF attempt >= max_attempts THEN
      RAISE EXCEPTION 'Could not generate unique referral code after % attempts', max_attempts;
    END IF;
  END LOOP;

  -- Insert profile with all required fields
  INSERT INTO profiles (
    id,
    username,
    email,
    referral_code,
    token_balance,
    total_earned,
    total_spent,
    total_tokens,
    total_referrals,
    signup_bonus_claimed,
    status,
    profile_visibility,
    profile_theme,
    show_email,
    show_games,
    show_activity,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    NEW.email,
    new_referral_code,
    100, -- signup bonus
    100,
    0,
    100,
    0,
    TRUE,
    'online',
    'public',
    'default',
    FALSE,
    TRUE,
    TRUE,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;

  -- Record signup bonus transaction
  INSERT INTO transactions (
    user_id,
    amount,
    type,
    description,
    created_at
  ) VALUES (
    NEW.id,
    100,
    'signup_bonus',
    'Welcome bonus for signing up!',
    NOW()
  )
  ON CONFLICT DO NOTHING;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail user creation
    RAISE WARNING 'Error in handle_new_user for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Step 7: Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Step 8: Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated, anon;
GRANT ALL ON profiles TO authenticated;
GRANT ALL ON transactions TO authenticated;

-- Step 9: Update RLS policies for profiles
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

CREATE POLICY "Users can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Step 10: Ensure transactions table exists and has proper RLS
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  type TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

DROP POLICY IF EXISTS "Users can view own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can insert own transactions" ON transactions;

CREATE POLICY "Users can view own transactions"
  ON transactions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions"
  ON transactions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Done!
SELECT 'Profile creation system fixed successfully!' as status;

