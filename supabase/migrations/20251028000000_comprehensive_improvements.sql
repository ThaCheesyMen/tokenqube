-- Comprehensive Improvements Migration
-- Adds support for: user preferences, session management, rate limiting, and more

-- User Preferences Table (for settings, notifications, appearance)
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  
  -- Onboarding
  onboarding_completed BOOLEAN DEFAULT FALSE,
  
  -- Notifications
  notifications JSONB DEFAULT '{
    "achievements": true,
    "friendRequests": true,
    "messages": true,
    "partyInvites": true,
    "tokenEarned": true,
    "marketplaceUpdates": false,
    "newsletter": false
  }'::jsonb,
  
  -- Privacy
  privacy JSONB DEFAULT '{
    "profileVisibility": "public",
    "showOnlineStatus": true,
    "showCurrentGame": true,
    "allowFriendRequests": true,
    "showAchievements": true
  }'::jsonb,
  
  -- Appearance
  appearance JSONB DEFAULT '{
    "theme": "dark",
    "compactMode": false,
    "showAnimations": true,
    "fontSize": "medium"
  }'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Session Management Table
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  device_name TEXT,
  device_type TEXT, -- desktop, mobile, tablet
  ip_address INET,
  user_agent TEXT,
  location TEXT,
  is_current BOOLEAN DEFAULT FALSE,
  last_active TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Rate Limiting Table
CREATE TABLE IF NOT EXISTS rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  ip_address INET,
  endpoint TEXT NOT NULL,
  request_count INTEGER DEFAULT 1,
  window_start TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Activity Log (for friend activity feed)
CREATE TABLE IF NOT EXISTS user_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  activity_type TEXT NOT NULL, -- game_started, achievement_unlocked, friend_added, etc.
  activity_data JSONB,
  is_public BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add is_public column if it doesn't exist (for existing tables)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_activity_log' 
    AND column_name = 'is_public'
  ) THEN
    ALTER TABLE user_activity_log ADD COLUMN is_public BOOLEAN DEFAULT TRUE;
  END IF;
END $$;

-- Help/Documentation System
CREATE TABLE IF NOT EXISTS help_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  keywords TEXT[],
  view_count INTEGER DEFAULT 0,
  helpful_count INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Help Feedback
CREATE TABLE IF NOT EXISTS help_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  article_id UUID REFERENCES help_articles(id) ON DELETE CASCADE,
  is_helpful BOOLEAN,
  feedback_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_last_active ON user_sessions(last_active);
CREATE INDEX IF NOT EXISTS idx_rate_limits_user_id ON rate_limits(user_id);
CREATE INDEX IF NOT EXISTS idx_rate_limits_ip ON rate_limits(ip_address);
CREATE INDEX IF NOT EXISTS idx_user_activity_log_user_id ON user_activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_log_created_at ON user_activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_help_articles_category ON help_articles(category);

-- RLS Policies
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE help_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE help_feedback ENABLE ROW LEVEL SECURITY;

-- User Preferences Policies
DROP POLICY IF EXISTS "Users can view own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Users can update own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Users can insert own preferences" ON user_preferences;

CREATE POLICY "Users can view own preferences"
  ON user_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
  ON user_preferences FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
  ON user_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Session Policies
DROP POLICY IF EXISTS "Users can view own sessions" ON user_sessions;
DROP POLICY IF EXISTS "Users can delete own sessions" ON user_sessions;
DROP POLICY IF EXISTS "Users can insert own sessions" ON user_sessions;

CREATE POLICY "Users can view own sessions"
  ON user_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sessions"
  ON user_sessions FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions"
  ON user_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Activity Log Policies
DROP POLICY IF EXISTS "Users can view public activity" ON user_activity_log;
DROP POLICY IF EXISTS "Users can insert own activity" ON user_activity_log;

CREATE POLICY "Users can view public activity"
  ON user_activity_log FOR SELECT
  USING (is_public = TRUE OR auth.uid() = user_id);

CREATE POLICY "Users can insert own activity"
  ON user_activity_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Help Articles Policies (Public read)
DROP POLICY IF EXISTS "Anyone can view published articles" ON help_articles;

CREATE POLICY "Anyone can view published articles"
  ON help_articles FOR SELECT
  USING (is_published = TRUE);

-- Help Feedback Policies
DROP POLICY IF EXISTS "Users can insert feedback" ON help_feedback;

CREATE POLICY "Users can insert feedback"
  ON help_feedback FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Functions

-- Log user activity
CREATE OR REPLACE FUNCTION log_user_activity(
  p_user_id UUID,
  p_activity_type TEXT,
  p_activity_data JSONB DEFAULT '{}'::jsonb,
  p_is_public BOOLEAN DEFAULT TRUE
)
RETURNS UUID AS $$
DECLARE
  v_activity_id UUID;
