-- ============================================================================
-- DM (Direct Messaging) Database Setup
-- ============================================================================
-- This script creates the tables and functions needed for direct messaging
-- functionality. Run this in your Supabase SQL Editor.
--
-- What this creates:
--   - dm_rooms table: Stores DM conversations between users
--   - dm_messages table: Stores individual DM messages
--   - RLS policies: Ensures users can only see their own messages
--   - RPC function: get_or_create_dm_room() for getting/creating DM rooms
--   - Triggers: Auto-updates timestamp when messages are sent
--   - Realtime subscriptions: For live message updates
-- ============================================================================

-- Create DM Rooms table
CREATE TABLE IF NOT EXISTS dm_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  user2_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  last_message_at timestamptz,
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW(),
  UNIQUE(user1_id, user2_id)
);

-- Create DM Messages table
CREATE TABLE IF NOT EXISTS dm_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid REFERENCES dm_rooms(id) ON DELETE CASCADE NOT NULL,
  sender_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  message text NOT NULL,
  created_at timestamptz DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_dm_rooms_user1 ON dm_rooms(user1_id);
CREATE INDEX IF NOT EXISTS idx_dm_rooms_user2 ON dm_rooms(user2_id);
CREATE INDEX IF NOT EXISTS idx_dm_rooms_last_message ON dm_rooms(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_dm_messages_room ON dm_messages(room_id);
CREATE INDEX IF NOT EXISTS idx_dm_messages_sender ON dm_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_dm_messages_created ON dm_messages(created_at DESC);

-- Enable RLS
ALTER TABLE dm_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE dm_messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Users can view their DM rooms" ON dm_rooms;
  DROP POLICY IF EXISTS "Users can insert their DM rooms" ON dm_rooms;
  DROP POLICY IF EXISTS "Users can update their DM rooms" ON dm_rooms;
  DROP POLICY IF EXISTS "Users can view messages in their DM rooms" ON dm_messages;
  DROP POLICY IF EXISTS "Users can insert messages in their DM rooms" ON dm_messages;
END $$;

-- RLS Policies for dm_rooms
CREATE POLICY "Users can view their DM rooms"
  ON dm_rooms FOR SELECT
  TO authenticated
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "Users can insert their DM rooms"
  ON dm_rooms FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "Users can update their DM rooms"
  ON dm_rooms FOR UPDATE
  TO authenticated
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- RLS Policies for dm_messages
-- Use a simpler approach: check if the user is part of the room
CREATE POLICY "Users can view messages in their DM rooms"
  ON dm_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM dm_rooms 
      WHERE dm_rooms.id = dm_messages.room_id 
      AND (dm_rooms.user1_id = auth.uid() OR dm_rooms.user2_id = auth.uid())
    )
  );

CREATE POLICY "Users can insert messages in their DM rooms"
  ON dm_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM dm_rooms 
      WHERE dm_rooms.id = dm_messages.room_id 
      AND (dm_rooms.user1_id = auth.uid() OR dm_rooms.user2_id = auth.uid())
    )
  );

-- Function to get or create DM room between two users
CREATE OR REPLACE FUNCTION get_or_create_dm_room(p_user1_id uuid, p_user2_id uuid)
RETURNS uuid AS $$
DECLARE
  v_room_id uuid;
  v_user1 uuid;
  v_user2 uuid;
BEGIN
  -- Ensure user1_id < user2_id for consistency
  IF p_user1_id < p_user2_id THEN
    v_user1 := p_user1_id;
    v_user2 := p_user2_id;
  ELSE
    v_user1 := p_user2_id;
    v_user2 := p_user1_id;
  END IF;
  
  -- Try to find existing room
  SELECT id INTO v_room_id
  FROM dm_rooms
  WHERE user1_id = v_user1 AND user2_id = v_user2;
  
  -- If room doesn't exist, create it
  IF v_room_id IS NULL THEN
    INSERT INTO dm_rooms (user1_id, user2_id)
    VALUES (v_user1, v_user2)
    RETURNING id INTO v_room_id;
  END IF;
  
  RETURN v_room_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update last_message_at on dm_rooms
CREATE OR REPLACE FUNCTION update_dm_room_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE dm_rooms
  SET last_message_at = NEW.created_at,
      updated_at = NOW()
  WHERE id = NEW.room_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_dm_room_on_message ON dm_messages;

-- Trigger to update last_message_at when a message is inserted
CREATE TRIGGER update_dm_room_on_message
  AFTER INSERT ON dm_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_dm_room_timestamp();

-- Enable Realtime for dm_rooms and dm_messages (ignore if already added)
DO $$ 
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE dm_rooms;
EXCEPTION 
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ 
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE dm_messages;
EXCEPTION 
  WHEN duplicate_object THEN NULL;
END $$;
