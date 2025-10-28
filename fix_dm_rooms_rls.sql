-- Fix RLS policies for dm_rooms table
-- This resolves the 406 "Not Acceptable" errors

-- Enable RLS
ALTER TABLE dm_rooms ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own DM rooms" ON dm_rooms;
DROP POLICY IF EXISTS "Users can create DM rooms" ON dm_rooms;
DROP POLICY IF EXISTS "dm_rooms_select_policy" ON dm_rooms;
DROP POLICY IF EXISTS "dm_rooms_insert_policy" ON dm_rooms;

-- Create comprehensive select policy
-- Users can see rooms where they are either user1 or user2
CREATE POLICY "dm_rooms_select_policy"
ON dm_rooms
FOR SELECT
USING (
  auth.uid() = user1_id OR auth.uid() = user2_id
);

-- Create insert policy
-- Users can create rooms if they are user1 or user2
CREATE POLICY "dm_rooms_insert_policy"
ON dm_rooms
FOR INSERT
WITH CHECK (
  auth.uid() = user1_id OR auth.uid() = user2_id
);

-- Verify policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'dm_rooms'
ORDER BY policyname;

-- Test query (should work now)
-- SELECT id FROM dm_rooms WHERE user1_id = 'some-uuid' AND user2_id = 'another-uuid';

