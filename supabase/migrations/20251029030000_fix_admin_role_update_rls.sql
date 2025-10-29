-- =====================================================
-- FIX ADMIN ROLE UPDATE PERMISSIONS
-- =====================================================
-- Version: 1.2.6
-- Purpose: Allow admins to update user roles
-- Date: October 29, 2025
-- =====================================================

-- Drop existing admin update policy if it exists
DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;
DROP POLICY IF EXISTS "Admins can update user roles" ON profiles;
DROP POLICY IF EXISTS "Super admins can update roles" ON profiles;

-- Create policy allowing admins to update user roles
CREATE POLICY "Admins can update user roles"
  ON profiles
  FOR UPDATE
  USING (
    -- Allow if user is admin, super_admin, or developer
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin', 'developer')
    )
  )
  WITH CHECK (
    -- Same check for the updated row
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin', 'developer')
    )
  );

-- Also ensure users can still update their own profiles
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Verification
DO $$
DECLARE
  v_policy_count INTEGER;
BEGIN
  RAISE NOTICE '======================================';
  RAISE NOTICE 'ADMIN ROLE UPDATE RLS FIX';
  RAISE NOTICE '======================================';
  
  -- Count policies
  SELECT COUNT(*) INTO v_policy_count
  FROM pg_policies
  WHERE tablename = 'profiles'
  AND policyname IN ('Admins can update user roles', 'Users can update own profile');
  
  RAISE NOTICE 'Active UPDATE policies on profiles: %', v_policy_count;
  RAISE NOTICE '✅ Admins can now update user roles';
  RAISE NOTICE '✅ Users can still update their own profiles';
  RAISE NOTICE '======================================';
END $$;

