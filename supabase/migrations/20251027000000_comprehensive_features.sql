-- ============================================================================
-- COMPREHENSIVE FEATURES MIGRATION
-- Adds: Notifications, Rich Presence, Reactions, Achievements, Quests,
--       Tournaments, Guilds, Analytics, and more
-- ============================================================================

-- ============================================================================
-- 1. NOTIFICATIONS SYSTEM
-- ============================================================================

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('friend_request', 'party_invite', 'message', 'achievement', 'system', 'marketplace', 'guild', 'tournament')),
  data JSONB DEFAULT '{}'::jsonb,
  read BOOLEAN DEFAULT FALSE,
  action_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================================
-- 2. USER PRESENCE SYSTEM (Rich Presence)
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_presence (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'online' CHECK (status IN ('online', 'offline', 'away', 'dnd')),
  custom_status TEXT,
  current_game TEXT,
  game_details TEXT,
  started_at TIMESTAMPTZ,
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_presence_status ON user_presence(status);
CREATE INDEX IF NOT EXISTS idx_presence_updated ON user_presence(updated_at DESC);

ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view presence" ON user_presence;
CREATE POLICY "Anyone can view presence"
  ON user_presence FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can update own presence" ON user_presence;
CREATE POLICY "Users can update own presence"
  ON user_presence FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================================
-- 3. MESSAGE REACTIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL,
  message_type TEXT NOT NULL CHECK (message_type IN ('global', 'dm', 'party')),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(message_id, user_id, emoji, message_type)
);

CREATE INDEX IF NOT EXISTS idx_reactions_message ON message_reactions(message_id, message_type);
CREATE INDEX IF NOT EXISTS idx_reactions_user ON message_reactions(user_id);

ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view reactions" ON message_reactions;
CREATE POLICY "Anyone can view reactions"
  ON message_reactions FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can add reactions" ON message_reactions;
CREATE POLICY "Users can add reactions"
  ON message_reactions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can remove own reactions" ON message_reactions;
CREATE POLICY "Users can remove own reactions"
  ON message_reactions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================================
-- 4. PLATFORM ACHIEVEMENTS SYSTEM
-- ============================================================================

CREATE TABLE IF NOT EXISTS platform_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  achievement_key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon_url TEXT,
  tier TEXT DEFAULT 'bronze' CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum', 'diamond')),
  requirements JSONB NOT NULL,
  token_reward INTEGER DEFAULT 0,
  xp_reward INTEGER DEFAULT 0,
  is_secret BOOLEAN DEFAULT FALSE,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_achievements_tier ON platform_achievements(tier);
CREATE INDEX IF NOT EXISTS idx_achievements_active ON platform_achievements(is_active);

CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES platform_achievements(id) ON DELETE CASCADE,
  progress JSONB DEFAULT '{}'::jsonb,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  showcased BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, achievement_id)
);

CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_completed ON user_achievements(completed);
CREATE INDEX IF NOT EXISTS idx_user_achievements_showcased ON user_achievements(showcased);

ALTER TABLE platform_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view achievements" ON platform_achievements;
CREATE POLICY "Anyone can view achievements"
  ON platform_achievements FOR SELECT
  TO authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS "Users can view own achievement progress" ON user_achievements;
CREATE POLICY "Users can view own achievement progress"
  ON user_achievements FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view others showcased achievements" ON user_achievements;
CREATE POLICY "Users can view others showcased achievements"
  ON user_achievements FOR SELECT
  TO authenticated
  USING (showcased = true);

-- Seed platform achievements
INSERT INTO platform_achievements (achievement_key, name, description, tier, requirements, token_reward, xp_reward)
VALUES
  ('first_steps', 'First Steps', 'Complete your first task', 'bronze', '{"tasks_completed": 1}'::jsonb, 100, 50),
  ('social_butterfly', 'Social Butterfly', 'Add 10 friends', 'silver', '{"friends_count": 10}'::jsonb, 500, 200),
  ('token_collector', 'Token Collector', 'Earn 10,000 tokens', 'gold', '{"tokens_earned": 10000}'::jsonb, 1000, 500),
  ('party_animal', 'Party Animal', 'Join 50 parties', 'gold', '{"parties_joined": 50}'::jsonb, 750, 400),
  ('marketplace_mogul', 'Marketplace Mogul', 'Complete 100 trades', 'platinum', '{"trades_completed": 100}'::jsonb, 5000, 2000),
  ('gaming_legend', 'Gaming Legend', 'Play 1000 hours across all games', 'platinum', '{"total_hours": 1000}'::jsonb, 10000, 5000),
  ('achievement_hunter', 'Achievement Hunter', 'Unlock 100 gaming achievements', 'diamond', '{"gaming_achievements": 100}'::jsonb, 20000, 10000)
