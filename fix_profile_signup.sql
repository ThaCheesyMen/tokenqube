-- Fix Profile Signup Issues
-- This script ensures all required columns exist and have proper defaults

-- Check current profile table structure
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'profiles'
-- ORDER BY ordinal_position;

-- Add any missing columns with proper defaults
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS token_balance INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_earned INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_spent INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS signup_bonus_claimed BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS xp INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'bronze';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_referrals INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'offline';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS custom_status TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS status_emoji TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS banner_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS accent_color TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profile_theme TEXT DEFAULT 'default';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profile_visibility TEXT DEFAULT 'public';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS show_email BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS show_games BOOLEAN DEFAULT TRUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS show_activity BOOLEAN DEFAULT TRUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_tokens INTEGER DEFAULT 0;

-- Ensure id column is UUID and references auth.users
-- ALTER TABLE profiles ALTER COLUMN id TYPE UUID USING id::UUID;
-- ALTER TABLE profiles ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update existing NULL values to defaults
UPDATE profiles SET token_balance = 0 WHERE token_balance IS NULL;
UPDATE profiles SET total_earned = 0 WHERE total_earned IS NULL;
UPDATE profiles SET total_spent = 0 WHERE total_spent IS NULL;
UPDATE profiles SET signup_bonus_claimed = FALSE WHERE signup_bonus_claimed IS NULL;
UPDATE profiles SET level = 1 WHERE level IS NULL;
UPDATE profiles SET xp = 0 WHERE xp IS NULL;
UPDATE profiles SET tier = 'bronze' WHERE tier IS NULL;
UPDATE profiles SET total_referrals = 0 WHERE total_referrals IS NULL;
UPDATE profiles SET status = 'offline' WHERE status IS NULL OR status NOT IN ('online', 'idle', 'dnd', 'invisible');
UPDATE profiles SET profile_theme = 'default' WHERE profile_theme IS NULL OR profile_theme NOT IN ('default', 'gradient', 'dark', 'custom');
UPDATE profiles SET profile_visibility = 'public' WHERE profile_visibility IS NULL OR profile_visibility NOT IN ('public', 'friends', 'private');
UPDATE profiles SET show_email = FALSE WHERE show_email IS NULL;
UPDATE profiles SET show_games = TRUE WHERE show_games IS NULL;
UPDATE profiles SET show_activity = TRUE WHERE show_activity IS NULL;
UPDATE profiles SET total_tokens = 0 WHERE total_tokens IS NULL;

-- Add check constraints (drop first if they exist)
DO $$ 
BEGIN
  -- Status check
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'status_valid'
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT status_valid 
      CHECK (status IN ('online', 'idle', 'dnd', 'invisible'));
  END IF;

  -- Profile theme check
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profile_theme_valid'
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT profile_theme_valid 
      CHECK (profile_theme IN ('default', 'gradient', 'dark', 'custom'));
  END IF;

  -- Profile visibility check
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profile_visibility_valid'
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT profile_visibility_valid 
      CHECK (profile_visibility IN ('public', 'friends', 'private'));
  END IF;

  -- Tier check
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tier_valid'
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT tier_valid 
      CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum', 'diamond'));
  END IF;
END $$;

-- Create or replace function to generate referral codes
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INT;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::INT, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Create or replace function to handle new user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, referral_code, token_balance, total_earned, signup_bonus_claimed)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    generate_referral_code(),
    100,
    100,
    TRUE
  )
  ON CONFLICT (id) DO NOTHING;
  
  -- Create signup bonus transaction
  INSERT INTO public.transactions (user_id, amount, type, description)
  VALUES (NEW.id, 100, 'signup_bonus', 'Welcome bonus for signing up!')
  ON CONFLICT DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger for new user signups
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.profiles TO anon, authenticated;
GRANT ALL ON public.transactions TO authenticated;

-- Enable RLS if not already enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Recreate RLS policies for profiles
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Recreate RLS policies for transactions
DROP POLICY IF EXISTS "Users can view own transactions" ON transactions;
CREATE POLICY "Users can view own transactions"
  ON transactions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own transactions" ON transactions;
CREATE POLICY "Users can insert own transactions"
  ON transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Verify the setup
SELECT 
  'Profiles table columns:' as info,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'profiles'
ORDER BY ordinal_position;

