-- =====================================================
-- COMPREHENSIVE DATABASE IMPROVEMENTS
-- Performance, Security, and Data Integrity
-- =====================================================

-- =====================================================
-- 1. COMPOSITE INDEXES FOR PERFORMANCE
-- =====================================================

-- Drop existing indexes first to avoid conflicts
DROP INDEX IF EXISTS idx_party_members_party_user;
DROP INDEX IF EXISTS idx_party_members_user_role;
DROP INDEX IF EXISTS idx_parties_status_game;
DROP INDEX IF EXISTS idx_gaming_activity_user_date;
DROP INDEX IF EXISTS idx_gaming_activity_date_hours;
DROP INDEX IF EXISTS idx_user_games_user_platform;
DROP INDEX IF EXISTS idx_user_games_platform_playtime;
DROP INDEX IF EXISTS idx_transactions_user_date;
DROP INDEX IF EXISTS idx_transactions_type_date;
DROP INDEX IF EXISTS idx_friendships_user_status;
DROP INDEX IF EXISTS idx_friendships_friend_status;

-- Party system indexes
CREATE INDEX idx_party_members_party_user 
  ON party_members(party_id, user_id);

CREATE INDEX idx_party_members_user_role 
  ON party_members(user_id, role) WHERE role IN ('leader', 'moderator');

CREATE INDEX idx_parties_status_game 
  ON parties(status, game_name) WHERE status = 'open';

-- Gaming activity indexes
CREATE INDEX idx_gaming_activity_user_date 
  ON gaming_activity(user_id, activity_date DESC);

CREATE INDEX idx_gaming_activity_date_hours 
  ON gaming_activity(activity_date DESC, total_hours) 
  WHERE total_hours > 0;

-- User games indexes
CREATE INDEX idx_user_games_user_platform 
  ON user_games(user_id, platform, last_played_at DESC NULLS LAST);

CREATE INDEX idx_user_games_platform_playtime 
  ON user_games(platform, total_playtime DESC NULLS LAST);

-- Transaction indexes
CREATE INDEX idx_transactions_user_date 
  ON token_transactions(user_id, created_at DESC);

CREATE INDEX idx_transactions_type_date 
  ON token_transactions(type, created_at DESC);

-- Friends system indexes
CREATE INDEX idx_friendships_user_status 
  ON friendships(user_id, status);

CREATE INDEX idx_friendships_friend_status 
  ON friendships(friend_id, status);

-- Chat indexes
DROP INDEX IF EXISTS idx_chat_messages_room_created;
DROP INDEX IF EXISTS idx_dm_messages_room_created;
CREATE INDEX idx_chat_messages_room_created 
  ON chat_messages(room_id, created_at DESC);

CREATE INDEX idx_dm_messages_room_created 
  ON dm_messages(room_id, created_at DESC);

-- Quest indexes
DROP INDEX IF EXISTS idx_user_quest_progress_user_completed;
CREATE INDEX idx_user_quest_progress_user_completed 
  ON user_quest_progress(user_id, is_completed);

-- =====================================================
-- 2. DATA VALIDATION CONSTRAINTS
-- =====================================================

-- Profiles constraints
ALTER TABLE profiles 
  DROP CONSTRAINT IF EXISTS check_positive_balance,
  ADD CONSTRAINT check_positive_balance 
  CHECK (token_balance >= 0);

ALTER TABLE profiles 
  DROP CONSTRAINT IF EXISTS check_positive_earned,
  ADD CONSTRAINT check_positive_earned 
  CHECK (total_earned >= 0);

ALTER TABLE profiles 
  DROP CONSTRAINT IF EXISTS check_spent_not_exceed_earned,
  ADD CONSTRAINT check_spent_not_exceed_earned 
  CHECK (total_spent <= total_earned);

-- Parties constraints
-- Fix existing invalid data first
UPDATE parties 
SET current_size = GREATEST(0, current_size)
WHERE current_size < 0;

UPDATE parties 
SET current_size = party_size
WHERE current_size > party_size;

ALTER TABLE parties 
  DROP CONSTRAINT IF EXISTS check_party_size_valid,
  ADD CONSTRAINT check_party_size_valid 
  CHECK (party_size BETWEEN 2 AND 50);

