-- Enable Realtime for chat_messages table
-- Run this in Supabase SQL Editor

-- Enable realtime for chat_messages table
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;

-- Verify realtime is enabled
SELECT 
  schemaname, 
  tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';

-- Expected output should include chat_messages table
