-- WebRTC Signaling Tables
-- Handles peer-to-peer connection signaling for voice/video chat

-- ============================================
-- 1. WEBRTC SIGNALS TABLE
-- ============================================

-- Store WebRTC signaling messages (offers, answers, ICE candidates)
CREATE TABLE IF NOT EXISTS webrtc_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  party_id UUID NOT NULL,
  from_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  to_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  signal_type TEXT NOT NULL CHECK (signal_type IN ('offer', 'answer', 'ice-candidate')),
  signal_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_webrtc_signals_party ON webrtc_signals(party_id);
CREATE INDEX IF NOT EXISTS idx_webrtc_signals_to_user ON webrtc_signals(to_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webrtc_signals_from_user ON webrtc_signals(from_user_id);

-- Enable RLS
ALTER TABLE webrtc_signals ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can send signals to party members" ON webrtc_signals
  FOR INSERT WITH CHECK (
    auth.uid() = from_user_id
    AND EXISTS (
      SELECT 1 FROM party_members pm
      WHERE pm.party_id = webrtc_signals.party_id
      AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view signals sent to them" ON webrtc_signals
  FOR SELECT USING (
    auth.uid() = to_user_id
    OR auth.uid() = from_user_id
  );

CREATE POLICY "Users can delete their own signals" ON webrtc_signals
  FOR DELETE USING (auth.uid() = from_user_id);

-- ============================================
-- 2. VOICE CHAT SESSIONS TABLE
-- ============================================

-- Track active voice chat sessions
CREATE TABLE IF NOT EXISTS voice_chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  party_id UUID NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  is_muted BOOLEAN DEFAULT false,
  is_deafened BOOLEAN DEFAULT false,
  is_speaking BOOLEAN DEFAULT false,
  joined_at TIMESTAMPTZ DEFAULT now(),
  last_activity TIMESTAMPTZ DEFAULT now(),
  UNIQUE(party_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_voice_sessions_party ON voice_chat_sessions(party_id);
CREATE INDEX IF NOT EXISTS idx_voice_sessions_user ON voice_chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_voice_sessions_activity ON voice_chat_sessions(last_activity);

-- Enable RLS
ALTER TABLE voice_chat_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view sessions in their party" ON voice_chat_sessions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM party_members pm
      WHERE pm.party_id = voice_chat_sessions.party_id
      AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create their own session" ON voice_chat_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own session" ON voice_chat_sessions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own session" ON voice_chat_sessions
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- 3. HELPER FUNCTIONS
-- ============================================

-- Function to clean up old signals (older than 1 hour)
CREATE OR REPLACE FUNCTION cleanup_old_signals()
RETURNS void AS $$
BEGIN
  DELETE FROM webrtc_signals
  WHERE created_at < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up inactive voice sessions (no activity for 5 minutes)
CREATE OR REPLACE FUNCTION cleanup_inactive_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM voice_chat_sessions
  WHERE last_activity < NOW() - INTERVAL '5 minutes';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update session activity
CREATE OR REPLACE FUNCTION update_session_activity()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_activity = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update last_activity
DROP TRIGGER IF EXISTS update_voice_session_activity ON voice_chat_sessions;
CREATE TRIGGER update_voice_session_activity
  BEFORE UPDATE ON voice_chat_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_session_activity();

-- Function to get active voice participants
CREATE OR REPLACE FUNCTION get_voice_participants(p_party_id UUID)
RETURNS TABLE (
  user_id UUID,
  username TEXT,
  is_muted BOOLEAN,
  is_deafened BOOLEAN,
  is_speaking BOOLEAN,
  joined_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    vcs.user_id,
    p.username,
    vcs.is_muted,
    vcs.is_deafened,
    vcs.is_speaking,
    vcs.joined_at
  FROM voice_chat_sessions vcs
  JOIN profiles p ON p.id = vcs.user_id
  WHERE vcs.party_id = p_party_id
  ORDER BY vcs.joined_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to join voice chat
CREATE OR REPLACE FUNCTION join_voice_chat(
  p_party_id UUID,
  p_user_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  -- Check if user is in the party
  IF NOT EXISTS (
    SELECT 1 FROM party_members
    WHERE party_id = p_party_id AND user_id = p_user_id
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User is not a member of this party'
    );
  END IF;

  -- Create or update session
  INSERT INTO voice_chat_sessions (party_id, user_id)
  VALUES (p_party_id, p_user_id)
  ON CONFLICT (party_id, user_id)
  DO UPDATE SET
    last_activity = NOW(),
    is_muted = false,
    is_deafened = false;

  v_result := json_build_object(
    'success', true,
    'message', 'Joined voice chat'
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to leave voice chat
CREATE OR REPLACE FUNCTION leave_voice_chat(
  p_party_id UUID,
  p_user_id UUID
)
RETURNS JSON AS $$
BEGIN
  DELETE FROM voice_chat_sessions
  WHERE party_id = p_party_id AND user_id = p_user_id;

  RETURN json_build_object(
    'success', true,
    'message', 'Left voice chat'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update voice state
CREATE OR REPLACE FUNCTION update_voice_state(
  p_party_id UUID,
  p_user_id UUID,
  p_is_muted BOOLEAN DEFAULT NULL,
  p_is_deafened BOOLEAN DEFAULT NULL,
  p_is_speaking BOOLEAN DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_updated INTEGER;
BEGIN
  UPDATE voice_chat_sessions
  SET
    is_muted = COALESCE(p_is_muted, is_muted),
    is_deafened = COALESCE(p_is_deafened, is_deafened),
    is_speaking = COALESCE(p_is_speaking, is_speaking),
    last_activity = NOW()
  WHERE party_id = p_party_id AND user_id = p_user_id;

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  IF v_updated > 0 THEN
    RETURN json_build_object(
      'success', true,
      'message', 'Voice state updated'
    );
  ELSE
    RETURN json_build_object(
      'success', false,
      'error', 'Session not found'
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 4. GRANT PERMISSIONS
-- ============================================

GRANT ALL ON webrtc_signals TO authenticated;
GRANT ALL ON voice_chat_sessions TO authenticated;

GRANT EXECUTE ON FUNCTION cleanup_old_signals TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_inactive_sessions TO authenticated;
GRANT EXECUTE ON FUNCTION get_voice_participants TO authenticated;
GRANT EXECUTE ON FUNCTION join_voice_chat TO authenticated;
GRANT EXECUTE ON FUNCTION leave_voice_chat TO authenticated;
GRANT EXECUTE ON FUNCTION update_voice_state TO authenticated;

-- ============================================
-- 5. CLEANUP SCHEDULED TASKS (Optional)
-- ============================================

-- Note: You can set up a cron job or Edge Function to periodically call:
-- SELECT cleanup_old_signals();
-- SELECT cleanup_inactive_sessions();

COMMENT ON TABLE webrtc_signals IS 'Stores WebRTC signaling messages for peer connections';
COMMENT ON TABLE voice_chat_sessions IS 'Tracks active voice chat participants and their states';
COMMENT ON FUNCTION cleanup_old_signals IS 'Removes WebRTC signals older than 1 hour';
COMMENT ON FUNCTION cleanup_inactive_sessions IS 'Removes voice sessions inactive for 5+ minutes';