BEGIN
  INSERT INTO user_activity_log (user_id, activity_type, activity_data, is_public)
  VALUES (p_user_id, p_activity_type, p_activity_data, p_is_public)
  RETURNING id INTO v_activity_id;
  
  RETURN v_activity_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get friend activity feed
CREATE OR REPLACE FUNCTION get_friend_activity_feed(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  activity_id UUID,
  user_id UUID,
  username TEXT,
  avatar_url TEXT,
  activity_type TEXT,
  activity_data JSONB,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ual.id,
    ual.user_id,
    p.username,
    p.avatar_url,
    ual.activity_type,
    ual.activity_data,
    ual.created_at
  FROM user_activity_log ual
  JOIN profiles p ON p.id = ual.user_id
  WHERE ual.user_id IN (
    SELECT friend_id FROM friends WHERE user_id = p_user_id AND status = 'accepted'
  )
  AND ual.is_public = TRUE
  ORDER BY ual.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check rate limit
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_user_id UUID,
  p_endpoint TEXT,
  p_max_requests INTEGER DEFAULT 60,
  p_window_minutes INTEGER DEFAULT 1
)
RETURNS BOOLEAN AS $$
DECLARE
  v_count INTEGER;
  v_window_start TIMESTAMPTZ;
BEGIN
  v_window_start := NOW() - (p_window_minutes || ' minutes')::INTERVAL;
  
  -- Clean old records
  DELETE FROM rate_limits 
  WHERE window_start < v_window_start;
  
  -- Get current count
  SELECT COUNT(*) INTO v_count
  FROM rate_limits
  WHERE user_id = p_user_id
  AND endpoint = p_endpoint
  AND window_start >= v_window_start;
  
  IF v_count >= p_max_requests THEN
    RETURN FALSE;
  END IF;
  
  -- Log this request
  INSERT INTO rate_limits (user_id, endpoint)
  VALUES (p_user_id, p_endpoint);
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Delete user account (GDPR compliance)
CREATE OR REPLACE FUNCTION delete_user_account(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- This will cascade delete all related data due to FK constraints
  DELETE FROM profiles WHERE id = p_user_id;
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Logout all sessions except current
CREATE OR REPLACE FUNCTION logout_all_sessions(
  p_user_id UUID,
  p_current_session_id UUID DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM user_sessions
  WHERE user_id = p_user_id
  AND (p_current_session_id IS NULL OR id != p_current_session_id)
  RETURNING COUNT(*) INTO v_deleted_count;
  
  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Sample help articles
INSERT INTO help_articles (category, title, content, keywords) VALUES
  ('getting-started', 'How to Connect Your Gaming Accounts', 'To connect your gaming accounts, go to Profile > Gaming Accounts and click "Connect Account". Follow the prompts to link your Steam, Xbox, or PlayStation accounts.', ARRAY['steam', 'connect', 'gaming', 'account']),
  ('getting-started', 'How to Earn Tokens', 'Tokens can be earned by playing games, completing achievements, daily quests, and participating in events. The more you play, the more you earn!', ARRAY['tokens', 'earn', 'rewards']),
  ('friends', 'How to Add Friends', 'Click on Friends in the sidebar, then click "Add Friend". Search for their username and send a friend request.', ARRAY['friends', 'add', 'social']),
  ('chat', 'How to Start a Voice Call', 'Open a DM with a friend and click the phone or video icon to start a call. Make sure you have microphone/camera permissions enabled.', ARRAY['call', 'voice', 'video', 'chat']),
  ('marketplace', 'How to List Items for Sale', 'Go to Marketplace > Sell. Click "List Item", fill in the details, set your price in tokens, and submit. Your item will be reviewed before going live.', ARRAY['marketplace', 'sell', 'list', 'items']),
  ('premium', 'What is Premium?', 'Premium gives you exclusive benefits like 2x token earning, custom profile themes, priority support, and access to premium-only features.', ARRAY['premium', 'subscription', 'benefits']),
  ('achievements', 'Achievement Syncing', 'Achievements are automatically synced from your connected gaming accounts every hour. You can manually trigger a sync from your Profile page.', ARRAY['achievements', 'sync', 'steam']),
  ('troubleshooting', 'Game Not Detected', 'If your game is not being detected, make sure: 1) The game is in our supported games list 2) The game is running 3) You have connected the correct gaming account', ARRAY['detection', 'game', 'tracking', 'issue'])
ON CONFLICT DO NOTHING;

-- Update triggers
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER help_articles_updated_at
  BEFORE UPDATE ON help_articles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Grant permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

