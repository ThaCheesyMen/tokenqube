-- Fix Profile page database errors
-- Adds missing columns and RLS policies

-- 1. Add game_name to user_achievements (it's fetching from achievement, not storing it)
-- Actually, we should JOIN with user_games or steam_achievements to get game_name
-- Let's create a view instead

-- 2. Enable RLS for active_gaming_sessions (406 error = RLS blocking)
ALTER TABLE active_gaming_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own gaming sessions" ON active_gaming_sessions;
DROP POLICY IF EXISTS "Users can insert their own gaming sessions" ON active_gaming_sessions;
DROP POLICY IF EXISTS "Users can update their own gaming sessions" ON active_gaming_sessions;

CREATE POLICY "Users can view their own gaming sessions"
ON active_gaming_sessions
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own gaming sessions"
ON active_gaming_sessions
FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own gaming sessions"
ON active_gaming_sessions
FOR UPDATE
USING (user_id = auth.uid());

-- 3. Fix user_badges query (it's trying to join with profile_badges)
-- The issue is the nested relation syntax
-- Make sure profile_badges foreign key exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'user_badges_badge_id_fkey'
  ) THEN
    ALTER TABLE user_badges 
    ADD CONSTRAINT user_badges_badge_id_fkey 
    FOREIGN KEY (badge_id) REFERENCES profile_badges(id);
  END IF;
END $$;

-- Verify
SELECT 
  'active_gaming_sessions' as table_name,
  COUNT(*) as policy_count
FROM pg_policies 
WHERE tablename = 'active_gaming_sessions'
UNION ALL
SELECT 
  'user_badges' as table_name,
  COUNT(*) as policy_count
FROM pg_policies 
WHERE tablename = 'user_badges';

