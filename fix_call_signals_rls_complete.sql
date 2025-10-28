-- Complete fix for call_signals RLS
-- This ensures BOTH users in a call can see each other's signals

-- Enable RLS
ALTER TABLE call_signals ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view signals in their calls" ON call_signals;
DROP POLICY IF EXISTS "Users can create call signals" ON call_signals;
DROP POLICY IF EXISTS "call_signals_select_policy" ON call_signals;
DROP POLICY IF EXISTS "call_signals_insert_policy" ON call_signals;
DROP POLICY IF EXISTS "call_signals_delete_policy" ON call_signals;

-- Create comprehensive SELECT policy
-- Users can see signals if they are in the call (either in dm_rooms or call_sessions)
CREATE POLICY "call_signals_select_policy"
ON call_signals
FOR SELECT
USING (
  -- User can see signals in a DM room where they are a participant
  EXISTS (
    SELECT 1 FROM dm_rooms
    WHERE dm_rooms.id::text = call_signals.room_id
      AND (dm_rooms.user1_id = auth.uid() OR dm_rooms.user2_id = auth.uid())
  )
  OR
  -- User can see signals in a call session where they are caller or receiver
  EXISTS (
    SELECT 1 FROM call_sessions
    WHERE call_sessions.room_id = call_signals.room_id
      AND (call_sessions.caller_id = auth.uid() OR call_sessions.receiver_id = auth.uid())
  )
);

-- Create INSERT policy
-- Users can create signals in their calls
CREATE POLICY "call_signals_insert_policy"
ON call_signals
FOR INSERT
WITH CHECK (
  -- User can insert if they are the sender
  sender_id = auth.uid()
  AND
  -- And they are in the call
  (
    EXISTS (
      SELECT 1 FROM dm_rooms
      WHERE dm_rooms.id::text = call_signals.room_id
        AND (dm_rooms.user1_id = auth.uid() OR dm_rooms.user2_id = auth.uid())
    )
    OR
    EXISTS (
      SELECT 1 FROM call_sessions
      WHERE call_sessions.room_id = call_signals.room_id
        AND (call_sessions.caller_id = auth.uid() OR call_sessions.receiver_id = auth.uid())
    )
  )
);

-- Create DELETE policy
-- Users can delete their own signals or signals in their rooms
CREATE POLICY "call_signals_delete_policy"
ON call_signals
FOR DELETE
USING (
  sender_id = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM dm_rooms
    WHERE dm_rooms.id::text = call_signals.room_id
      AND (dm_rooms.user1_id = auth.uid() OR dm_rooms.user2_id = auth.uid())
  )
);

-- Ensure call_signals is in realtime publication
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'call_signals'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE call_signals;
    RAISE NOTICE 'Added call_signals to realtime publication';
  ELSE
    RAISE NOTICE 'call_signals already in realtime publication';
  END IF;
END $$;

-- Verify policies
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  CASE 
    WHEN qual IS NOT NULL THEN 'USING: ' || qual::text
    ELSE ''
  END as using_clause,
  CASE 
    WHEN with_check IS NOT NULL THEN 'WITH CHECK: ' || with_check::text
    ELSE ''
  END as with_check_clause
FROM pg_policies 
WHERE tablename = 'call_signals'
ORDER BY policyname;

-- Test query (should work for both users in a call)
-- SELECT * FROM call_signals WHERE room_id = 'some-room-id';

