-- QUICK FIX: Make profile constraints more lenient for initial signup
-- This allows profile creation even if some fields are missing

-- Step 1: Temporarily drop the strict constraints
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS status_valid;
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profile_visibility_valid;
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profile_theme_valid;

-- Step 2: Set default values for existing NULL rows
UPDATE profiles SET status = 'online' WHERE status IS NULL;
UPDATE profiles SET profile_visibility = 'public' WHERE profile_visibility IS NULL;
UPDATE profiles SET profile_theme = 'default' WHERE profile_theme IS NULL;
UPDATE profiles SET token_balance = 0 WHERE token_balance IS NULL;
UPDATE profiles SET total_earned = 0 WHERE total_earned IS NULL;
UPDATE profiles SET total_spent = 0 WHERE total_spent IS NULL;
UPDATE profiles SET total_tokens = 0 WHERE total_tokens IS NULL;
UPDATE profiles SET total_referrals = 0 WHERE total_referrals IS NULL;

-- Step 3: Make columns have defaults
ALTER TABLE profiles ALTER COLUMN status SET DEFAULT 'online';
ALTER TABLE profiles ALTER COLUMN profile_visibility SET DEFAULT 'public';
ALTER TABLE profiles ALTER COLUMN profile_theme SET DEFAULT 'default';
ALTER TABLE profiles ALTER COLUMN token_balance SET DEFAULT 0;
ALTER TABLE profiles ALTER COLUMN total_earned SET DEFAULT 0;
ALTER TABLE profiles ALTER COLUMN total_spent SET DEFAULT 0;
ALTER TABLE profiles ALTER COLUMN total_tokens SET DEFAULT 0;
ALTER TABLE profiles ALTER COLUMN total_referrals SET DEFAULT 0;
ALTER TABLE profiles ALTER COLUMN signup_bonus_claimed SET DEFAULT false;
ALTER TABLE profiles ALTER COLUMN show_email SET DEFAULT false;
ALTER TABLE profiles ALTER COLUMN show_games SET DEFAULT true;
ALTER TABLE profiles ALTER COLUMN show_activity SET DEFAULT true;

-- Step 4: Re-add constraints (but columns now have defaults, so they won't be NULL)
ALTER TABLE profiles ADD CONSTRAINT status_valid 
  CHECK (status IN ('online', 'idle', 'dnd', 'invisible'));

ALTER TABLE profiles ADD CONSTRAINT profile_visibility_valid 
  CHECK (profile_visibility IN ('public', 'friends', 'private'));

ALTER TABLE profiles ADD CONSTRAINT profile_theme_valid 
  CHECK (profile_theme IN ('default', 'gradient', 'dark', 'custom'));

-- Done!
SELECT 'Profile constraints fixed! You can now sign up.' as status;

