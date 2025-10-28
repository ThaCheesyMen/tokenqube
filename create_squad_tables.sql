-- ============================================================================
-- Squad/Group Chat System - Database Setup
-- ============================================================================
-- This script creates the tables and functions needed for squad/group chats.
-- Similar to Discord servers, users can create squads, invite friends, and chat.
-- Run this in your Supabase SQL Editor.
--
-- What this creates:
--   - squads table: Squad/group information
--   - squad_members table: Squad membership with roles
--   - squad_messages table: Messages in squad channels
--   - RLS policies: Security for all tables
--   - RPC functions: For squad management
--   - Triggers: Auto-updates and notifications
--   - Realtime subscriptions: For live messaging
-- ============================================================================

-- Create Squads table
CREATE TABLE IF NOT EXISTS squads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  avatar_url text,
  owner_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  is_public boolean DEFAULT true,
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

-- Create Squad Members table (with roles)
CREATE TABLE IF NOT EXISTS squad_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  squad_id uuid REFERENCES squads(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  role text NOT NULL DEFAULT 'member', -- 'owner', 'admin', 'member'
  joined_at timestamptz DEFAULT NOW(),
  UNIQUE(squad_id, user_id)
);

-- Create Squad Messages table
CREATE TABLE IF NOT EXISTS squad_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  squad_id uuid REFERENCES squads(id) ON DELETE CASCADE NOT NULL,
  sender_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  message text NOT NULL,
  created_at timestamptz DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_squad_members_squad ON squad_members(squad_id);
CREATE INDEX IF NOT EXISTS idx_squad_members_user ON squad_members(user_id);
CREATE INDEX IF NOT EXISTS idx_squad_messages_squad ON squad_messages(squad_id);
CREATE INDEX IF NOT EXISTS idx_squad_messages_created ON squad_messages(created_at);

-- Enable RLS
ALTER TABLE squads ENABLE ROW LEVEL SECURITY;
ALTER TABLE squad_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE squad_messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view public squads" ON squads;
DROP POLICY IF EXISTS "Owners can view their squads" ON squads;
DROP POLICY IF EXISTS "Members can view their squads" ON squads;
DROP POLICY IF EXISTS "Users can create squads" ON squads;
DROP POLICY IF EXISTS "Owners can update their squads" ON squads;
DROP POLICY IF EXISTS "Owners can delete their squads" ON squads;

-- RLS Policies for squads
CREATE POLICY "Users can view public squads"
  ON squads FOR SELECT
  TO authenticated
  USING (is_public = true);

CREATE POLICY "Owners can view their squads"
  ON squads FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "Members can view their squads"
  ON squads FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT squad_id FROM squad_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create squads"
  ON squads FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update their squads"
  ON squads FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners can delete their squads"
  ON squads FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

-- Squad Members policies
DROP POLICY IF EXISTS "Members can view squad members" ON squad_members;
DROP POLICY IF EXISTS "Users can join public squads" ON squad_members;
DROP POLICY IF EXISTS "Admins can add members" ON squad_members;
DROP POLICY IF EXISTS "Members can leave squads" ON squad_members;
DROP POLICY IF EXISTS "Admins can remove members" ON squad_members;

CREATE POLICY "Members can view squad members"
  ON squad_members FOR SELECT
  TO authenticated
  USING (
    squad_id IN (
      SELECT squad_id FROM squad_members WHERE user_id = auth.uid()
    )
    OR
    squad_id IN (
      SELECT id FROM squads WHERE is_public = true
    )
  );

CREATE POLICY "Users can join public squads"
  ON squad_members FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    squad_id IN (SELECT id FROM squads WHERE is_public = true)
  );

CREATE POLICY "Admins can add members"
  ON squad_members FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM squad_members
      WHERE squad_id = squad_members.squad_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Members can leave squads"
  ON squad_members FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can remove members"
  ON squad_members FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM squad_members
      WHERE squad_id = squad_members.squad_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

-- Squad Messages policies
DROP POLICY IF EXISTS "Members can view messages" ON squad_messages;
DROP POLICY IF EXISTS "Members can send messages" ON squad_messages;