ON CONFLICT (achievement_key) DO NOTHING;

-- ============================================================================
-- 5. DAILY/WEEKLY QUESTS SYSTEM
-- ============================================================================

CREATE TABLE IF NOT EXISTS quest_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quest_type TEXT NOT NULL CHECK (quest_type IN ('daily', 'weekly', 'special', 'seasonal')),
  name TEXT NOT NULL,
  description TEXT,
  requirements JSONB NOT NULL,
  token_reward INTEGER NOT NULL,
  xp_reward INTEGER DEFAULT 0,
  difficulty TEXT DEFAULT 'easy' CHECK (difficulty IN ('easy', 'medium', 'hard', 'extreme')),
  cooldown_hours INTEGER DEFAULT 24,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_quests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  quest_id UUID NOT NULL REFERENCES quest_templates(id) ON DELETE CASCADE,
  progress JSONB DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'expired')),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_quests_type ON quest_templates(quest_type);
CREATE INDEX IF NOT EXISTS idx_quests_active ON quest_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_user_quests_user ON user_quests(user_id);
CREATE INDEX IF NOT EXISTS idx_user_quests_status ON user_quests(status);

ALTER TABLE quest_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_quests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active quests" ON quest_templates;
CREATE POLICY "Anyone can view active quests"
  ON quest_templates FOR SELECT
  TO authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS "Users can view own quests" ON user_quests;
CREATE POLICY "Users can view own quests"
  ON user_quests FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Seed quest templates
INSERT INTO quest_templates (quest_type, name, description, requirements, token_reward, xp_reward, difficulty)
VALUES
  ('daily', 'Daily Grind', 'Play any game for 2 hours', '{"play_hours": 2, "game": "any"}'::jsonb, 100, 50, 'easy'),
  ('daily', 'Competitive Spirit', 'Win 3 competitive matches', '{"wins": 3}'::jsonb, 150, 75, 'medium'),
  ('daily', 'Social Hour', 'Chat with 5 different friends', '{"unique_chats": 5}'::jsonb, 80, 40, 'easy'),
  ('weekly', 'Token Master', 'Earn 1000 tokens', '{"tokens_earned": 1000}'::jsonb, 500, 250, 'medium'),
  ('weekly', 'Party Leader', 'Create and complete 5 parties', '{"parties_created": 5, "parties_completed": 5}'::jsonb, 750, 375, 'hard'),
  ('weekly', 'Trader', 'Complete 10 marketplace trades', '{"trades": 10}'::jsonb, 1000, 500, 'hard')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 6. TOURNAMENT SYSTEM
-- ============================================================================

CREATE TABLE IF NOT EXISTS tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  game_name TEXT NOT NULL,
  description TEXT,
  format TEXT NOT NULL CHECK (format IN ('single_elimination', 'double_elimination', 'round_robin', 'swiss')),
  max_participants INTEGER NOT NULL,
  current_participants INTEGER DEFAULT 0,
  entry_fee_tokens INTEGER DEFAULT 0,
  prize_pool_tokens INTEGER DEFAULT 0,
  prize_distribution JSONB, -- {"1st": 50, "2nd": 30, "3rd": 20}
  start_date TIMESTAMPTZ NOT NULL,
  registration_deadline TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'registration', 'ongoing', 'completed', 'cancelled')),
  rules JSONB,
  banner_url TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tournament_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  seed_number INTEGER,
  current_round INTEGER DEFAULT 1,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'eliminated', 'winner', 'withdrew')),
  final_placement INTEGER,
  tokens_won INTEGER DEFAULT 0,
  registered_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tournament_id, user_id)
);

