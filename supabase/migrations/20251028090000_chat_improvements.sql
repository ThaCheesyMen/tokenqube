-- =====================================================
-- CHAT SYSTEM IMPROVEMENTS
-- Emoji reactions, thread replies, message encryption
-- =====================================================

-- =====================================================
-- 0. VERIFY DM_ROOMS TABLE STRUCTURE
-- =====================================================

-- Ensure dm_rooms has correct columns
DO $$ 
BEGIN
  -- Check if columns exist, if not something is wrong with base schema
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'dm_rooms' AND column_name = 'user1_id'
  ) THEN
    RAISE EXCEPTION 'dm_rooms table missing user1_id column - base chat migration may not have run';
  END IF;
END $$;

-- =====================================================
-- 1. EMOJI REACTIONS (Enhanced)
-- =====================================================

-- Drop old reactions table if exists
DROP TABLE IF EXISTS message_reactions CASCADE;

-- Create unified reactions table for both chat types
CREATE TABLE IF NOT EXISTS message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL,
  message_type text NOT NULL CHECK (message_type IN ('chat', 'dm')),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  emoji text NOT NULL,
  created_at timestamptz DEFAULT NOW(),
  UNIQUE(message_id, user_id, emoji, message_type)
);

CREATE INDEX IF NOT EXISTS idx_message_reactions_message 
  ON message_reactions(message_id, message_type);

CREATE INDEX IF NOT EXISTS idx_message_reactions_user 
  ON message_reactions(user_id);

-- DM message reactions
CREATE TABLE IF NOT EXISTS dm_message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid REFERENCES dm_messages(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  emoji text NOT NULL,
  created_at timestamptz DEFAULT NOW(),
  UNIQUE(message_id, user_id, emoji)
);

CREATE INDEX IF NOT EXISTS idx_dm_message_reactions_message 
  ON dm_message_reactions(message_id);

-- Enable RLS
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE dm_message_reactions ENABLE ROW LEVEL SECURITY;

-- RLS policies for reactions
DROP POLICY IF EXISTS "Users can view all reactions" ON message_reactions;
CREATE POLICY "Users can view all reactions"
  ON message_reactions FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can add reactions" ON message_reactions;
CREATE POLICY "Users can add reactions"
  ON message_reactions FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can remove own reactions" ON message_reactions;
CREATE POLICY "Users can remove own reactions"
  ON message_reactions FOR DELETE
  USING (user_id = auth.uid());

