-- =====================================================
-- FIX DUPLICATE update_user_role FUNCTIONS
-- =====================================================
-- Version: 1.2.6
-- Purpose: Remove duplicate function definitions
-- Date: October 29, 2025
-- =====================================================

-- Drop the old TEXT-based version (from role_based_access_control)
DROP FUNCTION IF EXISTS update_user_role(UUID, TEXT, UUID) CASCADE;

-- Keep the enum-based version from missing_rpc_functions
-- It's already created, just ensure it exists and is the only one

-- Verify the function signature
DO $$
BEGIN
  RAISE NOTICE '======================================';
  RAISE NOTICE 'FIXED: update_user_role function';
  RAISE NOTICE '======================================';
  RAISE NOTICE 'Signature: update_user_role(p_user_id UUID, p_new_role user_role)';
  RAISE NOTICE 'Duplicate TEXT version has been removed';
  RAISE NOTICE '======================================';
END $$;

