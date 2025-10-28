-- ===================================
-- SIMPLE FIX: Add Missing Columns Only
-- Run this first if you keep hitting column errors
-- ===================================

BEGIN;

-- Add missing profile columns
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS total_tokens BIGINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS custom_status TEXT,
  ADD COLUMN IF NOT EXISTS status_emoji TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'online',
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS banner_url TEXT,
  ADD COLUMN IF NOT EXISTS accent_color TEXT,
  ADD COLUMN IF NOT EXISTS profile_theme TEXT DEFAULT 'default',
  ADD COLUMN IF NOT EXISTS profile_visibility TEXT DEFAULT 'public',
  ADD COLUMN IF NOT EXISTS show_email BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS show_games BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS show_activity BOOLEAN DEFAULT TRUE;

-- Update nulls
UPDATE profiles SET total_tokens = 0 WHERE total_tokens IS NULL;
UPDATE profiles SET status = 'online' WHERE status IS NULL;
UPDATE profiles SET profile_visibility = 'public' WHERE profile_visibility IS NULL;
UPDATE profiles SET profile_theme = 'default' WHERE profile_theme IS NULL;

-- Add viewed column to achievement_unlocks if table exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'achievement_unlocks'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'achievement_unlocks' AND column_name = 'viewed'
    ) THEN
      ALTER TABLE achievement_unlocks ADD COLUMN viewed BOOLEAN DEFAULT FALSE;
    END IF;
  END IF;
END $$;

COMMIT;

SELECT '✅ Missing columns added!' AS result;

