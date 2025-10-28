-- =====================================================
-- REAL-TIME PLAYTIME TRACKING SYSTEM
-- =====================================================

-- Create quests table if it doesn't exist
CREATE TABLE IF NOT EXISTS quests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  quest_type TEXT NOT NULL DEFAULT 'daily', -- daily, weekly, special
  required_count DECIMAL NOT NULL DEFAULT 1,
  reward_tokens INTEGER NOT NULL DEFAULT 100,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- Index for active quests
CREATE INDEX IF NOT EXISTS idx_quests_active ON quests(quest_type, is_active);

-- RLS for quests
ALTER TABLE quests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active quests" ON quests;
CREATE POLICY "Anyone can view active quests"
  ON quests FOR SELECT
  USING (is_active = TRUE);

-- Function to update playtime for a user's game
CREATE OR REPLACE FUNCTION update_playtime(
  p_user_id UUID,
  p_game_name TEXT,
  p_hours_to_add DECIMAL,
  p_platform TEXT DEFAULT 'PC'
)
RETURNS VOID AS $$
BEGIN
  -- Insert or update user_games
  INSERT INTO user_games (
    user_id,
    game_name,
    platform,
    total_playtime_hours,
    last_played,
    created_at
  )
  VALUES (
    p_user_id,
    p_game_name,
    p_platform,
    p_hours_to_add,
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id, game_name)
  DO UPDATE SET
    total_playtime_hours = user_games.total_playtime_hours + p_hours_to_add,
    last_played = NOW();

  -- Update gaming_activity table (daily aggregate)
  INSERT INTO gaming_activity (
    user_id,
    game_name,
    activity_type,
    hours_played,
    activity_date,
    tokens_earned
  )
  VALUES (
    p_user_id,
    p_game_name,
    'game_session',
    p_hours_to_add,
    CURRENT_DATE,
    FLOOR(p_hours_to_add * 50)::INTEGER
  )
  ON CONFLICT (user_id, activity_date, game_name)
  DO UPDATE SET
    hours_played = gaming_activity.hours_played + p_hours_to_add,
    tokens_earned = gaming_activity.tokens_earned + FLOOR(p_hours_to_add * 50)::INTEGER;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update quest progress
CREATE OR REPLACE FUNCTION update_quest_progress(
  p_quest_id UUID,
  p_user_id UUID,
  p_progress_increment DECIMAL
)
RETURNS VOID AS $$
DECLARE
  v_quest RECORD;
  v_new_progress DECIMAL;
  v_is_complete BOOLEAN;
BEGIN
  -- Get quest details
  SELECT * INTO v_quest
  FROM quests
  WHERE id = p_quest_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Calculate new progress
  v_new_progress := COALESCE(
    (SELECT current_progress FROM user_quest_progress WHERE user_id = p_user_id AND quest_id = p_quest_id),
    0
  ) + p_progress_increment;

  -- Check if complete
  v_is_complete := v_new_progress >= v_quest.required_count;

  -- Upsert progress
  INSERT INTO user_quest_progress (
    user_id,
    quest_id,
    current_progress,
    is_completed,
    completed_at
  )
  VALUES (
    p_user_id,
    p_quest_id,
    v_new_progress,
    v_is_complete,
    CASE WHEN v_is_complete THEN NOW() ELSE NULL END
  )
  ON CONFLICT (user_id, quest_id)
  DO UPDATE SET
    current_progress = v_new_progress,
    is_completed = v_is_complete,
    completed_at = CASE WHEN v_is_complete AND user_quest_progress.completed_at IS NULL THEN NOW() ELSE user_quest_progress.completed_at END;

  -- Award tokens if completed
  IF v_is_complete THEN
    PERFORM add_tokens(p_user_id, v_quest.reward_tokens, 'quest_completion');
  END IF;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add tokens to user
CREATE OR REPLACE FUNCTION add_tokens(
  p_user_id UUID,
  p_amount INTEGER,
  p_source TEXT DEFAULT 'gameplay'
)
RETURNS VOID AS $$
BEGIN
  -- Update profile token balance
  UPDATE profiles
  SET 
    token_balance = token_balance + p_amount,
    total_earned = total_earned + p_amount
  WHERE id = p_user_id;

  -- Log transaction
  INSERT INTO token_transactions (
    user_id,
    amount,
    transaction_type,
    description,
    created_at
  )
  VALUES (
    p_user_id,
    p_amount,
    'earn',
    'Earned from ' || p_source,
    NOW()
  );

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create user_quest_progress table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_quest_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  quest_id UUID NOT NULL REFERENCES quests(id) ON DELETE CASCADE,
  current_progress DECIMAL DEFAULT 0,
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, quest_id)
);

