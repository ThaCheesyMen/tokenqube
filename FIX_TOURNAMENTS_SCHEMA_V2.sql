-- Fix tournaments table schema - Version 2 (handles both columns existing)
-- Run this in Supabase SQL Editor BEFORE running CREATE_OFFICIAL_TOURNAMENTS.sql

-- Step 1: Add is_official column if it doesn't exist
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tournaments' AND column_name = 'is_official'
  ) THEN
    ALTER TABLE tournaments ADD COLUMN is_official BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- Step 2: Handle column migrations (drop old columns if new ones exist)
DO $$ 
BEGIN
  -- If BOTH start_date and tournament_start exist, drop start_date
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tournaments' AND column_name = 'start_date'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tournaments' AND column_name = 'tournament_start'
  ) THEN
    -- Copy data from tournament_start to start_date if start_date is null
    UPDATE tournaments 
    SET start_date = tournament_start 
    WHERE start_date IS NULL AND tournament_start IS NOT NULL;
    
    -- Drop the constraint if it exists
    ALTER TABLE tournaments ALTER COLUMN start_date DROP NOT NULL;
    -- Don't drop the column yet, just make it nullable
  END IF;
  
  -- If BOTH registration_deadline and registration_end exist, make registration_deadline nullable
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tournaments' AND column_name = 'registration_deadline'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tournaments' AND column_name = 'registration_end'
  ) THEN
    ALTER TABLE tournaments ALTER COLUMN registration_deadline DROP NOT NULL;
  END IF;
  
  -- If BOTH created_by and organizer_id exist, make created_by nullable
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tournaments' AND column_name = 'created_by'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tournaments' AND column_name = 'organizer_id'
  ) THEN
    ALTER TABLE tournaments ALTER COLUMN created_by DROP NOT NULL;
  END IF;
END $$;

-- Step 3: Add missing columns if they don't exist
DO $$ 
BEGIN
  -- Add platform column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tournaments' AND column_name = 'platform'
  ) THEN
    ALTER TABLE tournaments ADD COLUMN platform TEXT DEFAULT 'PC';
  END IF;
  
  -- Add registration_start column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tournaments' AND column_name = 'registration_start'
  ) THEN
    ALTER TABLE tournaments ADD COLUMN registration_start TIMESTAMPTZ DEFAULT NOW();
  END IF;
  
  -- Add registration_end column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tournaments' AND column_name = 'registration_end'
  ) THEN
    ALTER TABLE tournaments ADD COLUMN registration_end TIMESTAMPTZ;
  END IF;
  
  -- Add tournament_start column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tournaments' AND column_name = 'tournament_start'
  ) THEN
    ALTER TABLE tournaments ADD COLUMN tournament_start TIMESTAMPTZ;
  END IF;
  
  -- Add tournament_name column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tournaments' AND column_name = 'tournament_name'
  ) THEN
    ALTER TABLE tournaments ADD COLUMN tournament_name TEXT;
  END IF;
  
  -- Add tournament_type column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tournaments' AND column_name = 'tournament_type'
  ) THEN
    ALTER TABLE tournaments ADD COLUMN tournament_type TEXT;
  END IF;
  
  -- Add entry_fee column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tournaments' AND column_name = 'entry_fee'
  ) THEN
    ALTER TABLE tournaments ADD COLUMN entry_fee INTEGER DEFAULT 0;
  END IF;
  
  -- Add prize_pool column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tournaments' AND column_name = 'prize_pool'
  ) THEN
    ALTER TABLE tournaments ADD COLUMN prize_pool INTEGER DEFAULT 0;
  END IF;
  
  -- Add organizer_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tournaments' AND column_name = 'organizer_id'
  ) THEN
    ALTER TABLE tournaments ADD COLUMN organizer_id UUID;
  END IF;
  
  -- Add rules column if it doesn't exist (as TEXT)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tournaments' AND column_name = 'rules'
  ) THEN
    ALTER TABLE tournaments ADD COLUMN rules TEXT;
  END IF;
