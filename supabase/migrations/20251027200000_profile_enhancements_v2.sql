-- Gaming Activity Heatmap Table
CREATE TABLE IF NOT EXISTS gaming_activity (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  activity_date DATE NOT NULL,
  total_hours DECIMAL(10, 2) DEFAULT 0,
  games_played INTEGER DEFAULT 0,
  achievements_earned INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, activity_date)
);

-- Profile Badges Table
CREATE TABLE IF NOT EXISTS profile_badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  badge_key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT, -- emoji or icon name
  color TEXT, -- gradient or color
  rarity TEXT CHECK (rarity IN ('common', 'uncommon', 'rare', 'epic', 'legendary')),
  unlock_criteria JSONB, -- conditions to unlock
  is_animated BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add columns if they don't exist (for existing tables)
DO $$ BEGIN
  ALTER TABLE profile_badges ADD COLUMN IF NOT EXISTS name TEXT;
  ALTER TABLE profile_badges ADD COLUMN IF NOT EXISTS description TEXT;
  ALTER TABLE profile_badges ADD COLUMN IF NOT EXISTS icon TEXT;
  ALTER TABLE profile_badges ADD COLUMN IF NOT EXISTS color TEXT;
  ALTER TABLE profile_badges ADD COLUMN IF NOT EXISTS rarity TEXT;
  ALTER TABLE profile_badges ADD COLUMN IF NOT EXISTS is_animated BOOLEAN DEFAULT FALSE;
  ALTER TABLE profile_badges ADD COLUMN IF NOT EXISTS unlock_criteria JSONB;
  
  -- Handle existing 'requirement' column by making it nullable or providing default
  ALTER TABLE profile_badges ALTER COLUMN requirement DROP NOT NULL;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Add constraint for rarity if it doesn't exist
DO $$ BEGIN
  ALTER TABLE profile_badges ADD CONSTRAINT profile_badges_rarity_check 
    CHECK (rarity IN ('common', 'uncommon', 'rare', 'epic', 'legendary'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- User Badges (unlocked badges)
CREATE TABLE IF NOT EXISTS user_badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  badge_id UUID REFERENCES profile_badges(id) ON DELETE CASCADE NOT NULL,
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  is_showcased BOOLEAN DEFAULT FALSE, -- pinned to profile
  showcase_order INTEGER,
  UNIQUE(user_id, badge_id)
);

-- Game Collections Table
CREATE TABLE IF NOT EXISTS game_collections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  collection_name TEXT NOT NULL,
  collection_type TEXT CHECK (collection_type IN ('favorites', 'backlog', 'completed', 'perfect', 'multiplayer', 'wishlist', 'custom')),
  collection_icon TEXT,
  collection_color TEXT,
  is_public BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Game Collection Items (games in collections)
CREATE TABLE IF NOT EXISTS game_collection_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  collection_id UUID REFERENCES game_collections(id) ON DELETE CASCADE NOT NULL,
  game_id TEXT NOT NULL, -- platform-specific game ID
  game_name TEXT NOT NULL,
  platform TEXT NOT NULL,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  UNIQUE(collection_id, game_id, platform)
);

-- Currently Playing Sessions
CREATE TABLE IF NOT EXISTS active_gaming_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  game_id TEXT NOT NULL,
  game_name TEXT NOT NULL,
  platform TEXT NOT NULL,
  session_start TIMESTAMPTZ DEFAULT NOW(),
  last_heartbeat TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_gaming_activity_user_date ON gaming_activity(user_id, activity_date DESC);
CREATE INDEX IF NOT EXISTS idx_user_badges_user ON user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_showcased ON user_badges(user_id, is_showcased) WHERE is_showcased = TRUE;
CREATE INDEX IF NOT EXISTS idx_game_collections_user ON game_collections(user_id);
CREATE INDEX IF NOT EXISTS idx_active_sessions_user ON active_gaming_sessions(user_id) WHERE is_active = TRUE;

-- RLS Policies
ALTER TABLE gaming_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_collection_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE active_gaming_sessions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own activity" ON gaming_activity;
DROP POLICY IF EXISTS "Users can insert own activity" ON gaming_activity;
DROP POLICY IF EXISTS "Users can update own activity" ON gaming_activity;
DROP POLICY IF EXISTS "Anyone can view badge definitions" ON profile_badges;
DROP POLICY IF EXISTS "Users can view own badges" ON user_badges;
DROP POLICY IF EXISTS "Users can insert own badges" ON user_badges;
DROP POLICY IF EXISTS "Users can update own badges" ON user_badges;
DROP POLICY IF EXISTS "Users can view own collections" ON game_collections;
DROP POLICY IF EXISTS "Users can view public collections" ON game_collections;
DROP POLICY IF EXISTS "Users can manage own collections" ON game_collections;
DROP POLICY IF EXISTS "Users can view collection items" ON game_collection_items;
DROP POLICY IF EXISTS "Users can manage own collection items" ON game_collection_items;
DROP POLICY IF EXISTS "Users can view own sessions" ON active_gaming_sessions;
DROP POLICY IF EXISTS "Anyone can view active sessions" ON active_gaming_sessions;
DROP POLICY IF EXISTS "Users can manage own sessions" ON active_gaming_sessions;

-- Gaming Activity Policies
CREATE POLICY "Users can view own activity" ON gaming_activity FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own activity" ON gaming_activity FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own activity" ON gaming_activity FOR UPDATE USING (auth.uid() = user_id);