ALTER TABLE parties 
  DROP CONSTRAINT IF EXISTS check_current_size_valid,
  ADD CONSTRAINT check_current_size_valid 
  CHECK (current_size >= 0 AND current_size <= party_size);

-- User games constraints
ALTER TABLE user_games 
  DROP CONSTRAINT IF EXISTS check_positive_playtime,
  ADD CONSTRAINT check_positive_playtime 
  CHECK (total_playtime >= 0);

ALTER TABLE user_games 
  DROP CONSTRAINT IF EXISTS check_positive_hours,
  ADD CONSTRAINT check_positive_hours 
  CHECK (hours_played >= 0);

-- Token transactions constraints
ALTER TABLE token_transactions 
  DROP CONSTRAINT IF EXISTS check_nonzero_amount,
  ADD CONSTRAINT check_nonzero_amount 
  CHECK (amount != 0);

-- =====================================================
-- 3. SOFT DELETES INFRASTRUCTURE
-- =====================================================

-- Add deleted_at columns to key tables
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE parties ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE dm_messages ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE marketplace_items ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Add deleted_by columns for audit
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES profiles(id);
ALTER TABLE parties ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES profiles(id);

-- Create indexes on deleted_at for filtering
DROP INDEX IF EXISTS idx_profiles_deleted;
DROP INDEX IF EXISTS idx_parties_deleted;
DROP INDEX IF EXISTS idx_chat_messages_deleted;

CREATE INDEX idx_profiles_deleted 
  ON profiles(deleted_at) WHERE deleted_at IS NULL;

CREATE INDEX idx_parties_deleted 
  ON parties(deleted_at) WHERE deleted_at IS NULL;

CREATE INDEX idx_chat_messages_deleted 
  ON chat_messages(deleted_at) WHERE deleted_at IS NULL;

-- =====================================================
-- 4. MATERIALIZED VIEWS FOR PERFORMANCE
-- =====================================================
-- Note: Materialized views temporarily disabled due to schema conflicts
-- These can be created manually after migration if needed

-- DROP MATERIALIZED VIEW IF EXISTS leaderboard_cache CASCADE;
-- DROP MATERIALIZED VIEW IF EXISTS gaming_activity_summary CASCADE;
-- DROP MATERIALIZED VIEW IF EXISTS popular_games_cache CASCADE;

-- Leaderboard materialized view (disabled)
-- CREATE MATERIALIZED VIEW leaderboard_cache AS
-- SELECT 
--   p.id,
--   p.username,
--   p.avatar_url,
--   p.total_earned,
--   p.total_spent,
--   p.token_balance,
--   RANK() OVER (ORDER BY p.total_earned DESC) as rank,
--   COUNT(DISTINCT ug.id) as games_count,
--   COALESCE(SUM(ug.total_playtime), 0) as total_playtime_minutes
-- FROM profiles p
-- LEFT JOIN user_games ug ON p.id = ug.user_id
-- WHERE p.deleted_at IS NULL
-- GROUP BY p.id, p.username, p.avatar_url, p.total_earned, p.total_spent, p.token_balance
-- ORDER BY p.total_earned DESC
-- LIMIT 1000;

-- Gaming activity summary view (disabled)
-- CREATE MATERIALIZED VIEW gaming_activity_summary AS
-- SELECT 
--   user_id,
--   activity_date as activity_day,
--   games_played as session_count,
--   total_hours,
--   achievements_earned
-- FROM gaming_activity
-- ORDER BY activity_date DESC
-- LIMIT 10000;

-- Popular games view (disabled)
-- CREATE MATERIALIZED VIEW popular_games_cache AS
-- SELECT 
--   game_name,
--   platform,
--   COUNT(DISTINCT user_id) as player_count,
--   SUM(total_playtime) as total_minutes,
--   AVG(total_playtime) as avg_minutes_per_player,
--   MAX(last_played_at) as last_activity
-- FROM user_games
-- WHERE last_played_at IS NOT NULL
-- GROUP BY game_name, platform
-- ORDER BY player_count DESC
-- LIMIT 500;

-- =====================================================
-- 5. AUDIT LOG SYSTEM
-- =====================================================