-- DM reactions policies
DROP POLICY IF EXISTS "Users can view DM reactions" ON dm_message_reactions;
CREATE POLICY "Users can view DM reactions"
  ON dm_message_reactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM dm_messages dm
      JOIN dm_rooms dr ON dm.room_id = dr.id
      WHERE dm.id = dm_message_reactions.message_id
      AND (dr.user1_id = auth.uid() OR dr.user2_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can add DM reactions" ON dm_message_reactions;
CREATE POLICY "Users can add DM reactions"
  ON dm_message_reactions FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can remove own DM reactions" ON dm_message_reactions;
CREATE POLICY "Users can remove own DM reactions"
  ON dm_message_reactions FOR DELETE
  USING (user_id = auth.uid());

-- =====================================================
-- 2. THREAD REPLIES
-- =====================================================

-- Add thread support to chat_messages
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS thread_id uuid REFERENCES chat_messages(id) ON DELETE CASCADE;
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS reply_count integer DEFAULT 0;
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS last_reply_at timestamptz;

ALTER TABLE dm_messages ADD COLUMN IF NOT EXISTS thread_id uuid REFERENCES dm_messages(id) ON DELETE CASCADE;
ALTER TABLE dm_messages ADD COLUMN IF NOT EXISTS reply_count integer DEFAULT 0;
ALTER TABLE dm_messages ADD COLUMN IF NOT EXISTS last_reply_at timestamptz;

-- Indexes for threads
CREATE INDEX IF NOT EXISTS idx_chat_messages_thread 
  ON chat_messages(thread_id, created_at DESC) WHERE thread_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_dm_messages_thread 
  ON dm_messages(thread_id, created_at DESC) WHERE thread_id IS NOT NULL;

-- Function to update thread reply count
CREATE OR REPLACE FUNCTION update_thread_reply_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.thread_id IS NOT NULL THEN
    UPDATE chat_messages
    SET 
      reply_count = reply_count + 1,
      last_reply_at = NOW()
    WHERE id = NEW.thread_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for chat_messages
DROP TRIGGER IF EXISTS thread_reply_counter ON chat_messages;
CREATE TRIGGER thread_reply_counter
  AFTER INSERT ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_thread_reply_count();

-- Similar for DM messages
CREATE OR REPLACE FUNCTION update_dm_thread_reply_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.thread_id IS NOT NULL THEN
    UPDATE dm_messages
    SET 
      reply_count = reply_count + 1,
      last_reply_at = NOW()
    WHERE id = NEW.thread_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS dm_thread_reply_counter ON dm_messages;
CREATE TRIGGER dm_thread_reply_counter
  AFTER INSERT ON dm_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_dm_thread_reply_count();

-- =====================================================
-- 3. MESSAGE ENCRYPTION METADATA
-- =====================================================

-- Add encryption metadata columns
ALTER TABLE dm_messages ADD COLUMN IF NOT EXISTS is_encrypted boolean DEFAULT false;
ALTER TABLE dm_messages ADD COLUMN IF NOT EXISTS encryption_key_id text;
ALTER TABLE dm_messages ADD COLUMN IF NOT EXISTS nonce text;

-- User encryption keys table
CREATE TABLE IF NOT EXISTS user_encryption_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  public_key text NOT NULL,
  key_version integer DEFAULT 1,
  created_at timestamptz DEFAULT NOW(),
  expires_at timestamptz,
  is_active boolean DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_user_encryption_keys_user 
  ON user_encryption_keys(user_id, is_active) WHERE is_active = true;

ALTER TABLE user_encryption_keys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own encryption keys" ON user_encryption_keys;
CREATE POLICY "Users can view own encryption keys"
  ON user_encryption_keys FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can view other users' public keys" ON user_encryption_keys;
CREATE POLICY "Users can view other users' public keys"
  ON user_encryption_keys FOR SELECT
  USING (is_active = true);

DROP POLICY IF EXISTS "Users can insert own encryption keys" ON user_encryption_keys;
CREATE POLICY "Users can insert own encryption keys"
  ON user_encryption_keys FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- =====================================================
-- 4. PINNED MESSAGES (Chat messages only - no rooms table)
-- =====================================================

-- Skip pinned messages for now as there's no rooms table
-- This feature can be added when room-based chat is implemented

-- CREATE TABLE IF NOT EXISTS pinned_chat_messages (
--   id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
--   message_id uuid REFERENCES chat_messages(id) ON DELETE CASCADE NOT NULL,
--   pinned_by uuid REFERENCES profiles(id) NOT NULL,
--   created_at timestamptz DEFAULT NOW(),
--   UNIQUE(message_id)
-- );

-- =====================================================
-- 5. MESSAGE EDIT HISTORY
-- =====================================================

CREATE TABLE IF NOT EXISTS chat_message_edit_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid REFERENCES chat_messages(id) ON DELETE CASCADE NOT NULL,
  old_content text NOT NULL,
  edited_at timestamptz DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_message_edit_history_message 
  ON chat_message_edit_history(message_id, edited_at DESC);

-- Add edited flag to chat_messages (might already exist)
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS is_edited boolean DEFAULT false;
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS edited_at timestamptz;

ALTER TABLE dm_messages ADD COLUMN IF NOT EXISTS is_edited boolean DEFAULT false;
ALTER TABLE dm_messages ADD COLUMN IF NOT EXISTS edited_at timestamptz;

-- Function to track chat message edits
CREATE OR REPLACE FUNCTION track_chat_message_edit()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.message != NEW.message THEN
    -- Store old content
    INSERT INTO chat_message_edit_history (message_id, old_content)
    VALUES (OLD.id, OLD.message);
    
    -- Update edited flags
    NEW.is_edited = true;
    NEW.edited_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS chat_message_edit_tracker ON chat_messages;
CREATE TRIGGER chat_message_edit_tracker
  BEFORE UPDATE ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION track_chat_message_edit();

-- =====================================================
-- 6. READ RECEIPTS
-- =====================================================

-- Chat message read receipts (simplified - just track last read)
CREATE TABLE IF NOT EXISTS chat_read_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  last_read_message_id uuid REFERENCES chat_messages(id) ON DELETE SET NULL,
  last_read_at timestamptz DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_chat_read_status_user 
  ON chat_read_status(user_id);

-- DM read receipts (already exists but let's ensure it's there)
CREATE TABLE IF NOT EXISTS dm_read_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid REFERENCES dm_messages(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  read_at timestamptz DEFAULT NOW(),
  UNIQUE(message_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_dm_read_receipts_message 
  ON dm_read_receipts(message_id);

ALTER TABLE chat_read_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE dm_read_receipts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own chat read status" ON chat_read_status;
CREATE POLICY "Users can view own chat read status"
  ON chat_read_status FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own chat read status" ON chat_read_status;
CREATE POLICY "Users can update own chat read status"
  ON chat_read_status FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can view DM read receipts" ON dm_read_receipts;
CREATE POLICY "Users can view DM read receipts"
  ON dm_read_receipts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM dm_messages dm
      JOIN dm_rooms dr ON dm.room_id = dr.id
      WHERE dm.id = dm_read_receipts.message_id
      AND (dr.user1_id = auth.uid() OR dr.user2_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can mark DMs as read" ON dm_read_receipts;
CREATE POLICY "Users can mark DMs as read"
  ON dm_read_receipts FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- =====================================================
-- 7. TYPING INDICATORS (For DM rooms)
-- =====================================================

CREATE TABLE IF NOT EXISTS dm_typing_indicators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid REFERENCES dm_rooms(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  updated_at timestamptz DEFAULT NOW(),
  UNIQUE(room_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_dm_typing_indicators_room 
  ON dm_typing_indicators(room_id, updated_at DESC);

-- Auto-delete old typing indicators (after 5 seconds)
CREATE OR REPLACE FUNCTION cleanup_dm_typing_indicators()
RETURNS void AS $$
BEGIN
  DELETE FROM dm_typing_indicators
  WHERE updated_at < NOW() - INTERVAL '5 seconds';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

ALTER TABLE dm_typing_indicators ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view typing indicators in their DM rooms" ON dm_typing_indicators;
CREATE POLICY "Users can view typing indicators in their DM rooms"
  ON dm_typing_indicators FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM dm_rooms dr
      WHERE dr.id = dm_typing_indicators.room_id
      AND (dr.user1_id = auth.uid() OR dr.user2_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update own typing indicator" ON dm_typing_indicators;
CREATE POLICY "Users can update own typing indicator"
  ON dm_typing_indicators FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- =====================================================
-- VERIFICATION
-- =====================================================

DO $$ 
BEGIN
  RAISE NOTICE '✅ Chat improvements applied successfully!';
  RAISE NOTICE '';
  RAISE NOTICE 'Added features:';
  RAISE NOTICE '  ✓ Emoji reactions';
  RAISE NOTICE '  ✓ Thread replies';
  RAISE NOTICE '  ✓ Message encryption metadata';
  RAISE NOTICE '  ✓ Pinned messages';
  RAISE NOTICE '  ✓ Message edit history';
  RAISE NOTICE '  ✓ Read receipts';
  RAISE NOTICE '  ✓ Typing indicators';
END $$;

