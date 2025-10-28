-- Fix Chat and Parties System
-- This migration creates missing tables and fixes foreign key references

-- ============================================================================
-- CHAT MESSAGES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  edited_at TIMESTAMPTZ,
  reply_to_message_id UUID REFERENCES chat_messages(id) ON DELETE SET NULL,
  is_pinned BOOLEAN DEFAULT FALSE,
  attachments JSONB DEFAULT '[]'::jsonb
);

-- Enable RLS
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chat_messages
DROP POLICY IF EXISTS "Anyone can read global chat" ON chat_messages;
CREATE POLICY "Anyone can read global chat"
  ON chat_messages FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can send messages" ON chat_messages;
CREATE POLICY "Users can send messages"
  ON chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can edit own messages" ON chat_messages;
CREATE POLICY "Users can edit own messages"
  ON chat_messages FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own messages" ON chat_messages;
CREATE POLICY "Users can delete own messages"
  ON chat_messages FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id);

-- ============================================================================
-- DM ROOMS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS dm_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user2_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user1_id, user2_id),
  CHECK (user1_id < user2_id)
);

-- Enable RLS
ALTER TABLE dm_rooms ENABLE ROW LEVEL SECURITY;

-- RLS Policies for dm_rooms
DROP POLICY IF EXISTS "Users can view their DM rooms" ON dm_rooms;
CREATE POLICY "Users can view their DM rooms"
  ON dm_rooms FOR SELECT
  TO authenticated
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);

DROP POLICY IF EXISTS "Users can create DM rooms" ON dm_rooms;
CREATE POLICY "Users can create DM rooms"
  ON dm_rooms FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Create index
CREATE INDEX IF NOT EXISTS idx_dm_rooms_user1 ON dm_rooms(user1_id);
CREATE INDEX IF NOT EXISTS idx_dm_rooms_user2 ON dm_rooms(user2_id);

-- ============================================================================
-- DM MESSAGES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS dm_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES dm_rooms(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  edited_at TIMESTAMPTZ,
  reply_to_message_id UUID REFERENCES dm_messages(id) ON DELETE SET NULL,
  is_pinned BOOLEAN DEFAULT FALSE,
  attachments JSONB DEFAULT '[]'::jsonb
);

-- Enable RLS
ALTER TABLE dm_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for dm_messages
DROP POLICY IF EXISTS "Users can read their DM messages" ON dm_messages;
CREATE POLICY "Users can read their DM messages"
  ON dm_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM dm_rooms
      WHERE dm_rooms.id = dm_messages.room_id
      AND (dm_rooms.user1_id = auth.uid() OR dm_rooms.user2_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can send DM messages" ON dm_messages;
CREATE POLICY "Users can send DM messages"
  ON dm_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM dm_rooms
      WHERE dm_rooms.id = dm_messages.room_id
      AND (dm_rooms.user1_id = auth.uid() OR dm_rooms.user2_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can edit own DM messages" ON dm_messages;
CREATE POLICY "Users can edit own DM messages"
  ON dm_messages FOR UPDATE
  TO authenticated
  USING (auth.uid() = sender_id);

DROP POLICY IF EXISTS "Users can delete own DM messages" ON dm_messages;
CREATE POLICY "Users can delete own DM messages"
  ON dm_messages FOR DELETE
  TO authenticated
  USING (auth.uid() = sender_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_dm_messages_room_id ON dm_messages(room_id);
CREATE INDEX IF NOT EXISTS idx_dm_messages_sender_id ON dm_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_dm_messages_created_at ON dm_messages(created_at DESC);

-- ============================================================================
-- PARTIES TABLE (Fix foreign key references)
-- ============================================================================

-- Drop existing table if it has wrong structure
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'parties') THEN
    -- Check if the foreign key is correct
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name LIKE '%parties_leader_id%' 
      AND table_name = 'parties'
    ) THEN
      DROP TABLE IF EXISTS parties CASCADE;
    END IF;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS parties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_name TEXT NOT NULL,
  leader_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  party_size INTEGER DEFAULT 1,
  max_size INTEGER DEFAULT 4,
  is_voice_enabled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE parties ENABLE ROW LEVEL SECURITY;

-- RLS Policies for parties
DROP POLICY IF EXISTS "Anyone can view parties" ON parties;
CREATE POLICY "Anyone can view parties"
  ON parties FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can create parties" ON parties;
CREATE POLICY "Users can create parties"
  ON parties FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = leader_id);

DROP POLICY IF EXISTS "Leaders can update their parties" ON parties;
CREATE POLICY "Leaders can update their parties"
  ON parties FOR UPDATE
  TO authenticated
  USING (auth.uid() = leader_id);

DROP POLICY IF EXISTS "Leaders can delete their parties" ON parties;
CREATE POLICY "Leaders can delete their parties"
  ON parties FOR DELETE
  TO authenticated
  USING (auth.uid() = leader_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_parties_game_name ON parties(game_name);
CREATE INDEX IF NOT EXISTS idx_parties_leader_id ON parties(leader_id);
CREATE INDEX IF NOT EXISTS idx_parties_created_at ON parties(created_at DESC);

-- ============================================================================
-- PARTY MEMBERS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS party_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  party_id UUID NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('leader', 'member')),
  is_muted BOOLEAN DEFAULT FALSE,
  is_deafened BOOLEAN DEFAULT FALSE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(party_id, user_id)
);

-- Enable RLS
ALTER TABLE party_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Anyone can view party members" ON party_members;
CREATE POLICY "Anyone can view party members"
  ON party_members FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can join parties" ON party_members;
CREATE POLICY "Users can join parties"
  ON party_members FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own party status" ON party_members;
CREATE POLICY "Users can update their own party status"
  ON party_members FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can leave parties" ON party_members;
CREATE POLICY "Users can leave parties"
  ON party_members FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_party_members_party_id ON party_members(party_id);
CREATE INDEX IF NOT EXISTS idx_party_members_user_id ON party_members(user_id);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Drop all existing versions of the function by querying pg_proc
DO $$ 
DECLARE
  func_signature TEXT;
BEGIN
  FOR func_signature IN 
    SELECT oid::regprocedure::text 
    FROM pg_proc 
    WHERE proname = 'get_or_create_dm_room'
  LOOP
    EXECUTE 'DROP FUNCTION IF EXISTS ' || func_signature || ' CASCADE';
  END LOOP;
END $$;

-- Function to create or get DM room
CREATE OR REPLACE FUNCTION get_or_create_dm_room(other_user_id UUID)
RETURNS UUID AS $$
DECLARE
  v_room_id UUID;
  v_user1_id UUID;
  v_user2_id UUID;
BEGIN
  -- Ensure user1_id < user2_id for consistency
  IF auth.uid() < other_user_id THEN
    v_user1_id := auth.uid();
    v_user2_id := other_user_id;
  ELSE
    v_user1_id := other_user_id;
    v_user2_id := auth.uid();
  END IF;

  -- Try to get existing room
  SELECT id INTO v_room_id
  FROM dm_rooms
  WHERE user1_id = v_user1_id AND user2_id = v_user2_id;

  -- If not found, create it
  IF v_room_id IS NULL THEN
    INSERT INTO dm_rooms (user1_id, user2_id)
    VALUES (v_user1_id, v_user2_id)
    RETURNING id INTO v_room_id;
  END IF;

  RETURN v_room_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_or_create_dm_room TO authenticated;