-- Create audit log table
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  record_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  user_id uuid REFERENCES profiles(id),
  old_values jsonb,
  new_values jsonb,
  changed_fields text[],
  ip_address inet,
  user_agent text,
  created_at timestamptz DEFAULT NOW()
);

-- Indexes for audit logs
DROP INDEX IF EXISTS idx_audit_logs_table_record;
DROP INDEX IF EXISTS idx_audit_logs_user_created;
DROP INDEX IF EXISTS idx_audit_logs_action_created;

CREATE INDEX idx_audit_logs_table_record 
  ON audit_logs(table_name, record_id);

CREATE INDEX idx_audit_logs_user_created 
  ON audit_logs(user_id, created_at DESC);

CREATE INDEX idx_audit_logs_action_created 
  ON audit_logs(action, created_at DESC);

-- Enable RLS on audit logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Only service role can read audit logs (no regular user access)
-- Note: profiles table doesn't have a role column for admin checks
-- Audit logs will only be accessible via service role API calls
DROP POLICY IF EXISTS "Admins can read audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Service role can read audit logs" ON audit_logs;
CREATE POLICY "Service role can read audit logs"
  ON audit_logs FOR SELECT
  USING (auth.role() = 'service_role');

-- =====================================================
-- 6. AUTOMATED CLEANUP FUNCTIONS
-- =====================================================

-- Function to clean up orphaned parties
CREATE OR REPLACE FUNCTION cleanup_orphaned_parties()
RETURNS void AS $$
BEGIN
  -- Mark parties as deleted if leader is offline for 24+ hours
  UPDATE parties p
  SET 
    status = 'closed',
    deleted_at = NOW()
  FROM profiles prof
  WHERE p.leader_id = prof.id
    AND p.status = 'open'
    AND p.deleted_at IS NULL
    AND (prof.last_seen < NOW() - INTERVAL '24 hours' OR prof.status = 'offline')
    AND NOT EXISTS (
      SELECT 1 FROM party_members pm
      WHERE pm.party_id = p.id
      AND pm.user_id != p.leader_id
    );
    
  RAISE NOTICE 'Cleaned up orphaned parties';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to expire old party invites
CREATE OR REPLACE FUNCTION expire_old_party_invites()
RETURNS void AS $$
BEGIN
  UPDATE party_invites
  SET status = 'expired'
  WHERE status = 'pending'
    AND created_at < NOW() - INTERVAL '24 hours';
    
  RAISE NOTICE 'Expired old party invites';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to refresh materialized views (disabled - views not created)
-- CREATE OR REPLACE FUNCTION refresh_all_materialized_views()
-- RETURNS void AS $$
-- BEGIN
--   REFRESH MATERIALIZED VIEW CONCURRENTLY leaderboard_cache;
--   REFRESH MATERIALIZED VIEW CONCURRENTLY gaming_activity_summary;
--   REFRESH MATERIALIZED VIEW CONCURRENTLY popular_games_cache;
--   RAISE NOTICE 'Refreshed all materialized views';
-- END;
-- $$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 7. PARTY SYSTEM IMPROVEMENTS
-- =====================================================

-- Add party roles and permissions
ALTER TABLE party_members ADD COLUMN IF NOT EXISTS permissions jsonb DEFAULT '{"can_invite": false, "can_kick": false}'::jsonb;

-- Fix party_bans table if it exists with wrong column name
DO $$ 
BEGIN
  -- Rename banned_user_id to user_id if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'party_bans' AND column_name = 'banned_user_id'
  ) THEN
    ALTER TABLE party_bans RENAME COLUMN banned_user_id TO user_id;
    RAISE NOTICE 'Renamed party_bans.banned_user_id to user_id';
  END IF;
  
  -- Rename banned_at to created_at if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'party_bans' AND column_name = 'banned_at'
  ) THEN
    ALTER TABLE party_bans RENAME COLUMN banned_at TO created_at;
    RAISE NOTICE 'Renamed party_bans.banned_at to created_at';
  END IF;
END $$;

-- Add ban list for parties
CREATE TABLE IF NOT EXISTS party_bans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  party_id uuid REFERENCES parties(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  banned_by uuid REFERENCES profiles(id) NOT NULL,
  reason text,
  created_at timestamptz DEFAULT NOW(),
  expires_at timestamptz,
  UNIQUE(party_id, user_id)
);