-- Create active_gaming_sessions table for real-time tracking
CREATE TABLE IF NOT EXISTS active_gaming_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  game_name TEXT NOT NULL,
  game_id TEXT,
  platform TEXT DEFAULT 'PC',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  last_heartbeat TIMESTAMPTZ DEFAULT NOW(),
  session_duration_hours DECIMAL DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_active_sessions_user ON active_gaming_sessions(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_quest_progress_user ON user_quest_progress(user_id, is_completed);
CREATE INDEX IF NOT EXISTS idx_gaming_activity_date ON gaming_activity(user_id, activity_date);

-- RLS Policies
ALTER TABLE user_quest_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE active_gaming_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own quest progress"
  ON user_quest_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own quest progress"
  ON user_quest_progress FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own active sessions"
  ON active_gaming_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own sessions"
  ON active_gaming_sessions FOR ALL
  USING (auth.uid() = user_id);

-- Function to get or create active session
CREATE OR REPLACE FUNCTION get_or_create_session(
  p_user_id UUID,
  p_game_name TEXT,
  p_game_id TEXT,
  p_platform TEXT
)
RETURNS UUID AS $$
DECLARE
  v_session_id UUID;
BEGIN
  -- Try to get existing active session for this game
  SELECT id INTO v_session_id
  FROM active_gaming_sessions
  WHERE user_id = p_user_id
    AND game_name = p_game_name
    AND is_active = TRUE
  LIMIT 1;

  -- If no active session, create one
  IF v_session_id IS NULL THEN
    -- End any other active sessions first
    UPDATE active_gaming_sessions
    SET is_active = FALSE
    WHERE user_id = p_user_id AND is_active = TRUE;

    -- Create new session
    INSERT INTO active_gaming_sessions (
      user_id,
      game_name,
      game_id,
      platform,
      started_at,
      last_heartbeat
    )
    VALUES (
      p_user_id,
      p_game_name,
      p_game_id,
      p_platform,
      NOW(),
      NOW()
    )
    RETURNING id INTO v_session_id;
  ELSE
    -- Update heartbeat
    UPDATE active_gaming_sessions
    SET last_heartbeat = NOW()
    WHERE id = v_session_id;
  END IF;

  RETURN v_session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to end a gaming session
CREATE OR REPLACE FUNCTION end_gaming_session(
  p_session_id UUID
)
RETURNS VOID AS $$
DECLARE
  v_session RECORD;
  v_duration_hours DECIMAL;
BEGIN
  -- Get session details
  SELECT * INTO v_session
  FROM active_gaming_sessions
  WHERE id = p_session_id AND is_active = TRUE;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Calculate duration
  v_duration_hours := EXTRACT(EPOCH FROM (NOW() - v_session.started_at)) / 3600.0;

  -- Update session
  UPDATE active_gaming_sessions
  SET 
    is_active = FALSE,
    session_duration_hours = v_duration_hours
  WHERE id = p_session_id;

  -- Update playtime
  PERFORM update_playtime(
    v_session.user_id,
    v_session.game_name,
    v_duration_hours,
    v_session.platform
  );

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Realtime publication for active sessions
ALTER PUBLICATION supabase_realtime ADD TABLE active_gaming_sessions;

COMMENT ON TABLE active_gaming_sessions IS 'Tracks real-time gaming sessions for playtime monitoring';
COMMENT ON TABLE user_quest_progress IS 'Tracks individual user progress on quests';
COMMENT ON FUNCTION update_playtime IS 'Updates user playtime and awards tokens';
COMMENT ON FUNCTION update_quest_progress IS 'Updates quest progress and awards tokens on completion';
COMMENT ON FUNCTION add_tokens IS 'Adds tokens to user balance and logs transaction';

-- Insert sample daily quests
INSERT INTO quests (title, description, quest_type, required_count, reward_tokens, is_active)
VALUES
  ('Win 3 Matches', 'Achieve victory in any competitive game', 'daily', 3, 150, TRUE),
  ('Play for 2 Hours', 'Log 2 hours of gaming time today', 'daily', 2, 200, TRUE),
  ('Unlock 1 Achievement', 'Complete any in-game achievement', 'daily', 1, 100, TRUE)
ON CONFLICT DO NOTHING;

