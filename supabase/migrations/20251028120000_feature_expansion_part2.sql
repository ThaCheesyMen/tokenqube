-- =============================================
-- FEATURE EXPANSION - PART 2: Gaming & Competitive
-- =============================================

-- Session Replay & Analytics
CREATE TABLE IF NOT EXISTS gaming_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  game_id TEXT NOT NULL,
  game_name TEXT NOT NULL,
  platform TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  duration_minutes INTEGER,
  performance_data JSONB DEFAULT '{}', -- KDA, accuracy, rank changes, etc
  screenshot_urls TEXT[] DEFAULT '{}',
  is_verified BOOLEAN DEFAULT FALSE,
  afk_time_minutes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add missing columns to gaming_sessions if exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'gaming_sessions' AND column_name = 'performance_data') THEN
    ALTER TABLE gaming_sessions ADD COLUMN performance_data JSONB DEFAULT '{}';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'gaming_sessions' AND column_name = 'screenshot_urls') THEN
    ALTER TABLE gaming_sessions ADD COLUMN screenshot_urls TEXT[] DEFAULT '{}';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'gaming_sessions' AND column_name = 'is_verified') THEN
    ALTER TABLE gaming_sessions ADD COLUMN is_verified BOOLEAN DEFAULT FALSE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'gaming_sessions' AND column_name = 'afk_time_minutes') THEN
    ALTER TABLE gaming_sessions ADD COLUMN afk_time_minutes INTEGER DEFAULT 0;
  END IF;
END $$;

DROP INDEX IF EXISTS idx_gaming_sessions_user;
CREATE INDEX idx_gaming_sessions_user ON gaming_sessions(user_id, start_time DESC);

DROP INDEX IF EXISTS idx_gaming_sessions_game;
CREATE INDEX idx_gaming_sessions_game ON gaming_sessions(game_id, start_time DESC);

DROP INDEX IF EXISTS idx_gaming_sessions_verified;
CREATE INDEX idx_gaming_sessions_verified ON gaming_sessions(is_verified);

-- Cross-Platform Game Library
CREATE TABLE IF NOT EXISTS user_game_library (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  game_id TEXT NOT NULL,
  game_name TEXT NOT NULL,
  platform TEXT NOT NULL,
  is_favorite BOOLEAN DEFAULT FALSE,
  total_playtime_minutes INTEGER DEFAULT 0,
  last_played_at TIMESTAMPTZ,
  achievements_unlocked INTEGER DEFAULT 0,
  achievements_total INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, game_id, platform)
);

DROP INDEX IF EXISTS idx_user_game_library_user;
CREATE INDEX idx_user_game_library_user ON user_game_library(user_id, is_favorite, last_played_at DESC);

DROP INDEX IF EXISTS idx_user_game_library_game;
CREATE INDEX idx_user_game_library_game ON user_game_library(game_id);

-- Game Recommendations
CREATE TABLE IF NOT EXISTS game_recommendations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  game_id TEXT NOT NULL,
  game_name TEXT NOT NULL,
  recommendation_score NUMERIC(3,2), -- 0.00 to 1.00
  reason TEXT, -- 'friends_playing', 'genre_match', 'trending', 'ai_suggestion'
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  clicked BOOLEAN DEFAULT FALSE,
  dismissed BOOLEAN DEFAULT FALSE
);

-- Add missing columns if table already exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'game_recommendations' AND column_name = 'recommendation_score') THEN
    ALTER TABLE game_recommendations ADD COLUMN recommendation_score NUMERIC(3,2);
    RAISE NOTICE 'Added recommendation_score column';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'game_recommendations' AND column_name = 'clicked') THEN
    ALTER TABLE game_recommendations ADD COLUMN clicked BOOLEAN DEFAULT FALSE;
    RAISE NOTICE 'Added clicked column';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'game_recommendations' AND column_name = 'dismissed') THEN
    ALTER TABLE game_recommendations ADD COLUMN dismissed BOOLEAN DEFAULT FALSE;
    RAISE NOTICE 'Added dismissed column';
  END IF;
END $$;

DROP INDEX IF EXISTS idx_game_recommendations_user;
CREATE INDEX idx_game_recommendations_user ON game_recommendations(user_id, created_at DESC);

DROP INDEX IF EXISTS idx_game_recommendations_score;
CREATE INDEX idx_game_recommendations_score ON game_recommendations(recommendation_score DESC);