END $$;

-- Step 4: Convert rules from JSONB to TEXT if needed
DO $$
BEGIN
  -- Check if rules column is JSONB
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tournaments' 
    AND column_name = 'rules' 
    AND data_type = 'jsonb'
  ) THEN
    -- Create a temporary column for text rules
    ALTER TABLE tournaments ADD COLUMN rules_text TEXT;
    
    -- Convert JSONB rules to text
    UPDATE tournaments 
    SET rules_text = COALESCE(rules->>'description', rules::text);
    
    -- Drop the JSONB column
    ALTER TABLE tournaments DROP COLUMN rules;
    
    -- Rename the text column to rules
    ALTER TABLE tournaments RENAME COLUMN rules_text TO rules;
  END IF;
END $$;

-- Step 5: Sync data from old columns to new columns
DO $$
BEGIN
  -- Sync name to tournament_name
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tournaments' AND column_name = 'name')
    AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tournaments' AND column_name = 'tournament_name') THEN
    UPDATE tournaments SET tournament_name = name WHERE tournament_name IS NULL;
  END IF;
  
  -- Sync format to tournament_type
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tournaments' AND column_name = 'format')
    AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tournaments' AND column_name = 'tournament_type') THEN
    UPDATE tournaments SET tournament_type = format WHERE tournament_type IS NULL;
  END IF;
  
  -- Sync entry_fee_tokens to entry_fee
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tournaments' AND column_name = 'entry_fee_tokens')
    AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tournaments' AND column_name = 'entry_fee') THEN
    UPDATE tournaments SET entry_fee = entry_fee_tokens WHERE entry_fee IS NULL OR entry_fee = 0;
  END IF;
  
  -- Sync prize_pool_tokens to prize_pool
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tournaments' AND column_name = 'prize_pool_tokens')
    AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tournaments' AND column_name = 'prize_pool') THEN
    UPDATE tournaments SET prize_pool = prize_pool_tokens WHERE prize_pool IS NULL OR prize_pool = 0;
  END IF;
  
  -- Sync start_date to tournament_start
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tournaments' AND column_name = 'start_date')
    AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tournaments' AND column_name = 'tournament_start') THEN
    UPDATE tournaments SET start_date = tournament_start WHERE start_date IS NULL AND tournament_start IS NOT NULL;
    UPDATE tournaments SET tournament_start = start_date WHERE tournament_start IS NULL AND start_date IS NOT NULL;
  END IF;
  
  -- Sync registration_deadline to registration_end
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tournaments' AND column_name = 'registration_deadline')
    AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tournaments' AND column_name = 'registration_end') THEN
    UPDATE tournaments SET registration_deadline = registration_end WHERE registration_deadline IS NULL AND registration_end IS NOT NULL;
    UPDATE tournaments SET registration_end = registration_deadline WHERE registration_end IS NULL AND registration_deadline IS NOT NULL;
  END IF;
  
  -- Sync created_by to organizer_id
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tournaments' AND column_name = 'created_by')
    AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tournaments' AND column_name = 'organizer_id') THEN
    UPDATE tournaments SET created_by = organizer_id WHERE created_by IS NULL AND organizer_id IS NOT NULL;
    UPDATE tournaments SET organizer_id = created_by WHERE organizer_id IS NULL AND created_by IS NOT NULL;
  END IF;
END $$;

-- Step 6: Create index for better performance
CREATE INDEX IF NOT EXISTS idx_tournaments_official ON tournaments(is_official, status, tournament_start);
CREATE INDEX IF NOT EXISTS idx_tournaments_game ON tournaments(game_name, is_official);
CREATE INDEX IF NOT EXISTS idx_tournaments_start_date ON tournaments(start_date);

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Tournaments table schema updated successfully!';
  RAISE NOTICE 'Now you can run CREATE_OFFICIAL_TOURNAMENTS.sql';
END $$;

