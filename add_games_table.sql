-- Add games tracking table
-- Run this in Supabase SQL Editor

-- Create user_games table to track individual games
CREATE TABLE IF NOT EXISTS user_games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  gaming_account_id UUID REFERENCES gaming_accounts(id) ON DELETE CASCADE NOT NULL,
  game_name TEXT NOT NULL,
  game_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  hours_played NUMERIC(10, 2) DEFAULT 0,
  is_owned BOOLEAN DEFAULT true,
  image_url TEXT, -- URL to game cover image
  last_sync TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, gaming_account_id, game_id)
);

-- Add image_url column if it doesn't exist (for existing tables)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_games' AND column_name = 'image_url'
  ) THEN
    ALTER TABLE user_games ADD COLUMN image_url TEXT;
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_games_user_id ON user_games(user_id);
CREATE INDEX IF NOT EXISTS idx_user_games_gaming_account ON user_games(gaming_account_id);
CREATE INDEX IF NOT EXISTS idx_user_games_platform ON user_games(platform);

-- Enable RLS
ALTER TABLE user_games ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_games
CREATE POLICY "Users can view own games"
  ON user_games FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own games"
  ON user_games FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own games"
  ON user_games FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own games"
  ON user_games FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_games_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER trigger_user_games_updated_at
  BEFORE UPDATE ON user_games
  FOR EACH ROW
  EXECUTE FUNCTION update_user_games_updated_at();

-- Verify table was created
SELECT 'User games table created successfully!' as status;