-- Index for party bans (no WHERE clause with NOW() as it's not immutable)
DROP INDEX IF EXISTS idx_party_bans_party_user;
CREATE INDEX idx_party_bans_party_user 
  ON party_bans(party_id, user_id);

-- Enable RLS
ALTER TABLE party_bans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view bans in their parties" ON party_bans;
CREATE POLICY "Users can view bans in their parties"
  ON party_bans FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM party_members
      WHERE party_id = party_bans.party_id
      AND user_id = auth.uid()
    )
  );

-- Safe party join function with race condition protection
CREATE OR REPLACE FUNCTION join_party_safe(
  p_party_id UUID,
  p_user_id UUID
)
RETURNS jsonb AS $$
DECLARE
  v_party parties%ROWTYPE;
  v_is_banned BOOLEAN;
BEGIN
  -- Lock the party row
  SELECT * INTO v_party
  FROM parties
  WHERE id = p_party_id
  FOR UPDATE;

  -- Check if party exists
  IF v_party.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Party not found');
  END IF;

  -- Check if party is full
  IF v_party.current_size >= v_party.party_size THEN
    RETURN jsonb_build_object('success', false, 'error', 'Party is full');
  END IF;

  -- Check if user is banned
  SELECT EXISTS (
    SELECT 1 FROM party_bans
    WHERE party_id = p_party_id
    AND user_id = p_user_id
    AND (expires_at IS NULL OR expires_at > NOW())
  ) INTO v_is_banned;

  IF v_is_banned THEN
    RETURN jsonb_build_object('success', false, 'error', 'You are banned from this party');
  END IF;

  -- Check if already a member
  IF EXISTS (
    SELECT 1 FROM party_members
    WHERE party_id = p_party_id
    AND user_id = p_user_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already a member');
  END IF;

  -- Add member
  INSERT INTO party_members (party_id, user_id, role)
  VALUES (p_party_id, p_user_id, 'member');

  -- Increment party size
  UPDATE parties
  SET current_size = current_size + 1
  WHERE id = p_party_id;

  RETURN jsonb_build_object('success', true, 'message', 'Joined party successfully');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Kick member function
CREATE OR REPLACE FUNCTION kick_party_member(
  p_party_id UUID,
  p_user_id UUID,
  p_target_user_id UUID
)
RETURNS jsonb AS $$
DECLARE
  v_user_role TEXT;
  v_target_role TEXT;
BEGIN
  -- Get user role
  SELECT role INTO v_user_role
  FROM party_members
  WHERE party_id = p_party_id AND user_id = p_user_id;

  -- Check permissions
  IF v_user_role NOT IN ('leader', 'moderator') THEN
    RETURN jsonb_build_object('success', false, 'error', 'No permission to kick');
  END IF;

  -- Get target role
  SELECT role INTO v_target_role
  FROM party_members
  WHERE party_id = p_party_id AND user_id = p_target_user_id;

  -- Can't kick the leader
  IF v_target_role = 'leader' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot kick the party leader');
  END IF;

  -- Moderators can't kick other moderators
  IF v_user_role = 'moderator' AND v_target_role = 'moderator' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot kick other moderators');
  END IF;

  -- Remove member
  DELETE FROM party_members
  WHERE party_id = p_party_id AND user_id = p_target_user_id;

  RETURN jsonb_build_object('success', true, 'message', 'Member kicked successfully');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 8. TOKEN ECONOMY IMPROVEMENTS
-- =====================================================

-- Add transaction locking for double-spend prevention
CREATE OR REPLACE FUNCTION transfer_tokens_safe(
  p_from_user_id UUID,
  p_to_user_id UUID,
  p_amount INTEGER,
  p_description TEXT
)
RETURNS jsonb AS $$
DECLARE
  v_from_balance INTEGER;
BEGIN
  -- Lock the sender's profile row
  SELECT token_balance INTO v_from_balance
  FROM profiles
  WHERE id = p_from_user_id
  FOR UPDATE;

  -- Check balance
  IF v_from_balance < p_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance');
  END IF;

  -- Deduct from sender
  UPDATE profiles
  SET 
    token_balance = token_balance - p_amount,
    total_spent = total_spent + p_amount
  WHERE id = p_from_user_id;

  -- Add to receiver
  UPDATE profiles
  SET 
    token_balance = token_balance + p_amount,
    total_earned = total_earned + p_amount
  WHERE id = p_to_user_id;

  -- Log transactions
  INSERT INTO token_transactions (user_id, amount, type, description)
  VALUES 
    (p_from_user_id, -p_amount, 'transfer_out', p_description),
    (p_to_user_id, p_amount, 'transfer_in', p_description);

  RETURN jsonb_build_object('success', true, 'message', 'Transfer completed');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add token burn mechanics
CREATE TABLE IF NOT EXISTS token_burns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  amount integer NOT NULL CHECK (amount > 0),
  reason text NOT NULL,
  metadata jsonb,
  created_at timestamptz DEFAULT NOW()
);

