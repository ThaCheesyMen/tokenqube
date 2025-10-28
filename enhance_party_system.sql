-- ============================================================================
-- Party System Enhancements - Database Setup
-- ============================================================================
-- This script enhances the existing party system with additional features:
--   - Role management (leader/moderator/member)
--   - Kick/ban functionality
--   - Activity logs
--   - Private/public parties
-- Run this in your Supabase SQL Editor.
-- ============================================================================

-- Add role column to party_members if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'party_members' AND column_name = 'role'
  ) THEN
    ALTER TABLE party_members ADD COLUMN role text DEFAULT 'member';
  END IF;
END $$;

-- Create party_activity_logs table
CREATE TABLE IF NOT EXISTS party_activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  party_id uuid REFERENCES parties(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  action text NOT NULL, -- 'joined', 'left', 'kicked', 'promoted', 'demoted', 'created', 'disbanded'
  target_user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT NOW()
);

-- Create party_bans table
CREATE TABLE IF NOT EXISTS party_bans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  party_id uuid REFERENCES parties(id) ON DELETE CASCADE NOT NULL,
  banned_user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  banned_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  reason text,
  banned_at timestamptz DEFAULT NOW(),
  expires_at timestamptz,
  UNIQUE(party_id, banned_user_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_party_members_role ON party_members(role);
CREATE INDEX IF NOT EXISTS idx_party_activity_logs_party ON party_activity_logs(party_id);
CREATE INDEX IF NOT EXISTS idx_party_activity_logs_created ON party_activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_party_bans_party ON party_bans(party_id);
CREATE INDEX IF NOT EXISTS idx_party_bans_user ON party_bans(banned_user_id);

-- Enable RLS for new tables
ALTER TABLE party_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE party_bans ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Members can view party activity" ON party_activity_logs;
DROP POLICY IF EXISTS "Leaders can view party bans" ON party_bans;
DROP POLICY IF EXISTS "Leaders can manage party bans" ON party_bans;

-- Activity logs policies
CREATE POLICY "Members can view party activity"
  ON party_activity_logs FOR SELECT
  TO authenticated
  USING (
    party_id IN (
      SELECT party_id FROM party_members WHERE user_id = auth.uid()
    )
  );

-- Party bans policies
CREATE POLICY "Leaders can view party bans"
  ON party_bans FOR SELECT
  TO authenticated
  USING (
    party_id IN (
      SELECT party_id FROM party_members 
      WHERE user_id = auth.uid() AND role IN ('leader')
    )
  );

CREATE POLICY "Leaders can manage party bans"
  ON party_bans FOR ALL
  TO authenticated
  USING (
    party_id IN (
      SELECT party_id FROM party_members 
      WHERE user_id = auth.uid() AND role IN ('leader')
    )
  );

-- Function to promote/demote member
CREATE OR REPLACE FUNCTION change_party_role(
  p_party_id uuid,
  p_user_id uuid,
  p_new_role text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_caller_role text;
  v_target_role text;
BEGIN
  -- Get caller's role
  SELECT role INTO v_caller_role
  FROM party_members
  WHERE party_id = p_party_id AND user_id = auth.uid();
  
  -- Only leaders can change roles
  IF v_caller_role != 'leader' THEN
    RAISE EXCEPTION 'Only party leaders can change roles';
  END IF;
  
  -- Get target's current role
  SELECT role INTO v_target_role
  FROM party_members
  WHERE party_id = p_party_id AND user_id = p_user_id;
  
  IF v_target_role IS NULL THEN
    RAISE EXCEPTION 'User is not a member of this party';
  END IF;
  
  -- Update role
  UPDATE party_members
  SET role = p_new_role
  WHERE party_id = p_party_id AND user_id = p_user_id;
  
  -- Log the activity
  INSERT INTO party_activity_logs (party_id, user_id, action, target_user_id, details)
  VALUES (p_party_id, auth.uid(), 
    CASE WHEN p_new_role = 'leader' THEN 'promoted' ELSE 'demoted' END,
    p_user_id,
    jsonb_build_object('old_role', v_target_role, 'new_role', p_new_role));
END;
$$;

-- Function to kick member from party
CREATE OR REPLACE FUNCTION kick_party_member(
  p_party_id uuid,
  p_user_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_caller_role text;
  v_target_role text;
BEGIN
  -- Get caller's role
  SELECT role INTO v_caller_role
  FROM party_members
  WHERE party_id = p_party_id AND user_id = auth.uid();
  
  -- Only leaders and moderators can kick members
  IF v_caller_role NOT IN ('leader', 'moderator') THEN
    RAISE EXCEPTION 'Only leaders and moderators can kick members';
  END IF;
  
  -- Get target's role
  SELECT role INTO v_target_role
  FROM party_members
  WHERE party_id = p_party_id AND user_id = p_user_id;
  
  IF v_target_role IS NULL THEN
    RAISE EXCEPTION 'User is not a member of this party';
  END IF;
  
  -- Cannot kick leaders
  IF v_target_role = 'leader' THEN
    RAISE EXCEPTION 'Cannot kick party leader';
  END IF;
  
  -- Moderators can only kick members, not other moderators
  IF v_caller_role = 'moderator' AND v_target_role = 'moderator' THEN
    RAISE EXCEPTION 'Moderators cannot kick other moderators';
  END IF;
  
  -- Remove from party
  DELETE FROM party_members
  WHERE party_id = p_party_id AND user_id = p_user_id;
  
  -- Log the activity
  INSERT INTO party_activity_logs (party_id, user_id, action, target_user_id, details)
  VALUES (p_party_id, auth.uid(), 'kicked', p_user_id,
    jsonb_build_object('reason', p_reason));
END;
$$;

-- Function to ban member from party
CREATE OR REPLACE FUNCTION ban_party_member(
  p_party_id uuid,
  p_user_id uuid,
  p_reason text DEFAULT NULL,
  p_expires_at timestamptz DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_caller_role text;
BEGIN
  -- Get caller's role
  SELECT role INTO v_caller_role
  FROM party_members
  WHERE party_id = p_party_id AND user_id = auth.uid();
  
  -- Only leaders can ban
  IF v_caller_role != 'leader' THEN
    RAISE EXCEPTION 'Only party leaders can ban members';
  END IF;
  
  -- Kick the member first
  PERFORM kick_party_member(p_party_id, p_user_id, p_reason);
  
  -- Add to ban list
  INSERT INTO party_bans (party_id, banned_user_id, banned_by, reason, expires_at)
  VALUES (p_party_id, p_user_id, auth.uid(), p_reason, p_expires_at)
  ON CONFLICT (party_id, banned_user_id) 
  DO UPDATE SET
    reason = EXCLUDED.reason,
    banned_by = auth.uid(),
    banned_at = NOW(),
    expires_at = EXCLUDED.expires_at;
END;
$$;

-- Function to unban member from party
CREATE OR REPLACE FUNCTION unban_party_member(
  p_party_id uuid,
  p_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_caller_role text;
BEGIN
  -- Get caller's role
  SELECT role INTO v_caller_role
  FROM party_members
  WHERE party_id = p_party_id AND user_id = auth.uid();
  
  -- Only leaders can unban
  IF v_caller_role != 'leader' THEN
    RAISE EXCEPTION 'Only party leaders can unban members';
  END IF;
  
  -- Remove from ban list
  DELETE FROM party_bans
  WHERE party_id = p_party_id AND banned_user_id = p_user_id;
END;
$$;

-- Trigger to log party creation
CREATE OR REPLACE FUNCTION log_party_creation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_creator_id uuid;
BEGIN
  -- Get the creator's ID from party_members
  SELECT user_id INTO v_creator_id
  FROM party_members
  WHERE party_id = NEW.id
  ORDER BY joined_at ASC
  LIMIT 1;
  
  -- Log the creation
  INSERT INTO party_activity_logs (party_id, user_id, action, details)
  VALUES (NEW.id, v_creator_id, 'created',
    jsonb_build_object('game_name', NEW.game_name, 'party_size', NEW.party_size));
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS party_creation_log ON parties;

CREATE TRIGGER party_creation_log
  AFTER INSERT ON parties
  FOR EACH ROW
  EXECUTE FUNCTION log_party_creation();

-- Trigger to log when members join
CREATE OR REPLACE FUNCTION log_party_join()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO party_activity_logs (party_id, user_id, action)
  VALUES (NEW.party_id, NEW.user_id, 'joined');
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS party_join_log ON party_members;

CREATE TRIGGER party_join_log
  AFTER INSERT ON party_members
  FOR EACH ROW
  EXECUTE FUNCTION log_party_join();

-- Trigger to log when members leave
CREATE OR REPLACE FUNCTION log_party_leave()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO party_activity_logs (party_id, user_id, action)
  VALUES (OLD.party_id, OLD.user_id, 'left');
  
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS party_leave_log ON party_members;

CREATE TRIGGER party_leave_log
  AFTER DELETE ON party_members
  FOR EACH ROW
  EXECUTE FUNCTION log_party_leave();

-- Function to check if user is banned
CREATE OR REPLACE FUNCTION is_user_banned_from_party(
  p_party_id uuid,
  p_user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_ban_record record;
BEGIN
  SELECT * INTO v_ban_record
  FROM party_bans
  WHERE party_id = p_party_id AND banned_user_id = p_user_id;
  
  IF v_ban_record IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check if ban has expired
  IF v_ban_record.expires_at IS NOT NULL AND v_ban_record.expires_at < NOW() THEN
    -- Auto-remove expired ban
    DELETE FROM party_bans WHERE id = v_ban_record.id;
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$;

-- Function to get party activity feed
CREATE OR REPLACE FUNCTION get_party_activity(
  p_party_id uuid,
  p_limit integer DEFAULT 50
)
RETURNS TABLE (
  id uuid,
  action text,
  user_username text,
  target_username text,
  details jsonb,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    al.id,
    al.action,
    p1.username as user_username,
    p2.username as target_username,
    al.details,
    al.created_at
  FROM party_activity_logs al
  LEFT JOIN profiles p1 ON al.user_id = p1.id
  LEFT JOIN profiles p2 ON al.target_user_id = p2.id
  WHERE al.party_id = p_party_id
  ORDER BY al.created_at DESC
  LIMIT p_limit;
END;
$$;

COMMENT ON TABLE party_activity_logs IS 'Activity logs for party events';
COMMENT ON TABLE party_bans IS 'Banned users from parties';
COMMENT ON FUNCTION change_party_role IS 'Changes a member''s role in a party';
COMMENT ON FUNCTION kick_party_member IS 'Kicks a member from a party';
COMMENT ON FUNCTION ban_party_member IS 'Bans a member from a party';
COMMENT ON FUNCTION unban_party_member IS 'Unbans a member from a party';
COMMENT ON FUNCTION is_user_banned_from_party IS 'Checks if a user is banned from a party';
COMMENT ON FUNCTION get_party_activity IS 'Gets the activity feed for a party';
