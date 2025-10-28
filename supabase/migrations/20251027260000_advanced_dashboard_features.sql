-- Advanced Dashboard Features
-- AI Recommendations, News Feed, Party Matching, Performance Monitoring

-- =====================================================
-- NEWS FEED & ANNOUNCEMENTS
-- =====================================================

CREATE TABLE IF NOT EXISTS platform_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('announcement', 'patch_notes', 'community', 'esports', 'streamer_live')),
  game_name TEXT,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  banner_url TEXT,
  link_url TEXT,
  author_id UUID,
  is_pinned BOOLEAN DEFAULT FALSE,
  views INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_announcements_category ON platform_announcements(category);
CREATE INDEX IF NOT EXISTS idx_announcements_created ON platform_announcements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_announcements_game ON platform_announcements(game_name);

-- =====================================================
-- PARTY FINDER PREFERENCES
-- =====================================================

CREATE TABLE IF NOT EXISTS party_finder_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  preferred_games JSONB DEFAULT '[]'::JSONB,
  skill_level TEXT DEFAULT 'intermediate' CHECK (skill_level IN ('beginner', 'intermediate', 'advanced', 'expert', 'pro')),
  playstyle TEXT DEFAULT 'balanced' CHECK (playstyle IN ('aggressive', 'defensive', 'balanced', 'support', 'tactical')),
  preferred_languages TEXT[] DEFAULT ARRAY['english'],
  availability JSONB DEFAULT '{"weekdays": true, "weekends": true, "evening": true}'::JSONB,
  looking_for_group BOOLEAN DEFAULT FALSE,
  auto_match BOOLEAN DEFAULT FALSE,
  voice_required BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_party_preferences_lfg ON party_finder_preferences(user_id, looking_for_group);

-- =====================================================
-- GAME RECOMMENDATIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS game_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recommended_game_name TEXT NOT NULL,
  recommended_game_id TEXT,
  reason TEXT NOT NULL,
  score NUMERIC DEFAULT 0,
  based_on_games TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  dismissed BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_recommendations_user ON game_recommendations(user_id, dismissed);

-- =====================================================
-- SYSTEM PERFORMANCE LOGS
-- =====================================================

CREATE TABLE IF NOT EXISTS performance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  game_name TEXT NOT NULL,
  fps_avg NUMERIC,
  fps_min NUMERIC,
  fps_max NUMERIC,
  latency_avg NUMERIC,
  cpu_usage NUMERIC,
  ram_usage NUMERIC,
  gpu_usage NUMERIC,
  session_id UUID,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_performance_user ON performance_logs(user_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_performance_game ON performance_logs(game_name);

-- =====================================================
-- USER FAVORITES
-- =====================================================

CREATE TABLE IF NOT EXISTS user_favorite_games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  game_name TEXT NOT NULL,
  game_id TEXT,
  platform TEXT DEFAULT 'steam',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, game_name)
);

CREATE INDEX IF NOT EXISTS idx_favorites_user ON user_favorite_games(user_id, sort_order);

-- =====================================================
-- DASHBOARD PREFERENCES
-- =====================================================

CREATE TABLE IF NOT EXISTS dashboard_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  widget_layout JSONB DEFAULT '[]'::JSONB,
  enabled_widgets TEXT[] DEFAULT ARRAY['notifications', 'tournaments', 'quests', 'token_economy', 'voice_chat', 'game_launch'],
  theme_variant TEXT DEFAULT 'default',
  overlay_enabled BOOLEAN DEFAULT FALSE,
  overlay_hotkey TEXT DEFAULT 'F9',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- RLS POLICIES
-- =====================================================

ALTER TABLE platform_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE party_finder_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_favorite_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view announcements" ON platform_announcements;
CREATE POLICY "Anyone can view announcements"
  ON platform_announcements FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users manage own party preferences" ON party_finder_preferences;
CREATE POLICY "Users manage own party preferences"
  ON party_finder_preferences FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users view own recommendations" ON game_recommendations;
CREATE POLICY "Users view own recommendations"
  ON game_recommendations FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own performance logs" ON performance_logs;
CREATE POLICY "Users manage own performance logs"
  ON performance_logs FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own favorites" ON user_favorite_games;
CREATE POLICY "Users manage own favorites"
  ON user_favorite_games FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own dashboard prefs" ON dashboard_preferences;
CREATE POLICY "Users manage own dashboard prefs"
  ON dashboard_preferences FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to find party matches
CREATE OR REPLACE FUNCTION find_party_matches(p_user_id UUID, p_game_name TEXT DEFAULT NULL)
RETURNS TABLE (
  user_id UUID,
  username TEXT,
  avatar_url TEXT,
  skill_level TEXT,
  playstyle TEXT,
  match_score NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.username,
    p.avatar_url,
    pf.skill_level,
    pf.playstyle,
    -- Simple matching score based on preferences
    CASE 
      WHEN pf.skill_level = (SELECT skill_level FROM party_finder_preferences WHERE user_id = p_user_id) THEN 50
      ELSE 0
    END::NUMERIC AS match_score
  FROM profiles p
  INNER JOIN party_finder_preferences pf ON p.id = pf.user_id
  WHERE pf.looking_for_group = true
    AND p.id != p_user_id
    AND p.status = 'online'
  ORDER BY match_score DESC
  LIMIT 10;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate game recommendations
CREATE OR REPLACE FUNCTION generate_game_recommendations(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  v_user_games TEXT[];
BEGIN
  -- Get user's most played games
  SELECT ARRAY_AGG(game_name ORDER BY total_playtime DESC)
  INTO v_user_games
  FROM user_games
  WHERE user_id = p_user_id
  LIMIT 5;

  -- Clear old recommendations
  DELETE FROM game_recommendations
  WHERE user_id = p_user_id AND created_at < NOW() - INTERVAL '7 days';

  -- Generate new recommendations (simplified logic)
  -- In production, this would use ML/AI models
  INSERT INTO game_recommendations (user_id, recommended_game_name, reason, based_on_games)
  SELECT 
    p_user_id,
    'Recommended Game ' || generate_series,
    'Based on your playtime preferences',
    v_user_games
  FROM generate_series(1, 3)
  ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE platform_announcements IS 'Platform news, announcements, and updates';
COMMENT ON TABLE party_finder_preferences IS 'User preferences for party matching';
COMMENT ON TABLE game_recommendations IS 'AI-generated game recommendations';
COMMENT ON TABLE performance_logs IS 'Game performance monitoring data';
COMMENT ON TABLE user_favorite_games IS 'User favorite games for quick launch';

