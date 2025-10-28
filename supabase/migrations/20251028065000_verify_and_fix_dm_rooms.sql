-- =====================================================
-- VERIFY AND FIX DM_ROOMS TABLE STRUCTURE
-- =====================================================
-- This migration ensures dm_rooms has the correct structure
-- Run this BEFORE the chat improvements migration

-- Check current structure
DO $$ 
DECLARE
  v_has_user1 boolean;
  v_has_user2 boolean;
  rec RECORD;
BEGIN
  -- Check for user1_id
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'dm_rooms' AND column_name = 'user1_id'
  ) INTO v_has_user1;
  
  -- Check for user2_id
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'dm_rooms' AND column_name = 'user2_id'
  ) INTO v_has_user2;
  
  -- Report status
  IF v_has_user1 AND v_has_user2 THEN
    RAISE NOTICE '✅ dm_rooms has correct structure (user1_id, user2_id)';
  ELSE
    RAISE NOTICE '❌ dm_rooms is missing required columns';
    RAISE NOTICE 'Has user1_id: %', v_has_user1;
    RAISE NOTICE 'Has user2_id: %', v_has_user2;
    
    -- Show actual columns
    RAISE NOTICE 'Current dm_rooms columns:';
    FOR rec IN 
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'dm_rooms'
      ORDER BY ordinal_position
    LOOP
      RAISE NOTICE '  - % (%)', rec.column_name, rec.data_type;
    END LOOP;
    
    RAISE EXCEPTION 'dm_rooms table has incorrect structure. Please check the table definition.';
  END IF;
END $$;

-- Ensure table exists with correct structure
CREATE TABLE IF NOT EXISTS dm_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  user2_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  last_message_at timestamptz,
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW(),
  UNIQUE(user1_id, user2_id)
);

-- Create indexes if not exist
CREATE INDEX IF NOT EXISTS idx_dm_rooms_user1 ON dm_rooms(user1_id);
CREATE INDEX IF NOT EXISTS idx_dm_rooms_user2 ON dm_rooms(user2_id);
CREATE INDEX IF NOT EXISTS idx_dm_rooms_last_message ON dm_rooms(last_message_at DESC);

-- Enable RLS
ALTER TABLE dm_rooms ENABLE ROW LEVEL SECURITY;

-- Drop and recreate basic policies
DROP POLICY IF EXISTS "Users can view their DM rooms" ON dm_rooms;
DROP POLICY IF EXISTS "Users can insert their DM rooms" ON dm_rooms;
DROP POLICY IF EXISTS "Users can update their DM rooms" ON dm_rooms;
DROP POLICY IF EXISTS "dm_rooms_select_policy" ON dm_rooms;
DROP POLICY IF EXISTS "dm_rooms_insert_policy" ON dm_rooms;

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

-- Ensure dm_messages table exists with correct structure
CREATE TABLE IF NOT EXISTS dm_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid REFERENCES dm_rooms(id) ON DELETE CASCADE NOT NULL,
  sender_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  message text NOT NULL,
  created_at timestamptz DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dm_messages_room ON dm_messages(room_id);
CREATE INDEX IF NOT EXISTS idx_dm_messages_sender ON dm_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_dm_messages_created ON dm_messages(created_at DESC);

-- Enable RLS on dm_messages
ALTER TABLE dm_messages ENABLE ROW LEVEL SECURITY;

-- Drop and recreate dm_messages policies
DROP POLICY IF EXISTS "Users can view messages in their DM rooms" ON dm_messages;
DROP POLICY IF EXISTS "Users can insert messages in their DM rooms" ON dm_messages;

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

-- Recreate helper function
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

-- Recreate timestamp update function
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

DROP TRIGGER IF EXISTS update_dm_room_on_message ON dm_messages;
CREATE TRIGGER update_dm_room_on_message
  AFTER INSERT ON dm_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_dm_room_timestamp();

DO $$ 
BEGIN
  RAISE NOTICE '✅ DM rooms structure verified and fixed';
END $$;