CREATE POLICY "Members can view messages"
  ON squad_messages FOR SELECT
  TO authenticated
  USING (
    squad_id IN (
      SELECT squad_id FROM squad_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Members can send messages"
  ON squad_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = sender_id AND
    squad_id IN (
      SELECT squad_id FROM squad_members WHERE user_id = auth.uid()
    )
  );

-- Enable Realtime for all tables
DO $$ 
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE squads;
EXCEPTION 
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ 
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE squad_members;
EXCEPTION 
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ 
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE squad_messages;
EXCEPTION 
  WHEN duplicate_object THEN NULL;
END $$;

-- Function to create squad and add owner as member
CREATE OR REPLACE FUNCTION create_squad_and_add_owner(
  p_name text,
  p_description text,
  p_avatar_url text DEFAULT NULL,
  p_is_public boolean DEFAULT true
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_squad_id uuid;
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  
  -- Create the squad
  INSERT INTO squads (name, description, avatar_url, owner_id, is_public)
  VALUES (p_name, p_description, p_avatar_url, v_user_id, p_is_public)
  RETURNING id INTO v_squad_id;
  
  -- Add owner as member with 'owner' role
  INSERT INTO squad_members (squad_id, user_id, role)
  VALUES (v_squad_id, v_user_id, 'owner');
  
  RETURN v_squad_id;
END;
$$;

-- Function to add member to squad
CREATE OR REPLACE FUNCTION add_squad_member(
  p_squad_id uuid,
  p_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user is admin or owner
  IF NOT EXISTS (
    SELECT 1 FROM squad_members
    WHERE squad_id = p_squad_id
    AND user_id = auth.uid()
    AND role IN ('owner', 'admin')
  ) THEN
    RAISE EXCEPTION 'Only admins and owners can add members';
  END IF;
  
  -- Add member
  INSERT INTO squad_members (squad_id, user_id, role)
  VALUES (p_squad_id, p_user_id, 'member')
  ON CONFLICT (squad_id, user_id) DO NOTHING;
END;
$$;

-- Function to remove member from squad
CREATE OR REPLACE FUNCTION remove_squad_member(
  p_squad_id uuid,
  p_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_role text;
BEGIN
  -- Get caller's role
  SELECT role INTO v_role
  FROM squad_members
  WHERE squad_id = p_squad_id AND user_id = auth.uid();
  
  -- Allow if caller is owner/admin or if removing self
  IF v_role NOT IN ('owner', 'admin') AND p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Only admins and owners can remove members';
  END IF;
  
  -- Don't allow removing the owner
  IF EXISTS (
    SELECT 1 FROM squads
    WHERE id = p_squad_id AND owner_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'Cannot remove squad owner';
  END IF;
  
  -- Remove member
  DELETE FROM squad_members
  WHERE squad_id = p_squad_id AND user_id = p_user_id;
END;
$$;

-- Function to get user's role in a squad
CREATE OR REPLACE FUNCTION get_squad_role(p_squad_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_role text;
BEGIN
  SELECT role INTO v_role
  FROM squad_members
  WHERE squad_id = p_squad_id AND user_id = auth.uid();
  
  RETURN v_role;
END;
$$;

-- Trigger to update squad updated_at
CREATE OR REPLACE FUNCTION update_squad_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE squads
  SET updated_at = NOW()
  WHERE id = NEW.squad_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_squad_on_message ON squad_messages;

CREATE TRIGGER update_squad_on_message
  AFTER INSERT ON squad_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_squad_timestamp();

COMMENT ON TABLE squads IS 'Squad/group information';
COMMENT ON TABLE squad_members IS 'Squad membership with roles';
COMMENT ON TABLE squad_messages IS 'Messages in squad channels';
COMMENT ON FUNCTION create_squad_and_add_owner IS 'Creates a new squad and adds the creator as owner';
COMMENT ON FUNCTION add_squad_member IS 'Adds a member to a squad (admin/owner only)';
COMMENT ON FUNCTION remove_squad_member IS 'Removes a member from a squad';
COMMENT ON FUNCTION get_squad_role IS 'Gets the current user''s role in a squad';