-- Battle Pass System
CREATE TABLE IF NOT EXISTS battle_passes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  season_number INTEGER NOT NULL,
  season_name TEXT NOT NULL,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  max_tier INTEGER DEFAULT 50,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS battle_pass_tiers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  battle_pass_id UUID REFERENCES battle_passes(id) ON DELETE CASCADE NOT NULL,
  tier_number INTEGER NOT NULL,
  xp_required INTEGER NOT NULL,
  free_rewards JSONB DEFAULT '[]', -- Array of reward items
  premium_rewards JSONB DEFAULT '[]',
  UNIQUE(battle_pass_id, tier_number)
);

CREATE TABLE IF NOT EXISTS user_battle_pass_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  battle_pass_id UUID REFERENCES battle_passes(id) ON DELETE CASCADE NOT NULL,
  current_tier INTEGER DEFAULT 0,
  current_xp INTEGER DEFAULT 0,
  is_premium BOOLEAN DEFAULT FALSE,
  claimed_free_tiers INTEGER[] DEFAULT '{}',
  claimed_premium_tiers INTEGER[] DEFAULT '{}',
  purchased_at TIMESTAMPTZ,
  UNIQUE(user_id, battle_pass_id)
);

DROP INDEX IF EXISTS idx_user_battle_pass;
CREATE INDEX idx_user_battle_pass ON user_battle_pass_progress(user_id, battle_pass_id);

-- Marketplace Auctions
CREATE TABLE IF NOT EXISTS marketplace_auctions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id UUID REFERENCES marketplace_items(id) ON DELETE CASCADE NOT NULL,
  seller_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  starting_bid INTEGER NOT NULL,
  current_bid INTEGER DEFAULT 0,
  highest_bidder_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  buyout_price INTEGER,
  bid_increment INTEGER DEFAULT 10,
  start_time TIMESTAMPTZ DEFAULT NOW(),
  end_time TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS auction_bids (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auction_id UUID REFERENCES marketplace_auctions(id) ON DELETE CASCADE NOT NULL,
  bidder_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  bid_amount INTEGER NOT NULL,
  bid_time TIMESTAMPTZ DEFAULT NOW()
);

DROP INDEX IF EXISTS idx_marketplace_auctions_status;
CREATE INDEX idx_marketplace_auctions_status ON marketplace_auctions(status, end_time);

DROP INDEX IF EXISTS idx_auction_bids_auction;
CREATE INDEX idx_auction_bids_auction ON auction_bids(auction_id, bid_time DESC);

-- Item Crafting System
CREATE TABLE IF NOT EXISTS crafting_recipes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipe_name TEXT NOT NULL,
  result_item_type TEXT NOT NULL,
  result_item_data JSONB NOT NULL,
  required_materials JSONB NOT NULL, -- [{item_id, quantity}]
  token_cost INTEGER DEFAULT 0,
  crafting_time_minutes INTEGER DEFAULT 0,
  success_rate NUMERIC(3,2) DEFAULT 1.00,
  unlocked_at_level INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_crafting_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  recipe_id UUID REFERENCES crafting_recipes(id) ON DELETE CASCADE NOT NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completes_at TIMESTAMPTZ NOT NULL,
  is_completed BOOLEAN DEFAULT FALSE,
  result_item_id UUID
);

DROP INDEX IF EXISTS idx_user_crafting_queue;
CREATE INDEX idx_user_crafting_queue ON user_crafting_queue(user_id, is_completed, completes_at);

-- Tournament System
CREATE TABLE IF NOT EXISTS tournaments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_name TEXT NOT NULL,
  game_name TEXT NOT NULL,
  platform TEXT NOT NULL,
  tournament_type TEXT NOT NULL, -- 'single_elimination', 'double_elimination', 'round_robin'
  max_participants INTEGER NOT NULL,
  entry_fee INTEGER DEFAULT 0,
  prize_pool INTEGER DEFAULT 0,
  prize_distribution JSONB DEFAULT '{}', -- {1st: 50%, 2nd: 30%, 3rd: 20%}
  registration_start TIMESTAMPTZ NOT NULL,
  registration_end TIMESTAMPTZ NOT NULL,
  tournament_start TIMESTAMPTZ NOT NULL,
  tournament_end TIMESTAMPTZ,
  status TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'registration_open', 'in_progress', 'completed', 'cancelled')),
  rules TEXT,
  organizer_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add missing columns to tournaments if table already exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tournaments' AND column_name = 'tournament_start') THEN
    ALTER TABLE tournaments ADD COLUMN tournament_start TIMESTAMPTZ;
    RAISE NOTICE 'Added tournament_start column';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tournaments' AND column_name = 'tournament_end') THEN
    ALTER TABLE tournaments ADD COLUMN tournament_end TIMESTAMPTZ;
    RAISE NOTICE 'Added tournament_end column';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tournaments' AND column_name = 'prize_distribution') THEN
    ALTER TABLE tournaments ADD COLUMN prize_distribution JSONB DEFAULT '{}';
    RAISE NOTICE 'Added prize_distribution column';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS tournament_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  team_name TEXT,
  seed_number INTEGER,
  current_round INTEGER DEFAULT 0,
  is_eliminated BOOLEAN DEFAULT FALSE,
  final_placement INTEGER,
  registered_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tournament_id, user_id)
);

