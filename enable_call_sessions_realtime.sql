-- Enable realtime for call_sessions table
-- This allows both users to see when the call is ended

-- Add call_sessions to realtime publication (if not already added)
DO $$ 
BEGIN
  -- Check if already in publication
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'call_sessions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE call_sessions;
    RAISE NOTICE 'Added call_sessions to realtime publication';
  ELSE
    RAISE NOTICE 'call_sessions already in realtime publication';
  END IF;
END $$;

-- Verify it's in the publication
SELECT 
  schemaname,
  tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
  AND tablename IN ('call_sessions', 'call_signals')
ORDER BY tablename;

