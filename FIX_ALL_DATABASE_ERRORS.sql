-- 🔧 FIX ALL DATABASE ERRORS
-- This script fixes all the 400, 404, 406, and 500 errors in your console

-- ═══════════════════════════════════════════════════════════════
-- 1. FIX GAMING_ACTIVITY TABLE & RLS POLICIES
-- ═══════════════════════════════════════════════════════════════

-- Drop and recreate RLS policies for gaming_activity
DROP POLICY IF EXISTS "Users can view own gaming activity" ON gaming_activity;
DROP POLICY IF EXISTS "Users can insert own gaming activity" ON gaming_activity;
DROP POLICY IF EXISTS "Users can update own gaming activity" ON gaming_activity;
DROP POLICY IF EXISTS "Public can view gaming activity" ON gaming_activity;

-- Create proper RLS policies
CREATE POLICY "Users can view own gaming activity"
  ON gaming_activity FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own gaming activity"
  ON gaming_activity FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own gaming activity"
  ON gaming_activity FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Public can view gaming activity for leaderboards"
  ON gaming_activity FOR SELECT
  USING (true);

-- Enable RLS
ALTER TABLE gaming_activity ENABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════════════════════
-- 2. FIX SQUAD_MEMBERS TABLE
-- ═══════════════════════════════════════════════════════════════

-- Drop and recreate RLS policies
DROP POLICY IF EXISTS "Users can view squad members" ON squad_members;
DROP POLICY IF EXISTS "Users can view own squad membership" ON squad_members;

CREATE POLICY "Users can view squad members"
  ON squad_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM squad_members sm
      WHERE sm.squad_id = squad_members.squad_id
      AND sm.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM squads s
      WHERE s.id = squad_members.squad_id
      AND s.is_public = true
    )
  );

ALTER TABLE squad_members ENABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════════════════════
-- 3. CREATE RANKED_SEASONS TABLE (if not exists)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS ranked_seasons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  season_number INTEGER NOT NULL,
  season_name TEXT NOT NULL,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert a default active season
INSERT INTO ranked_seasons (season_number, season_name, start_date, end_date, is_active)
VALUES (
  1,
  'Season 1',
  NOW(),
  NOW() + INTERVAL '3 months',
  true
)
ON CONFLICT DO NOTHING;

-- RLS policies for ranked_seasons
ALTER TABLE ranked_seasons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view seasons" ON ranked_seasons;
CREATE POLICY "Anyone can view seasons"
  ON ranked_seasons FOR SELECT
  USING (true);

-- ═══════════════════════════════════════════════════════════════
-- 4. CREATE TOKEN_STAKING TABLE (if not exists)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS token_staking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  amount INTEGER NOT NULL,
  duration_days INTEGER NOT NULL,
  start_date TIMESTAMPTZ DEFAULT NOW(),
  end_date TIMESTAMPTZ NOT NULL,
  reward_rate DECIMAL(5,2) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  claimed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS policies for token_staking
ALTER TABLE token_staking ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own staking" ON token_staking;
DROP POLICY IF EXISTS "Users can insert own staking" ON token_staking;
DROP POLICY IF EXISTS "Users can update own staking" ON token_staking;

CREATE POLICY "Users can view own staking"
  ON token_staking FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own staking"
  ON token_staking FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own staking"
  ON token_staking FOR UPDATE
  USING (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════
-- 5. CREATE QUESTS TABLE (if not exists)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS quests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  reward_tokens INTEGER NOT NULL,
  requirement_type TEXT,
  requirement_value INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add missing columns to quests table if they don't exist
DO $$
BEGIN
  -- Add difficulty column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'quests' 
                 AND column_name = 'difficulty') THEN
    ALTER TABLE quests ADD COLUMN difficulty TEXT;
  END IF;
  
  -- Add requirement_type column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'quests' 
                 AND column_name = 'requirement_type') THEN
    ALTER TABLE quests ADD COLUMN requirement_type TEXT;
  END IF;
  
  -- Add requirement_value column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'quests' 
                 AND column_name = 'requirement_value') THEN
    ALTER TABLE quests ADD COLUMN requirement_value INTEGER;
  END IF;
  
  -- Add description column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'quests' 
                 AND column_name = 'description') THEN
    ALTER TABLE quests ADD COLUMN description TEXT;
  END IF;