CREATE TABLE IF NOT EXISTS tournament_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL,
  match_number INTEGER NOT NULL,
  player1_id UUID REFERENCES profiles(id),
  player2_id UUID REFERENCES profiles(id),
  winner_id UUID REFERENCES profiles(id),
  score TEXT,
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tournaments_status ON tournaments(status);
CREATE INDEX IF NOT EXISTS idx_tournaments_game ON tournaments(game_name);
CREATE INDEX IF NOT EXISTS idx_tournament_participants_tournament ON tournament_participants(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_participants_user ON tournament_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_tournament_matches_tournament ON tournament_matches(tournament_id);

ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_matches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view tournaments" ON tournaments;
CREATE POLICY "Anyone can view tournaments"
  ON tournaments FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Anyone can view tournament participants" ON tournament_participants;
CREATE POLICY "Anyone can view tournament participants"
  ON tournament_participants FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can register for tournaments" ON tournament_participants;
CREATE POLICY "Users can register for tournaments"
  ON tournament_participants FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Anyone can view tournament matches" ON tournament_matches;
CREATE POLICY "Anyone can view tournament matches"
  ON tournament_matches FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================================
-- 7. GUILDS/CLANS SYSTEM
-- ============================================================================

CREATE TABLE IF NOT EXISTS guilds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  tag TEXT UNIQUE NOT NULL,
  description TEXT,
  banner_url TEXT,
  logo_url TEXT,
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  level INTEGER DEFAULT 1,
  xp INTEGER DEFAULT 0,
  total_tokens_earned INTEGER DEFAULT 0,
  member_limit INTEGER DEFAULT 50,
  current_members INTEGER DEFAULT 1,
  is_public BOOLEAN DEFAULT TRUE,
  requirements JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS guild_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id UUID NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'officer', 'member')),
  tokens_contributed INTEGER DEFAULT 0,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS guild_perks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id UUID NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
  perk_type TEXT NOT NULL,
  perk_value NUMERIC NOT NULL,
  unlocked_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_guilds_public ON guilds(is_public);
CREATE INDEX IF NOT EXISTS idx_guild_members_guild ON guild_members(guild_id);
CREATE INDEX IF NOT EXISTS idx_guild_members_user ON guild_members(user_id);

