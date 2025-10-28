-- Fix RLS policies for call_signals table
-- This fixes the 406 (Not Acceptable) error

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view call signals for their calls" ON call_signals;
DROP POLICY IF EXISTS "Users can insert call signals for their calls" ON call_signals;
DROP POLICY IF EXISTS "Users can delete call signals for their calls" ON call_signals;
DROP POLICY IF EXISTS "Users can read call signals for their rooms" ON call_signals;
DROP POLICY IF EXISTS "Users can send call signals" ON call_signals;
DROP POLICY IF EXISTS "Users can delete their own call signals" ON call_signals;

-- Enable RLS on call_signals
ALTER TABLE call_signals ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can view signals for DM rooms they're part of
CREATE POLICY "Users can read call signals for their rooms"
ON call_signals
FOR SELECT
TO authenticated
USING (
  -- Check if user is part of the DM room
  EXISTS (
    SELECT 1 FROM dm_rooms
    WHERE (
      (dm_rooms.user1_id = auth.uid() OR dm_rooms.user2_id = auth.uid())
      AND dm_rooms.id::text = call_signals.room_id
    )
  )
  OR call_signals.room_id LIKE 'party_%'
  OR auth.uid() = sender_id
);

-- Policy 2: Users can insert signals for their calls
CREATE POLICY "Users can send call signals"
ON call_signals
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = sender_id);

-- Policy 3: Users can delete signals from their DM rooms
CREATE POLICY "Users can delete their own call signals"
ON call_signals
FOR DELETE
TO authenticated
USING (
  auth.uid() = sender_id 
  OR room_id IN (
    SELECT id::text FROM dm_rooms 
    WHERE user1_id = auth.uid() OR user2_id = auth.uid()
  )
);

-- Enable realtime for call_signals (if not already enabled)
DO $$ 
BEGIN
  -- Check if table is already in publication
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'call_signals'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE call_signals;
  END IF;
END $$;

-- Verify the policies
SELECT 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd, 
  qual 
FROM pg_policies 
WHERE tablename = 'call_signals';

SELECT 'Call signals RLS policies fixed!' as status;