-- Badge Policies
CREATE POLICY "Anyone can view badge definitions" ON profile_badges FOR SELECT USING (true);
CREATE POLICY "Users can view own badges" ON user_badges FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own badges" ON user_badges FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own badges" ON user_badges FOR UPDATE USING (auth.uid() = user_id);

-- Collection Policies
CREATE POLICY "Users can view own collections" ON game_collections FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view public collections" ON game_collections FOR SELECT USING (is_public = TRUE);
CREATE POLICY "Users can manage own collections" ON game_collections FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view collection items" ON game_collection_items FOR SELECT 
  USING (EXISTS (SELECT 1 FROM game_collections WHERE id = collection_id AND (user_id = auth.uid() OR is_public = TRUE)));
CREATE POLICY "Users can manage own collection items" ON game_collection_items FOR ALL 
  USING (EXISTS (SELECT 1 FROM game_collections WHERE id = collection_id AND user_id = auth.uid()));

-- Active Session Policies
CREATE POLICY "Users can view own sessions" ON active_gaming_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Anyone can view active sessions" ON active_gaming_sessions FOR SELECT USING (is_active = TRUE);
CREATE POLICY "Users can manage own sessions" ON active_gaming_sessions FOR ALL USING (auth.uid() = user_id);

-- Function to update gaming activity
CREATE OR REPLACE FUNCTION update_gaming_activity(
  p_user_id UUID,
  p_date DATE,
  p_hours DECIMAL,
  p_games INTEGER DEFAULT 1,
  p_achievements INTEGER DEFAULT 0
)
RETURNS void AS $$
BEGIN
  INSERT INTO gaming_activity (user_id, activity_date, total_hours, games_played, achievements_earned)
  VALUES (p_user_id, p_date, p_hours, p_games, p_achievements)
  ON CONFLICT (user_id, activity_date)
  DO UPDATE SET
    total_hours = gaming_activity.total_hours + p_hours,
    games_played = GREATEST(gaming_activity.games_played, p_games),
    achievements_earned = gaming_activity.achievements_earned + p_achievements;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up inactive sessions
CREATE OR REPLACE FUNCTION cleanup_inactive_sessions()
RETURNS void AS $$
BEGIN
  UPDATE active_gaming_sessions
  SET is_active = FALSE
  WHERE last_heartbeat < NOW() - INTERVAL '15 minutes'
    AND is_active = TRUE;
END;
$$ LANGUAGE plpgsql;

-- Insert default badge definitions (handle both old and new schema)
INSERT INTO profile_badges (badge_key, name, description, icon, color, rarity, requirement) VALUES
  ('early_adopter', 'Early Adopter', 'Joined during beta', '🌟', 'from-blue-500 to-cyan-500', 'legendary', 'Account created during beta period'),
  ('achievement_hunter', 'Achievement Hunter', 'Unlocked 100+ achievements', '🏆', 'from-yellow-500 to-orange-500', 'epic', 'Unlock 100 achievements'),
  ('marathon_gamer', 'Marathon Gamer', 'Played 1000+ hours', '⏱️', 'from-purple-500 to-pink-500', 'epic', 'Play for 1000 hours total'),
  ('collector', 'Game Collector', 'Owned 50+ games', '📚', 'from-green-500 to-emerald-500', 'rare', 'Own 50 games'),
  ('social_butterfly', 'Social Butterfly', 'Have 20+ friends', '🦋', 'from-pink-500 to-rose-500', 'rare', 'Add 20 friends'),
  ('token_master', 'Token Master', 'Earned 10,000+ tokens', '💎', 'from-indigo-500 to-purple-500', 'epic', 'Earn 10,000 tokens'),
  ('completionist', '100% Completionist', 'Completed a game 100%', '💯', 'from-red-500 to-orange-500', 'legendary', 'Complete all achievements in any game'),
  ('night_owl', 'Night Owl', 'Most active after midnight', '🦉', 'from-gray-600 to-gray-800', 'uncommon', 'Most playtime after midnight'),
  ('morning_bird', 'Early Bird', 'Most active before 8 AM', '🐦', 'from-yellow-400 to-yellow-600', 'uncommon', 'Most playtime before 8 AM'),
  ('streak_master', 'Streak Master', '30-day gaming streak', '🔥', 'from-orange-500 to-red-600', 'rare', 'Play games 30 days in a row')
ON CONFLICT (badge_key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  color = EXCLUDED.color,
  rarity = EXCLUDED.rarity,
  requirement = EXCLUDED.requirement;

-- Insert default game collections for new users
CREATE OR REPLACE FUNCTION create_default_collections()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO game_collections (user_id, collection_name, collection_type, collection_icon, collection_color) VALUES
    (NEW.id, 'Favorites', 'favorites', '⭐', 'from-yellow-500 to-orange-500'),
    (NEW.id, 'Backlog', 'backlog', '📚', 'from-blue-500 to-cyan-500'),
    (NEW.id, 'Completed', 'completed', '✅', 'from-green-500 to-emerald-500'),
    (NEW.id, '100% Perfect', 'perfect', '💯', 'from-purple-500 to-pink-500'),
    (NEW.id, 'Multiplayer', 'multiplayer', '👥', 'from-indigo-500 to-purple-500'),
    (NEW.id, 'Wishlist', 'wishlist', '💭', 'from-pink-500 to-rose-500');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create default collections
DROP TRIGGER IF EXISTS trigger_create_default_collections ON profiles;
CREATE TRIGGER trigger_create_default_collections
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_default_collections();

