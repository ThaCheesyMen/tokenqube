-- Clean up duplicate call_signals policies
-- Keep only the new comprehensive policies

-- Drop OLD policies (we'll keep the new ones: call_signals_select_policy, call_signals_insert_policy, call_signals_delete_policy)
DROP POLICY IF EXISTS "Users can delete their own call signals" ON call_signals;
DROP POLICY IF EXISTS "Users can read call signals for their rooms" ON call_signals;
DROP POLICY IF EXISTS "Users can send call signals" ON call_signals;

-- Verify only 3 policies remain (the new comprehensive ones)
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd
FROM pg_policies 
WHERE tablename = 'call_signals'
ORDER BY policyname;

-- Expected result:
-- call_signals_delete_policy (DELETE)
-- call_signals_insert_policy (INSERT)
-- call_signals_select_policy (SELECT)