-- Add missing columns to tournament_participants if table already exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tournament_participants' AND column_name = 'is_eliminated') THEN
    ALTER TABLE tournament_participants ADD COLUMN is_eliminated BOOLEAN DEFAULT FALSE;
    RAISE NOTICE 'Added is_eliminated column';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tournament_participants' AND column_name = 'seed_number') THEN
    ALTER TABLE tournament_participants ADD COLUMN seed_number INTEGER;
    RAISE NOTICE 'Added seed_number column';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tournament_participants' AND column_name = 'final_placement') THEN
    ALTER TABLE tournament_participants ADD COLUMN final_placement INTEGER;
    RAISE NOTICE 'Added final_placement column';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS tournament_matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE NOT NULL,
  round_number INTEGER NOT NULL,
  match_number INTEGER NOT NULL,
  player1_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  player2_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  winner_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  player1_score INTEGER DEFAULT 0,
  player2_score INTEGER DEFAULT 0,
  scheduled_time TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'disputed'))
);

DROP INDEX IF EXISTS idx_tournaments_status;
CREATE INDEX idx_tournaments_status ON tournaments(status, tournament_start);

DROP INDEX IF EXISTS idx_tournament_participants;
CREATE INDEX idx_tournament_participants ON tournament_participants(tournament_id, is_eliminated);

DROP INDEX IF EXISTS idx_tournament_matches;
CREATE INDEX idx_tournament_matches ON tournament_matches(tournament_id, round_number);

-- Ranked System
CREATE TABLE IF NOT EXISTS ranked_seasons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  season_number INTEGER NOT NULL UNIQUE,
  season_name TEXT NOT NULL,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_rankings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  season_id UUID REFERENCES ranked_seasons(id) ON DELETE CASCADE NOT NULL,
  elo_rating INTEGER DEFAULT 1000,
  rank_tier TEXT DEFAULT 'bronze', -- bronze, silver, gold, platinum, diamond, master, grandmaster
  division INTEGER DEFAULT 4, -- 4-1 within each tier
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  win_rate NUMERIC(5,2) DEFAULT 0.00,
  games_played INTEGER DEFAULT 0,
  peak_rating INTEGER DEFAULT 1000,
  last_game_at TIMESTAMPTZ,
  decay_protected_until TIMESTAMPTZ,
  UNIQUE(user_id, season_id)
);

DROP INDEX IF EXISTS idx_user_rankings_season;
CREATE INDEX idx_user_rankings_season ON user_rankings(season_id, elo_rating DESC);

DROP INDEX IF EXISTS idx_user_rankings_tier;
CREATE INDEX idx_user_rankings_tier ON user_rankings(rank_tier, division, elo_rating DESC);

-- Ranked Match History
CREATE TABLE IF NOT EXISTS ranked_matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  season_id UUID REFERENCES ranked_seasons(id) ON DELETE CASCADE NOT NULL,
  winner_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  loser_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  winner_rating_before INTEGER NOT NULL,
  winner_rating_after INTEGER NOT NULL,
  loser_rating_before INTEGER NOT NULL,
  loser_rating_after INTEGER NOT NULL,
  rating_change INTEGER NOT NULL,
  match_data JSONB DEFAULT '{}',
  played_at TIMESTAMPTZ DEFAULT NOW()
);

DROP INDEX IF EXISTS idx_ranked_matches_season;
CREATE INDEX idx_ranked_matches_season ON ranked_matches(season_id, played_at DESC);

