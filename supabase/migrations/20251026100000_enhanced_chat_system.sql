-- Enhanced Chat System Migration
-- Adds support for message reactions, editing, replies, attachments, read receipts, and group DMs

-- ============================================
-- 1. MESSAGE ENHANCEMENTS
-- ============================================

-- Add columns to dm_messages for enhanced features
ALTER TABLE dm_messages 
  ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reply_to_message_id UUID REFERENCES dm_messages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;

-- Add columns to chat_messages (global chat) for enhanced features
ALTER TABLE chat_messages 
  ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reply_to_message_id UUID REFERENCES chat_messages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;

-- ============================================
-- 2. MESSAGE REACTIONS
-- ============================================

CREATE TABLE IF NOT EXISTS message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL,
  message_type TEXT NOT NULL CHECK (message_type IN ('dm', 'global')),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(message_id, user_id, emoji, message_type)
);

CREATE INDEX IF NOT EXISTS idx_message_reactions_message ON message_reactions(message_id, message_type);
CREATE INDEX IF NOT EXISTS idx_message_reactions_user ON message_reactions(user_id);

-- Enable RLS
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for message_reactions
CREATE POLICY "Users can view all reactions" ON message_reactions
  FOR SELECT USING (true);

CREATE POLICY "Users can add reactions" ON message_reactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their own reactions" ON message_reactions
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- 3. READ RECEIPTS
-- ============================================

CREATE TABLE IF NOT EXISTS message_read_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  last_read_message_id UUID,
  last_read_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(room_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_read_receipts_room ON message_read_receipts(room_id);
CREATE INDEX IF NOT EXISTS idx_read_receipts_user ON message_read_receipts(user_id);

-- Enable RLS
ALTER TABLE message_read_receipts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for read receipts
CREATE POLICY "Users can view read receipts in their rooms" ON message_read_receipts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM dm_rooms dr
      WHERE dr.id = room_id
      AND (dr.user1_id = auth.uid() OR dr.user2_id = auth.uid())
    )
  );

CREATE POLICY "Users can update their own read receipts" ON message_read_receipts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their read receipts" ON message_read_receipts
  FOR UPDATE USING (auth.uid() = user_id);

-- ============================================
-- 4. GROUP DM SUPPORT
-- ============================================

-- Add group DM columns to dm_rooms
ALTER TABLE dm_rooms 
  ADD COLUMN IF NOT EXISTS is_group BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS group_name TEXT,
  ADD COLUMN IF NOT EXISTS group_icon TEXT,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- Create dm_room_members table for group DMs
CREATE TABLE IF NOT EXISTS dm_room_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES dm_rooms(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  is_muted BOOLEAN DEFAULT false,
  is_admin BOOLEAN DEFAULT false,
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(room_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_dm_room_members_room ON dm_room_members(room_id);
CREATE INDEX IF NOT EXISTS idx_dm_room_members_user ON dm_room_members(user_id);

-- Enable RLS
ALTER TABLE dm_room_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies for dm_room_members
CREATE POLICY "Users can view members of their rooms" ON dm_room_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM dm_room_members drm
      WHERE drm.room_id = dm_room_members.room_id
      AND drm.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can add members" ON dm_room_members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM dm_room_members drm
      WHERE drm.room_id = dm_room_members.room_id
      AND drm.user_id = auth.uid()
      AND drm.is_admin = true
    )
  );

CREATE POLICY "Admins can remove members" ON dm_room_members
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM dm_room_members drm
      WHERE drm.room_id = dm_room_members.room_id
      AND drm.user_id = auth.uid()
      AND drm.is_admin = true
    )
  );

-- ============================================
-- 5. BLOCKED USERS
-- ============================================

CREATE TABLE IF NOT EXISTS blocked_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  blocked_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(blocker_id, blocked_id)
);