ALTER TABLE guilds ENABLE ROW LEVEL SECURITY;
ALTER TABLE guild_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE guild_perks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view public guilds" ON guilds;
CREATE POLICY "Anyone can view public guilds"
  ON guilds FOR SELECT
  TO authenticated
  USING (is_public = true OR id IN (
    SELECT guild_id FROM guild_members WHERE user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Anyone can view guild members" ON guild_members;
CREATE POLICY "Anyone can view guild members"
  ON guild_members FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Anyone can view guild perks" ON guild_perks;
CREATE POLICY "Anyone can view guild perks"
  ON guild_perks FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================================
-- 8. SEASONAL EVENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS seasonal_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name TEXT NOT NULL,
  description TEXT,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  theme_colors JSONB,
  rewards JSONB,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS event_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES seasonal_events(id) ON DELETE CASCADE,
  challenge_name TEXT NOT NULL,
  description TEXT,
  requirements JSONB NOT NULL,
  token_reward INTEGER DEFAULT 0,
  special_reward TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_event_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES seasonal_events(id) ON DELETE CASCADE,
  challenge_id UUID REFERENCES event_challenges(id) ON DELETE CASCADE,
  progress JSONB DEFAULT '{}'::jsonb,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  UNIQUE(user_id, event_id, challenge_id)
);

ALTER TABLE seasonal_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_event_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active events" ON seasonal_events;
CREATE POLICY "Anyone can view active events"
  ON seasonal_events FOR SELECT
  TO authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS "Anyone can view event challenges" ON event_challenges;
CREATE POLICY "Anyone can view event challenges"
  ON event_challenges FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can view own event progress" ON user_event_progress;
CREATE POLICY "Users can view own event progress"
  ON user_event_progress FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================================
-- 9. USER ANALYTICS & STATS
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  activity_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_log_user ON user_activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_type ON user_activity_log(activity_type);
CREATE INDEX IF NOT EXISTS idx_activity_log_created ON user_activity_log(created_at DESC);

ALTER TABLE user_activity_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own activity log" ON user_activity_log;
CREATE POLICY "Users can view own activity log"
  ON user_activity_log FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================================
-- 10. ADD XP SYSTEM TO PROFILES
-- ============================================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS xp INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS xp_needed_for_next_level INTEGER DEFAULT 100;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ DEFAULT NOW();

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to mark notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(notification_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE notifications
  SET read = TRUE
  WHERE id = notification_id AND user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update user presence
CREATE OR REPLACE FUNCTION update_user_presence(
  p_status TEXT,
  p_custom_status TEXT DEFAULT NULL,
  p_current_game TEXT DEFAULT NULL,
  p_game_details TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO user_presence (user_id, status, custom_status, current_game, game_details, started_at)
  VALUES (auth.uid(), p_status, p_custom_status, p_current_game, p_game_details, NOW())
  ON CONFLICT (user_id) DO UPDATE
  SET status = p_status,
      custom_status = p_custom_status,
      current_game = p_current_game,
      game_details = p_game_details,
      started_at = CASE
        WHEN user_presence.current_game != p_current_game THEN NOW()
        ELSE user_presence.started_at
      END,
      updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to award achievement
CREATE OR REPLACE FUNCTION award_achievement(
  p_user_id UUID,
  p_achievement_key TEXT
)
RETURNS VOID AS $$
DECLARE
  v_achievement_id UUID;
  v_token_reward INTEGER;
  v_xp_reward INTEGER;
BEGIN
  -- Get achievement details
  SELECT id, token_reward, xp_reward INTO v_achievement_id, v_token_reward, v_xp_reward
  FROM platform_achievements
  WHERE achievement_key = p_achievement_key AND is_active = true;

  IF v_achievement_id IS NULL THEN
    RETURN;
  END IF;

  -- Mark achievement as completed
  INSERT INTO user_achievements (user_id, achievement_id, completed, completed_at)
  VALUES (p_user_id, v_achievement_id, true, NOW())
  ON CONFLICT (user_id, achievement_id) DO UPDATE
  SET completed = true, completed_at = NOW()
  WHERE user_achievements.completed = false;

  -- Award tokens
  IF v_token_reward > 0 THEN
    UPDATE profiles
    SET token_balance = token_balance + v_token_reward,
        total_earned = total_earned + v_token_reward
    WHERE id = p_user_id;

    INSERT INTO transactions (user_id, amount, type, description)
    VALUES (p_user_id, v_token_reward, 'achievement', 'Achievement: ' || p_achievement_key);
  END IF;

  -- Award XP
  IF v_xp_reward > 0 THEN
    UPDATE profiles
    SET xp = xp + v_xp_reward
    WHERE id = p_user_id;
  END IF;

  -- Create notification
  INSERT INTO notifications (user_id, title, message, type, data)
  VALUES (
    p_user_id,
    'Achievement Unlocked!',
    'You unlocked: ' || (SELECT name FROM platform_achievements WHERE id = v_achievement_id),
    'achievement',
    jsonb_build_object('achievement_id', v_achievement_id, 'tokens', v_token_reward, 'xp', v_xp_reward)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update guild member count trigger
CREATE OR REPLACE FUNCTION update_guild_member_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE guilds SET current_members = current_members + 1 WHERE id = NEW.guild_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE guilds SET current_members = current_members - 1 WHERE id = OLD.guild_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_guild_member_count ON guild_members;
CREATE TRIGGER trigger_guild_member_count
AFTER INSERT OR DELETE ON guild_members
FOR EACH ROW EXECUTE FUNCTION update_guild_member_count();

-- Update tournament participant count trigger
CREATE OR REPLACE FUNCTION update_tournament_participant_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE tournaments SET current_participants = current_participants + 1 WHERE id = NEW.tournament_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE tournaments SET current_participants = current_participants - 1 WHERE id = OLD.tournament_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_tournament_participant_count ON tournament_participants;
CREATE TRIGGER trigger_tournament_participant_count
AFTER INSERT OR DELETE ON tournament_participants
FOR EACH ROW EXECUTE FUNCTION update_tournament_participant_count();

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_profiles_level ON profiles(level DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_xp ON profiles(xp DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_last_active ON profiles(last_active_at DESC);