DROP INDEX IF EXISTS idx_ranked_matches_user;
CREATE INDEX idx_ranked_matches_user ON ranked_matches(winner_id, played_at DESC);

-- Clip & Highlight System
CREATE TABLE IF NOT EXISTS user_clips (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  clip_title TEXT NOT NULL,
  game_name TEXT,
  duration_seconds INTEGER NOT NULL,
  file_url TEXT NOT NULL,
  thumbnail_url TEXT,
  view_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  is_public BOOLEAN DEFAULT TRUE,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS clip_reactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clip_id UUID REFERENCES user_clips(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  reaction_type TEXT NOT NULL, -- 'like', 'fire', 'poggers', etc
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(clip_id, user_id)
);

DROP INDEX IF EXISTS idx_user_clips_user;
CREATE INDEX idx_user_clips_user ON user_clips(user_id, created_at DESC);

DROP INDEX IF EXISTS idx_user_clips_public;
CREATE INDEX idx_user_clips_public ON user_clips(is_public, created_at DESC) WHERE is_public = TRUE;

-- Profile Themes & Customization
CREATE TABLE IF NOT EXISTS profile_themes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  theme_name TEXT NOT NULL,
  theme_type TEXT NOT NULL, -- 'color', 'animated', 'video', 'seasonal'
  background_type TEXT, -- 'gradient', 'image', 'video'
  background_data JSONB NOT NULL, -- colors, urls, etc
  is_premium BOOLEAN DEFAULT FALSE,
  token_cost INTEGER DEFAULT 0,
  unlock_level INTEGER DEFAULT 1,
  is_seasonal BOOLEAN DEFAULT FALSE,
  available_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_owned_themes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  theme_id UUID REFERENCES profile_themes(id) ON DELETE CASCADE NOT NULL,
  acquired_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, theme_id)
);

-- Add theme columns to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS active_theme_id UUID REFERENCES profile_themes(id) ON DELETE SET NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profile_music_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profile_frame_id UUID;

-- Badge & Title System
CREATE TABLE IF NOT EXISTS badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  badge_name TEXT NOT NULL,
  badge_description TEXT,
  badge_icon_url TEXT NOT NULL,
  badge_type TEXT NOT NULL, -- 'achievement', 'seasonal', 'premium', 'event'
  is_animated BOOLEAN DEFAULT FALSE,
  rarity TEXT DEFAULT 'common', -- common, rare, epic, legendary
  unlock_criteria JSONB DEFAULT '{}',
  is_hidden BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  badge_id UUID REFERENCES badges(id) ON DELETE CASCADE NOT NULL,
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  is_equipped BOOLEAN DEFAULT FALSE,
  display_order INTEGER DEFAULT 0,
  UNIQUE(user_id, badge_id)
);

CREATE TABLE IF NOT EXISTS titles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title_text TEXT NOT NULL,
  title_color TEXT DEFAULT '#FFFFFF',
  is_animated BOOLEAN DEFAULT FALSE,
  unlock_criteria JSONB DEFAULT '{}',
  rarity TEXT DEFAULT 'common',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add title column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS active_title_id UUID REFERENCES titles(id) ON DELETE SET NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS title_color TEXT DEFAULT '#FFFFFF';

-- Friend Gifting
CREATE TABLE IF NOT EXISTS gift_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  recipient_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  gift_type TEXT NOT NULL, -- 'tokens', 'item', 'premium'
  gift_data JSONB NOT NULL,
  message TEXT,
  is_claimed BOOLEAN DEFAULT FALSE,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  claimed_at TIMESTAMPTZ
);

DROP INDEX IF EXISTS idx_gift_transactions_recipient;
CREATE INDEX idx_gift_transactions_recipient ON gift_transactions(recipient_id, is_claimed);

-- Analytics & Insights
CREATE TABLE IF NOT EXISTS user_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  analytics_date DATE NOT NULL,
  total_playtime_minutes INTEGER DEFAULT 0,
  tokens_earned INTEGER DEFAULT 0,
  tokens_spent INTEGER DEFAULT 0,
  games_played INTEGER DEFAULT 0,
  achievements_unlocked INTEGER DEFAULT 0,
  friends_added INTEGER DEFAULT 0,
  parties_joined INTEGER DEFAULT 0,
  genre_breakdown JSONB DEFAULT '{}',
  peak_hour INTEGER, -- 0-23
  UNIQUE(user_id, analytics_date)
);

