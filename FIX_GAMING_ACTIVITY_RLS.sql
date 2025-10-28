-- =============================================
-- Fix gaming_activity 406 errors
-- Run this in Supabase SQL Editor
-- =============================================

-- Step 1: Enable RLS on gaming_activity (if not already enabled)
ALTER TABLE gaming_activity ENABLE ROW LEVEL SECURITY;

-- Step 2: Drop ALL existing policies
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'gaming_activity' 
          AND schemaname = 'public'
    ) LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON gaming_activity';
        RAISE NOTICE 'Dropped policy: %', r.policyname;
    END LOOP;
END $$;

-- Step 3: Create fresh RLS policies
CREATE POLICY "Enable read access for authenticated users"
  ON gaming_activity FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Enable insert for authenticated users"
  ON gaming_activity FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable update for authenticated users"
  ON gaming_activity FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable delete for authenticated users"
  ON gaming_activity FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Step 4: Verify policies
DO $$
DECLARE
    policy_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE tablename = 'gaming_activity' 
      AND schemaname = 'public';
    
    RAISE NOTICE '==========================================';
    RAISE NOTICE '✅ RLS FIX COMPLETE!';
    RAISE NOTICE 'Policies on gaming_activity: %', policy_count;
    RAISE NOTICE '==========================================';
END $$;

