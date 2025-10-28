-- Fix tournaments table schema to match expected column names
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

-- Step 2: Rename columns to match new schema
DO $$ 
BEGIN
  -- Rename 'name' to 'tournament_name' if needed
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tournaments' AND column_name = 'name'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tournaments' AND column_name = 'tournament_name'
  ) THEN
    ALTER TABLE tournaments RENAME COLUMN name TO tournament_name;
  END IF;
  
  -- Rename 'format' to 'tournament_type' if needed
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tournaments' AND column_name = 'format'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tournaments' AND column_name = 'tournament_type'
  ) THEN
    ALTER TABLE tournaments RENAME COLUMN format TO tournament_type;
  END IF;
  
  -- Rename 'entry_fee_tokens' to 'entry_fee' if needed
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tournaments' AND column_name = 'entry_fee_tokens'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tournaments' AND column_name = 'entry_fee'
  ) THEN
    ALTER TABLE tournaments RENAME COLUMN entry_fee_tokens TO entry_fee;
  END IF;
  
  -- Rename 'prize_pool_tokens' to 'prize_pool' if needed
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tournaments' AND column_name = 'prize_pool_tokens'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tournaments' AND column_name = 'prize_pool'
  ) THEN
    ALTER TABLE tournaments RENAME COLUMN prize_pool_tokens TO prize_pool;
  END IF;
  
  -- Rename 'start_date' to 'tournament_start' if needed
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tournaments' AND column_name = 'start_date'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tournaments' AND column_name = 'tournament_start'
  ) THEN
    ALTER TABLE tournaments RENAME COLUMN start_date TO tournament_start;
  END IF;
  
  -- Rename 'registration_deadline' to 'registration_end' if needed
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tournaments' AND column_name = 'registration_deadline'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tournaments' AND column_name = 'registration_end'
  ) THEN
    ALTER TABLE tournaments RENAME COLUMN registration_deadline TO registration_end;
  END IF;
  
  -- Rename 'created_by' to 'organizer_id' if needed
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tournaments' AND column_name = 'created_by'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tournaments' AND column_name = 'organizer_id'
  ) THEN
    ALTER TABLE tournaments RENAME COLUMN created_by TO organizer_id;
  END IF;
END $$;

-- Step 3: Add missing columns
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

-- Step 5: Create index for better performance
CREATE INDEX IF NOT EXISTS idx_tournaments_official ON tournaments(is_official, status, tournament_start);
CREATE INDEX IF NOT EXISTS idx_tournaments_game ON tournaments(game_name, is_official);

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Tournaments table schema updated successfully!';
  RAISE NOTICE 'Now you can run CREATE_OFFICIAL_TOURNAMENTS.sql';
END $$;

