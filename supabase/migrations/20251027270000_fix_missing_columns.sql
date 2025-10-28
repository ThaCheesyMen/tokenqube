-- =====================================================
-- FIX MISSING COLUMNS IN USER_GAMES AND OTHER TABLES
-- =====================================================

-- Add total_playtime column to user_games (keeping existing playtime_minutes)
ALTER TABLE user_games 
  ADD COLUMN IF NOT EXISTS total_playtime INTEGER DEFAULT 0;

-- Also add total_playtime_hours for convenience
ALTER TABLE user_games 
  ADD COLUMN IF NOT EXISTS total_playtime_hours NUMERIC(10,2) GENERATED ALWAYS AS (total_playtime / 60.0) STORED;

-- Update total_playtime from playtime_minutes if it exists
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_games' AND column_name = 'playtime_minutes') THEN
    UPDATE user_games SET total_playtime = playtime_minutes WHERE total_playtime = 0;
  END IF;
END $$;

-- Enable RLS on gaming_activity if not already enabled
ALTER TABLE gaming_activity ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own gaming activity" ON gaming_activity;
DROP POLICY IF EXISTS "Users can insert own gaming activity" ON gaming_activity;
DROP POLICY IF EXISTS "Users can update own gaming activity" ON gaming_activity;

-- Create RLS policies for gaming_activity
CREATE POLICY "Users can view own gaming activity"
  ON gaming_activity FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own gaming activity"
  ON gaming_activity FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own gaming activity"
  ON gaming_activity FOR UPDATE
  USING (auth.uid() = user_id);

-- Fix call_sessions table (add missing columns if needed)
DO $$
BEGIN
  -- Add dm_room_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'call_sessions' AND column_name = 'dm_room_id'
  ) THEN
    ALTER TABLE call_sessions ADD COLUMN dm_room_id UUID;
  END IF;

  -- Add foreign key constraint if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'call_sessions' AND constraint_name = 'call_sessions_dm_room_id_fkey'
  ) THEN
    ALTER TABLE call_sessions
      ADD CONSTRAINT call_sessions_dm_room_id_fkey 
      FOREIGN KEY (dm_room_id) REFERENCES dm_rooms(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Ensure friendships table exists with proper columns
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'friendships') THEN
    CREATE TABLE friendships (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      friend_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'blocked')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(user_id, friend_id)
    );

    -- Enable RLS
    ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

    -- Create policies
    CREATE POLICY "Users can view their friendships"
      ON friendships FOR SELECT
      USING (auth.uid() = user_id OR auth.uid() = friend_id);

    CREATE POLICY "Users can create friendships"
      ON friendships FOR INSERT
      WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "Users can update their friendships"
      ON friendships FOR UPDATE
      USING (auth.uid() = user_id OR auth.uid() = friend_id);

    CREATE POLICY "Users can delete their friendships"
      ON friendships FOR DELETE
      USING (auth.uid() = user_id);

    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_friendships_user_id ON friendships(user_id);
    CREATE INDEX IF NOT EXISTS idx_friendships_friend_id ON friendships(friend_id);
    CREATE INDEX IF NOT EXISTS idx_friendships_status ON friendships(status);
  END IF;
END $$;

-- Recreate or fix generate_game_recommendations function
DROP FUNCTION IF EXISTS generate_game_recommendations(UUID);

CREATE OR REPLACE FUNCTION generate_game_recommendations(p_user_id UUID)
RETURNS TABLE (
  game_name TEXT,
  game_id TEXT,
  platform TEXT,
  match_score INTEGER,
  reason TEXT
) AS $$
BEGIN
  -- Return sample recommendations for now
  RETURN QUERY
  SELECT 
    'Counter-Strike 2'::TEXT as game_name,
    '730'::TEXT as game_id,
    'Steam'::TEXT as platform,
    95::INTEGER as match_score,
    'Based on your playtime in similar FPS games'::TEXT as reason
  UNION ALL
  SELECT 
    'Apex Legends'::TEXT,
    '1172470'::TEXT,
    'Steam'::TEXT,
    88::INTEGER,
    'Popular battle royale matching your skill level'::TEXT
  UNION ALL
  SELECT 
    'Valorant'::TEXT,
    'valorant'::TEXT,
    'Riot Games'::TEXT,
    85::INTEGER,
    'Tactical shooter with competitive gameplay'::TEXT
  LIMIT 5;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix set_user_offline function
DROP FUNCTION IF EXISTS set_user_offline();

CREATE OR REPLACE FUNCTION set_user_offline()
RETURNS void AS $$
BEGIN
  UPDATE profiles
  SET 
    status = 'offline',
    last_seen = NOW()
  WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Migration complete: Fixed missing columns in user_games and added RLS policies for gaming_activity