DROP INDEX IF EXISTS idx_user_analytics;
CREATE INDEX idx_user_analytics ON user_analytics(user_id, analytics_date DESC);

-- Auto-Matchmaking Preferences
CREATE TABLE IF NOT EXISTS matchmaking_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  preferred_games TEXT[] DEFAULT '{}',
  preferred_platforms TEXT[] DEFAULT '{}',
  play_style TEXT, -- 'casual', 'competitive', 'mixed'
  skill_level TEXT, -- 'beginner', 'intermediate', 'advanced', 'expert'
  voice_required BOOLEAN DEFAULT FALSE,
  min_age INTEGER,
  preferred_languages TEXT[] DEFAULT '{}',
  time_zones TEXT[] DEFAULT '{}',
  availability JSONB DEFAULT '{}', -- {monday: [18, 19, 20], ...}
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Matchmaking Queue
CREATE TABLE IF NOT EXISTS matchmaking_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  game_name TEXT NOT NULL,
  platform TEXT NOT NULL,
  party_size INTEGER DEFAULT 1,
  joined_queue_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'searching' CHECK (status IN ('searching', 'matched', 'expired'))
);

DROP INDEX IF EXISTS idx_matchmaking_queue_status;
CREATE INDEX idx_matchmaking_queue_status ON matchmaking_queue(status, game_name, joined_queue_at);

-- RLS Policies
ALTER TABLE gaming_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_game_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE battle_passes ENABLE ROW LEVEL SECURITY;
ALTER TABLE battle_pass_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_battle_pass_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_auctions ENABLE ROW LEVEL SECURITY;
ALTER TABLE auction_bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE crafting_recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_crafting_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE ranked_seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_rankings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ranked_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_clips ENABLE ROW LEVEL SECURITY;
ALTER TABLE clip_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_owned_themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE titles ENABLE ROW LEVEL SECURITY;
ALTER TABLE gift_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE matchmaking_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE matchmaking_queue ENABLE ROW LEVEL SECURITY;

-- Basic RLS Policies (users can view/manage own data)
CREATE POLICY "Users manage own sessions" ON gaming_sessions FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Users manage own library" ON user_game_library FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Users view recommendations" ON game_recommendations FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Anyone view battle passes" ON battle_passes FOR SELECT USING (true);
CREATE POLICY "Anyone view tiers" ON battle_pass_tiers FOR SELECT USING (true);
CREATE POLICY "Users manage own progress" ON user_battle_pass_progress FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Anyone view auctions" ON marketplace_auctions FOR SELECT USING (true);
CREATE POLICY "Users manage own auctions" ON marketplace_auctions FOR ALL USING (seller_id = auth.uid());
CREATE POLICY "Users place bids" ON auction_bids FOR ALL USING (bidder_id = auth.uid());
CREATE POLICY "Anyone view recipes" ON crafting_recipes FOR SELECT USING (true);
CREATE POLICY "Users manage crafting queue" ON user_crafting_queue FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Anyone view tournaments" ON tournaments FOR SELECT USING (true);
CREATE POLICY "Users manage participation" ON tournament_participants FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Anyone view matches" ON tournament_matches FOR SELECT USING (true);
CREATE POLICY "Anyone view seasons" ON ranked_seasons FOR SELECT USING (true);
CREATE POLICY "Users view rankings" ON user_rankings FOR SELECT USING (true);
CREATE POLICY "Users view ranked matches" ON ranked_matches FOR SELECT USING (winner_id = auth.uid() OR loser_id = auth.uid());
CREATE POLICY "Users manage own clips" ON user_clips FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Anyone view public clips" ON user_clips FOR SELECT USING (is_public = TRUE);
CREATE POLICY "Users react to clips" ON clip_reactions FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Anyone view themes" ON profile_themes FOR SELECT USING (true);
CREATE POLICY "Users manage owned themes" ON user_owned_themes FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Anyone view badges" ON badges FOR SELECT USING (true);
CREATE POLICY "Users manage own badges" ON user_badges FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Anyone view titles" ON titles FOR SELECT USING (true);
CREATE POLICY "Users manage gifts" ON gift_transactions FOR ALL USING (sender_id = auth.uid() OR recipient_id = auth.uid());
CREATE POLICY "Users view own analytics" ON user_analytics FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users manage preferences" ON matchmaking_preferences FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Users manage queue" ON matchmaking_queue FOR ALL USING (user_id = auth.uid());

GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

