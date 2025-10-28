-- Global Chat Messages Table
CREATE TABLE IF NOT EXISTS global_chat_messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  room_id TEXT NOT NULL DEFAULT 'global',
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT content_length CHECK (char_length(content) <= 500)
);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_global_chat_messages_room_id ON global_chat_messages(room_id);
CREATE INDEX IF NOT EXISTS idx_global_chat_messages_created_at ON global_chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_global_chat_messages_sender_id ON global_chat_messages(sender_id);

-- Enable RLS
ALTER TABLE global_chat_messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read global chat messages" ON global_chat_messages;
DROP POLICY IF EXISTS "Users can send global chat messages" ON global_chat_messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON global_chat_messages;
DROP POLICY IF EXISTS "Users can delete their own messages" ON global_chat_messages;

-- RLS Policies
CREATE POLICY "Users can read global chat messages"
  ON global_chat_messages FOR SELECT
  USING (true);

CREATE POLICY "Users can send global chat messages"
  ON global_chat_messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update their own messages"
  ON global_chat_messages FOR UPDATE
  USING (auth.uid() = sender_id)
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can delete their own messages"
  ON global_chat_messages FOR DELETE
  USING (auth.uid() = sender_id);

-- Function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_global_chat_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_global_chat_messages_updated_at ON global_chat_messages;
CREATE TRIGGER update_global_chat_messages_updated_at
  BEFORE UPDATE ON global_chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_global_chat_updated_at();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE global_chat_messages;

