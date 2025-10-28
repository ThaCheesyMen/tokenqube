-- Dashboard Enhancement Features - Tables Only (No Constraints)
-- This migration creates tables without complex constraints to avoid deadlocks

-- =====================================================
-- NOTIFICATIONS SYSTEM
-- =====================================================

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  icon TEXT,
  action_url TEXT,
  action_data JSONB,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- =====================================================
-- TOURNAMENTS SYSTEM (Add missing columns to existing table)
-- =====================================================

-- Add missing columns to tournaments table  
ALTER TABLE tournaments 
  ADD COLUMN IF NOT EXISTS platform TEXT,
  ADD COLUMN IF NOT EXISTS game_id TEXT;

-- Note: tournaments table already exists with:
-- name, game_name, description, format, max_participants, current_participants,
-- entry_fee_tokens (as entry_fee_tokens), prize_pool_tokens, start_date, etc.

CREATE INDEX IF NOT EXISTS idx_tournaments_status ON tournaments(status);
CREATE INDEX IF NOT EXISTS idx_tournaments_dates ON tournaments(start_date);

-- Tournament participants
CREATE TABLE IF NOT EXISTS tournament_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL,
  user_id UUID NOT NULL,
  rank INTEGER,
  score INTEGER DEFAULT 0,
  joined_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tournament_participants_tournament ON tournament_participants(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_participants_user ON tournament_participants(user_id);

-- =====================================================
-- TOKEN TRANSACTION HISTORY
-- =====================================================

CREATE TABLE IF NOT EXISTS token_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  amount INTEGER NOT NULL,
  type TEXT NOT NULL,
  category TEXT DEFAULT 'other',
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_token_transactions_user ON token_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_token_transactions_category ON token_transactions(user_id, category);
CREATE INDEX IF NOT EXISTS idx_token_transactions_date ON token_transactions(created_at DESC);

-- =====================================================
-- GAME LAUNCH TRACKING
-- =====================================================

CREATE TABLE IF NOT EXISTS game_launches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  game_name TEXT NOT NULL,
  game_id TEXT,
  platform TEXT DEFAULT 'steam',
  launched_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_game_launches_user ON game_launches(user_id);
CREATE INDEX IF NOT EXISTS idx_game_launches_recent ON game_launches(user_id, launched_at DESC);

-- =====================================================
-- EVENTS SYSTEM
-- =====================================================

CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  type TEXT DEFAULT 'special',
  start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_date TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '7 days',
  rewards JSONB,
  banner_url TEXT,
  status TEXT DEFAULT 'upcoming',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_dates ON events(start_date, end_date);

COMMENT ON TABLE notifications IS 'User notifications for various events and actions';
COMMENT ON TABLE tournaments IS 'Gaming tournaments with prize pools';
COMMENT ON TABLE tournament_participants IS 'Users participating in tournaments';
COMMENT ON TABLE game_launches IS 'Track when users launch games';
COMMENT ON TABLE events IS 'Platform-wide events and special challenges';