DROP INDEX IF EXISTS idx_token_burns_user_created;
CREATE INDEX idx_token_burns_user_created 
  ON token_burns(user_id, created_at DESC);

ALTER TABLE token_burns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own burns" ON token_burns;
CREATE POLICY "Users can view own burns"
  ON token_burns FOR SELECT
  USING (user_id = auth.uid());

-- Function to burn tokens
CREATE OR REPLACE FUNCTION burn_tokens(
  p_user_id UUID,
  p_amount INTEGER,
  p_reason TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS jsonb AS $$
DECLARE
  v_balance INTEGER;
BEGIN
  -- Lock user profile
  SELECT token_balance INTO v_balance
  FROM profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF v_balance < p_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance');
  END IF;

  -- Burn tokens
  UPDATE profiles
  SET 
    token_balance = token_balance - p_amount,
    total_spent = total_spent + p_amount
  WHERE id = p_user_id;

  -- Log burn
  INSERT INTO token_burns (user_id, amount, reason, metadata)
  VALUES (p_user_id, p_amount, p_reason, p_metadata);

  -- Log transaction
  INSERT INTO token_transactions (user_id, amount, type, description)
  VALUES (p_user_id, -p_amount, 'burn', p_reason);

  RETURN jsonb_build_object('success', true, 'message', 'Tokens burned successfully');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 9. GRANT PERMISSIONS
-- =====================================================

GRANT EXECUTE ON FUNCTION cleanup_orphaned_parties TO authenticated;
GRANT EXECUTE ON FUNCTION expire_old_party_invites TO authenticated;
-- GRANT EXECUTE ON FUNCTION refresh_all_materialized_views TO authenticated; -- Function disabled
GRANT EXECUTE ON FUNCTION join_party_safe TO authenticated;
GRANT EXECUTE ON FUNCTION kick_party_member TO authenticated;
GRANT EXECUTE ON FUNCTION transfer_tokens_safe TO authenticated;
GRANT EXECUTE ON FUNCTION burn_tokens TO authenticated;

-- =====================================================
-- VERIFICATION
-- =====================================================

DO $$ 
BEGIN
  RAISE NOTICE '✅ Database improvements applied successfully!';
  RAISE NOTICE '======================================';
  RAISE NOTICE 'Applied:';
  RAISE NOTICE '  ✓ Composite indexes for performance';
  RAISE NOTICE '  ✓ Data validation constraints';
  RAISE NOTICE '  ✓ Soft delete infrastructure';
  RAISE NOTICE '  ⊘ Materialized views (skipped due to schema conflicts)';
  RAISE NOTICE '  ✓ Audit log system';
  RAISE NOTICE '  ✓ Automated cleanup functions';
  RAISE NOTICE '  ✓ Party system improvements (bans, safe joins, kick system)';
  RAISE NOTICE '  ✓ Token economy improvements (double-spend prevention, burns)';
  RAISE NOTICE '======================================';
  RAISE NOTICE 'Next: Set up cron jobs to run:';
  RAISE NOTICE '  - cleanup_orphaned_parties() every hour';
  RAISE NOTICE '  - expire_old_party_invites() every hour';
  RAISE NOTICE '======================================';
  RAISE NOTICE 'Note: Materialized views were skipped due to schema conflicts.';
END $$;