CREATE INDEX IF NOT EXISTS idx_blocked_users_blocker ON blocked_users(blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocked_users_blocked ON blocked_users(blocked_id);

-- Enable RLS
ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;

-- RLS Policies for blocked_users
CREATE POLICY "Users can view their blocked list" ON blocked_users
  FOR SELECT USING (auth.uid() = blocker_id);

CREATE POLICY "Users can block others" ON blocked_users
  FOR INSERT WITH CHECK (auth.uid() = blocker_id);

CREATE POLICY "Users can unblock others" ON blocked_users
  FOR DELETE USING (auth.uid() = blocker_id);

-- ============================================
-- 6. TYPING INDICATORS
-- ============================================

CREATE TABLE IF NOT EXISTS typing_indicators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  is_typing BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(room_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_typing_indicators_room ON typing_indicators(room_id);

-- Enable RLS
ALTER TABLE typing_indicators ENABLE ROW LEVEL SECURITY;

-- RLS Policies for typing_indicators
CREATE POLICY "Users can view typing in their rooms" ON typing_indicators
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM dm_rooms dr
      WHERE dr.id = room_id
      AND (dr.user1_id = auth.uid() OR dr.user2_id = auth.uid())
    )
  );

CREATE POLICY "Users can update their typing status" ON typing_indicators
  FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- 7. HELPER FUNCTIONS
-- ============================================

-- Function to update message edit timestamp
CREATE OR REPLACE FUNCTION update_message_edited_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.message != OLD.message THEN
    NEW.edited_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for dm_messages
DROP TRIGGER IF EXISTS update_dm_message_edited_at ON dm_messages;
CREATE TRIGGER update_dm_message_edited_at
  BEFORE UPDATE ON dm_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_message_edited_at();

-- Trigger for global chat messages
DROP TRIGGER IF EXISTS update_global_message_edited_at ON chat_messages;
CREATE TRIGGER update_global_message_edited_at
  BEFORE UPDATE ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_message_edited_at();

-- Function to get unread message count
CREATE OR REPLACE FUNCTION get_unread_message_count(p_user_id UUID, p_room_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_last_read_at TIMESTAMPTZ;
  v_unread_count INTEGER;
BEGIN
  -- Get last read timestamp
  SELECT last_read_at INTO v_last_read_at
  FROM message_read_receipts
  WHERE user_id = p_user_id AND room_id = p_room_id;
  
  -- If no read receipt, count all messages
  IF v_last_read_at IS NULL THEN
    SELECT COUNT(*) INTO v_unread_count
    FROM dm_messages
    WHERE room_id = p_room_id AND sender_id != p_user_id;
  ELSE
    -- Count messages after last read
    SELECT COUNT(*) INTO v_unread_count
    FROM dm_messages
    WHERE room_id = p_room_id 
    AND sender_id != p_user_id
    AND created_at > v_last_read_at;
  END IF;
  
  RETURN COALESCE(v_unread_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark messages as read
CREATE OR REPLACE FUNCTION mark_messages_read(
  p_user_id UUID,
  p_room_id UUID,
  p_message_id UUID
)
RETURNS void AS $$
BEGIN
  INSERT INTO message_read_receipts (user_id, room_id, last_read_message_id, last_read_at)
  VALUES (p_user_id, p_room_id, p_message_id, now())
  ON CONFLICT (room_id, user_id)
  DO UPDATE SET 
    last_read_message_id = p_message_id,
    last_read_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create group DM
CREATE OR REPLACE FUNCTION create_group_dm(
  p_creator_id UUID,
  p_group_name TEXT,
  p_member_ids UUID[]
)
RETURNS UUID AS $$
DECLARE
  v_room_id UUID;
  v_member_id UUID;
BEGIN
  -- Create the room
  INSERT INTO dm_rooms (is_group, group_name, created_by)
  VALUES (true, p_group_name, p_creator_id)
  RETURNING id INTO v_room_id;
  
  -- Add creator as admin
  INSERT INTO dm_room_members (room_id, user_id, is_admin)
  VALUES (v_room_id, p_creator_id, true);
  
  -- Add other members
  FOREACH v_member_id IN ARRAY p_member_ids
  LOOP
    IF v_member_id != p_creator_id THEN
      INSERT INTO dm_room_members (room_id, user_id, is_admin)
      VALUES (v_room_id, v_member_id, false);
    END IF;
  END LOOP;
  
  RETURN v_room_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 8. GRANT PERMISSIONS
-- ============================================

GRANT ALL ON message_reactions TO authenticated;
GRANT ALL ON message_read_receipts TO authenticated;
GRANT ALL ON dm_room_members TO authenticated;
GRANT ALL ON blocked_users TO authenticated;
GRANT ALL ON typing_indicators TO authenticated;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION get_unread_message_count TO authenticated;
GRANT EXECUTE ON FUNCTION mark_messages_read TO authenticated;
GRANT EXECUTE ON FUNCTION create_group_dm TO authenticated;

