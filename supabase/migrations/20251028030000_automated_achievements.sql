-- Automated Achievement Detection System
-- Background worker, webhooks, auto-claim tokens

-- Add automation fields to user_achievements
ALTER TABLE user_achievements ADD COLUMN IF NOT EXISTS auto_detected BOOLEAN DEFAULT FALSE;
ALTER TABLE user_achievements ADD COLUMN IF NOT EXISTS synced_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE user_achievements ADD COLUMN IF NOT EXISTS tokens_claimed BOOLEAN DEFAULT FALSE;

-- Create achievement sync log table
CREATE TABLE IF NOT EXISTS achievement_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  gaming_account_id UUID REFERENCES gaming_accounts(id) ON DELETE CASCADE,
  game_id TEXT NOT NULL,
  achievements_synced INTEGER DEFAULT 0,
  tokens_awarded INTEGER DEFAULT 0,
  sync_status TEXT DEFAULT 'success' CHECK (sync_status IN ('success', 'failed', 'partial')),
  error_message TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE achievement_sync_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "achievement_sync_log_select" ON achievement_sync_log FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "achievement_sync_log_insert" ON achievement_sync_log FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Function to auto-claim tokens for achievements
CREATE OR REPLACE FUNCTION auto_claim_achievement_tokens(
  p_user_id UUID,
  p_achievement_id UUID
)
RETURNS INTEGER AS $$
DECLARE
  v_tokens INTEGER;
  v_already_claimed BOOLEAN;
BEGIN
  -- Get achievement details
  SELECT tokens_awarded, tokens_claimed
  INTO v_tokens, v_already_claimed
  FROM user_achievements
  WHERE id = p_achievement_id
  AND user_id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Achievement not found';
  END IF;

  IF v_already_claimed THEN
    RETURN 0; -- Already claimed
  END IF;

  -- Award tokens
  UPDATE profiles
  SET token_balance = token_balance + v_tokens,
      total_tokens = COALESCE(total_tokens, 0) + v_tokens
  WHERE id = p_user_id;

  -- Mark as claimed
  UPDATE user_achievements
  SET tokens_claimed = TRUE
  WHERE id = p_achievement_id;

  -- Create notification
  PERFORM create_notification_from_template(
    p_user_id,
    'achievement_unlocked',
    jsonb_build_object(
      'achievement_name', (SELECT achievement_name FROM user_achievements WHERE id = p_achievement_id),
      'tokens', v_tokens
    )
  );

  -- Log activity
  INSERT INTO user_activity_log (user_id, activity_type, activity_data)
  VALUES (
    p_user_id,
    'achievement_unlocked',
    jsonb_build_object(
      'achievement_id', p_achievement_id,
      'tokens', v_tokens
    )
  );

  RETURN v_tokens;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to process new achievements and auto-claim
CREATE OR REPLACE FUNCTION process_new_achievements()
RETURNS TABLE(user_id UUID, achievements_processed INTEGER, tokens_claimed INTEGER) AS $$
DECLARE
  v_achievement RECORD;
  v_total_tokens INTEGER := 0;
  v_total_achievements INTEGER := 0;
  v_current_user_id UUID := NULL;
BEGIN
  FOR v_achievement IN
    SELECT ua.id, ua.user_id, ua.tokens_awarded
    FROM user_achievements ua
    WHERE NOT ua.tokens_claimed
    AND ua.unlock_time >= NOW() - INTERVAL '1 hour'
    ORDER BY ua.user_id, ua.unlock_time
  LOOP
    -- Track user changes
    IF v_current_user_id IS NULL OR v_current_user_id != v_achievement.user_id THEN
      IF v_current_user_id IS NOT NULL THEN
        -- Return previous user's results
        RETURN QUERY SELECT v_current_user_id, v_total_achievements, v_total_tokens;
      END IF;
      
      v_current_user_id := v_achievement.user_id;
      v_total_achievements := 0;
      v_total_tokens := 0;
    END IF;

    -- Process achievement
    v_total_tokens := v_total_tokens + auto_claim_achievement_tokens(v_achievement.user_id, v_achievement.id);
    v_total_achievements := v_total_achievements + 1;
  END LOOP;

  -- Return last user's results
  IF v_current_user_id IS NOT NULL THEN
    RETURN QUERY SELECT v_current_user_id, v_total_achievements, v_total_tokens;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to sync achievements for a user