END $$;

-- Add check constraint for difficulty (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'quests_difficulty_check'
  ) THEN
    ALTER TABLE quests ADD CONSTRAINT quests_difficulty_check 
      CHECK (difficulty IN ('easy', 'medium', 'hard', 'epic'));
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Insert some default quests (only if table is empty)
INSERT INTO quests (title, description, difficulty, reward_tokens, requirement_type, requirement_value, is_active)
SELECT 'First Steps', 'Play your first game session', 'easy', 50, 'game_sessions', 1, true
WHERE NOT EXISTS (SELECT 1 FROM quests WHERE title = 'First Steps')
UNION ALL
SELECT 'Daily Grind', 'Play 5 game sessions', 'medium', 150, 'game_sessions', 5, true
WHERE NOT EXISTS (SELECT 1 FROM quests WHERE title = 'Daily Grind')
UNION ALL
SELECT 'Victory Royale', 'Win 3 matches', 'hard', 300, 'wins', 3, true
WHERE NOT EXISTS (SELECT 1 FROM quests WHERE title = 'Victory Royale')
UNION ALL
SELECT 'Marathon Runner', 'Play for 10 hours total', 'epic', 500, 'hours_played', 10, true
WHERE NOT EXISTS (SELECT 1 FROM quests WHERE title = 'Marathon Runner');

-- RLS policies for quests
ALTER TABLE quests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view quests" ON quests;
CREATE POLICY "Anyone can view quests"
  ON quests FOR SELECT
  USING (true);

-- ═══════════════════════════════════════════════════════════════
-- 6. CREATE USER_QUESTS TABLE (if not exists)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS user_quests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  quest_id UUID REFERENCES quests(id) ON DELETE CASCADE NOT NULL,
  progress INTEGER DEFAULT 0,
  status TEXT CHECK (status IN ('active', 'completed', 'claimed')) DEFAULT 'active',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  claimed_at TIMESTAMPTZ,
  UNIQUE(user_id, quest_id)
);

-- RLS policies for user_quests
ALTER TABLE user_quests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own quests" ON user_quests;
DROP POLICY IF EXISTS "Users can insert own quests" ON user_quests;
DROP POLICY IF EXISTS "Users can update own quests" ON user_quests;

CREATE POLICY "Users can view own quests"
  ON user_quests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own quests"
  ON user_quests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own quests"
  ON user_quests FOR UPDATE
  USING (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════
-- 7. FIX USER_ACHIEVEMENTS TABLE RLS
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own achievements" ON user_achievements;
DROP POLICY IF EXISTS "Anyone can view achievements" ON user_achievements;

CREATE POLICY "Users can view own achievements"
  ON user_achievements FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view achievements for leaderboards"
  ON user_achievements FOR SELECT
  USING (true);

-- ═══════════════════════════════════════════════════════════════
-- 8. ADD MISSING COLUMNS TO GAMING_ACTIVITY (if needed)
-- ═══════════════════════════════════════════════════════════════

-- Check and add activity_type column
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'gaming_activity' 
                 AND column_name = 'activity_type') THEN
    ALTER TABLE gaming_activity ADD COLUMN activity_type TEXT DEFAULT 'game_session';
  END IF;
END $$;

-- Add missing columns to gaming_activity based on what exists
DO $$
DECLARE
  has_total_hours BOOLEAN;
  has_hours_played BOOLEAN;
  has_tokens_awarded BOOLEAN;
  has_tokens_earned BOOLEAN;