CREATE OR REPLACE FUNCTION sync_user_achievements(
  p_user_id UUID,
  p_gaming_account_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_sync_log_id UUID;
BEGIN
  -- Create sync log entry
  INSERT INTO achievement_sync_log (
    user_id,
    gaming_account_id,
    game_id,
    started_at
  ) VALUES (
    p_user_id,
    p_gaming_account_id,
    'pending',
    NOW()
  ) RETURNING id INTO v_sync_log_id;

  -- Note: Actual syncing is done by the Edge Function
  -- This just creates a log entry to track the sync
  
  RETURN v_sync_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update sync log after completion
CREATE OR REPLACE FUNCTION update_sync_log(
  p_sync_log_id UUID,
  p_game_id TEXT,
  p_achievements_synced INTEGER,
  p_tokens_awarded INTEGER,
  p_status TEXT,
  p_error_message TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  UPDATE achievement_sync_log
  SET 
    game_id = p_game_id,
    achievements_synced = p_achievements_synced,
    tokens_awarded = p_tokens_awarded,
    sync_status = p_status,
    error_message = p_error_message,
    completed_at = NOW()
  WHERE id = p_sync_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get achievement sync statistics
CREATE OR REPLACE FUNCTION get_achievement_sync_stats(
  p_user_id UUID,
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE(
  total_syncs INTEGER,
  successful_syncs INTEGER,
  failed_syncs INTEGER,
  total_achievements INTEGER,
  total_tokens INTEGER,
  last_sync_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INTEGER as total_syncs,
    COUNT(*) FILTER (WHERE sync_status = 'success')::INTEGER as successful_syncs,
    COUNT(*) FILTER (WHERE sync_status = 'failed')::INTEGER as failed_syncs,
    COALESCE(SUM(achievements_synced), 0)::INTEGER as total_achievements,
    COALESCE(SUM(tokens_awarded), 0)::INTEGER as total_tokens,
    MAX(completed_at) as last_sync_at
  FROM achievement_sync_log
  WHERE user_id = p_user_id
  AND started_at >= NOW() - (p_days || ' days')::INTERVAL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-claim tokens when achievement is unlocked
CREATE OR REPLACE FUNCTION trigger_auto_claim_achievement()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process new achievements
  IF TG_OP = 'INSERT' THEN
    -- Auto-claim tokens in background (async)
    PERFORM auto_claim_achievement_tokens(NEW.user_id, NEW.id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_claim_achievement_trigger ON user_achievements;
CREATE TRIGGER auto_claim_achievement_trigger
  AFTER INSERT ON user_achievements
  FOR EACH ROW
  EXECUTE FUNCTION trigger_auto_claim_achievement();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_achievements_unclaimed ON user_achievements(user_id, tokens_claimed) WHERE NOT tokens_claimed;
CREATE INDEX IF NOT EXISTS idx_user_achievements_unlock_time ON user_achievements(unlock_time DESC);
CREATE INDEX IF NOT EXISTS idx_achievement_sync_log_user ON achievement_sync_log(user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_achievement_sync_log_status ON achievement_sync_log(sync_status);

-- Insert sample sync schedule settings
CREATE TABLE IF NOT EXISTS sync_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  enabled BOOLEAN DEFAULT TRUE,
  frequency_minutes INTEGER DEFAULT 60 CHECK (frequency_minutes >= 10),
  last_sync TIMESTAMPTZ,
  next_sync TIMESTAMPTZ,
  auto_claim BOOLEAN DEFAULT TRUE,
  notify_on_new BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE sync_schedules ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "sync_schedules_select" ON sync_schedules FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "sync_schedules_insert" ON sync_schedules FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "sync_schedules_update" ON sync_schedules FOR UPDATE USING (auth.uid() = user_id);

-- Function to get users ready for sync
CREATE OR REPLACE FUNCTION get_users_ready_for_sync()
RETURNS TABLE(user_id UUID, gaming_account_id UUID) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    ss.user_id,
    ga.id as gaming_account_id
  FROM sync_schedules ss
  JOIN gaming_accounts ga ON ga.user_id = ss.user_id
  WHERE ss.enabled = TRUE
  AND ga.provider = 'steam'
  AND (ss.next_sync IS NULL OR ss.next_sync <= NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update sync schedule after sync
CREATE OR REPLACE FUNCTION update_sync_schedule(
  p_user_id UUID
)
RETURNS VOID AS $$
BEGIN
  UPDATE sync_schedules
  SET 
    last_sync = NOW(),
    next_sync = NOW() + (frequency_minutes || ' minutes')::INTERVAL
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE achievement_sync_log IS 'Track all achievement sync operations for debugging and analytics';
COMMENT ON TABLE sync_schedules IS 'Per-user achievement sync scheduling configuration';
COMMENT ON FUNCTION auto_claim_achievement_tokens IS 'Automatically award tokens and create notifications for achievements';
COMMENT ON FUNCTION process_new_achievements IS 'Batch process and claim tokens for recent achievements';