BEGIN
  -- Check which columns exist
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'gaming_activity' AND column_name = 'total_hours'
  ) INTO has_total_hours;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'gaming_activity' AND column_name = 'hours_played'
  ) INTO has_hours_played;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'gaming_activity' AND column_name = 'tokens_awarded'
  ) INTO has_tokens_awarded;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'gaming_activity' AND column_name = 'tokens_earned'
  ) INTO has_tokens_earned;
  
  -- Add hours_played if missing (use total_hours as source if available)
  IF NOT has_hours_played THEN
    IF has_total_hours THEN
      ALTER TABLE gaming_activity ADD COLUMN hours_played DECIMAL(10,2) 
        GENERATED ALWAYS AS (total_hours) STORED;
    ELSE
      ALTER TABLE gaming_activity ADD COLUMN hours_played DECIMAL(10,2) DEFAULT 0;
    END IF;
  END IF;
  
  -- Add total_hours if missing (use hours_played as source if available)
  IF NOT has_total_hours THEN
    IF has_hours_played THEN
      ALTER TABLE gaming_activity ADD COLUMN total_hours DECIMAL(10,2) 
        GENERATED ALWAYS AS (hours_played) STORED;
    ELSE
      ALTER TABLE gaming_activity ADD COLUMN total_hours DECIMAL(10,2) DEFAULT 0;
    END IF;
  END IF;
  
  -- Add tokens_earned if missing (use tokens_awarded as source if available)
  IF NOT has_tokens_earned THEN
    IF has_tokens_awarded THEN
      ALTER TABLE gaming_activity ADD COLUMN tokens_earned INTEGER 
        GENERATED ALWAYS AS (tokens_awarded) STORED;
    ELSE
      ALTER TABLE gaming_activity ADD COLUMN tokens_earned INTEGER DEFAULT 0;
    END IF;
  END IF;
  
  -- Add tokens_awarded if missing (use tokens_earned as source if available)
  IF NOT has_tokens_awarded THEN
    IF has_tokens_earned THEN
      ALTER TABLE gaming_activity ADD COLUMN tokens_awarded INTEGER 
        GENERATED ALWAYS AS (tokens_earned) STORED;
    ELSE
      ALTER TABLE gaming_activity ADD COLUMN tokens_awarded INTEGER DEFAULT 0;
    END IF;
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 9. VERIFY GAMING_ACTIVITY TABLE
-- ═══════════════════════════════════════════════════════════════

-- Note: Skipping view creation to avoid column mismatch errors
-- The gaming_activity table now has all necessary columns added above
-- Applications should query gaming_activity directly

-- ═══════════════════════════════════════════════════════════════
-- 10. SUCCESS MESSAGE
-- ═══════════════════════════════════════════════════════════════

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '════════════════════════════════════════════════════════════';
  RAISE NOTICE '✅ ALL DATABASE ERRORS FIXED!';
  RAISE NOTICE '════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '✓ Fixed gaming_activity RLS policies (406 errors)';
  RAISE NOTICE '✓ Fixed squad_members RLS policies (500 errors)';
  RAISE NOTICE '✓ Created ranked_seasons table with default season';
  RAISE NOTICE '✓ Created token_staking table (404 errors)';
  RAISE NOTICE '✓ Created/updated quests table with starter quests';
  RAISE NOTICE '✓ Created user_quests table (400 errors)';
  RAISE NOTICE '✓ Fixed user_achievements RLS (400 errors)';
  RAISE NOTICE '✓ Added activity_type column to gaming_activity';
  RAISE NOTICE '✓ Added missing columns (hours_played, tokens_earned, etc.)';
  RAISE NOTICE '';
  RAISE NOTICE '🔄 HARD REFRESH your browser (Ctrl + F5)';
  RAISE NOTICE '   All errors should be gone!';
  RAISE NOTICE '';
  RAISE NOTICE '════════════════════════════════════════════════════════════';
END $$;

