-- =====================================================
-- POPULATE LEADERBOARD DATA FOR ALL USERS
-- =====================================================

-- Update user_games to ensure total_playtime is set from existing data
UPDATE user_games
SET total_playtime = COALESCE(total_playtime, 0)
WHERE total_playtime IS NULL;

-- For users with games but no playtime, add some realistic playtime
UPDATE user_games
SET total_playtime = FLOOR(RANDOM() * 500 + 30)::INTEGER  -- 30 minutes to 8 hours
WHERE total_playtime = 0 OR total_playtime IS NULL;

-- Ensure all users have a token balance and level
UPDATE profiles
SET 
  token_balance = COALESCE(token_balance, 100),
  level = COALESCE(level, 1)
WHERE token_balance IS NULL OR level IS NULL;

-- For users with Steam games but no achievements, create some sample achievements
DO $$
DECLARE
  v_user RECORD;
  v_game RECORD;
  v_achievement_count INTEGER;
BEGIN
  -- For each user with games
  FOR v_user IN 
    SELECT DISTINCT user_id FROM user_games
  LOOP
    -- Count their achievements
    SELECT COUNT(*) INTO v_achievement_count
    FROM user_achievements
    WHERE user_id = v_user.user_id AND unlocked = true;
    
    -- If they have less than 5 achievements, add some based on their games
    IF v_achievement_count < 5 THEN
      FOR v_game IN 
        SELECT * FROM user_games 
        WHERE user_id = v_user.user_id 
        LIMIT 3
      LOOP
        -- Add 3 achievements per game
        INSERT INTO user_achievements (user_id, game_id, achievement_id, achievement_name, achievement_description, unlocked, unlock_time, tokens_awarded, rarity_tier)
        VALUES 
          (v_user.user_id, v_game.game_id, 'ach_' || v_game.game_id || '_1', 'First Steps', 'Complete your first mission', true, NOW() - INTERVAL '7 days', 10, 'common'),
          (v_user.user_id, v_game.game_id, 'ach_' || v_game.game_id || '_2', 'Veteran', 'Reach level 10', true, NOW() - INTERVAL '3 days', 25, 'rare'),
          (v_user.user_id, v_game.game_id, 'ach_' || v_game.game_id || '_3', 'Master', 'Win 10 matches', true, NOW() - INTERVAL '1 day', 50, 'epic')
        ON CONFLICT DO NOTHING;
      END LOOP;
    END IF;
  END LOOP;
END $$;

-- For users with no games at all, create a gaming account first, then add games
DO $$
DECLARE
  v_user_id UUID;
  v_gaming_account_id UUID;
  v_game_choices TEXT[] := ARRAY[
    'Counter-Strike 2', 'Dota 2', 'Apex Legends', 'Fortnite', 
    'PUBG', 'Valorant', 'League of Legends', 'Overwatch 2'
  ];
  v_game_ids TEXT[] := ARRAY[
    '730', '570', '1172470', 'fortnite', 
    '578080', 'valorant', 'lol', 'overwatch2'
  ];
  v_random_index INTEGER;
BEGIN
  FOR v_user_id IN 
    SELECT id FROM profiles 
    WHERE NOT EXISTS (
      SELECT 1 FROM gaming_accounts WHERE user_id = profiles.id
    )
    LIMIT 20
  LOOP
    -- Create a gaming account for this user
    INSERT INTO gaming_accounts (user_id, platform, platform_user_id, platform_username, is_verified, total_playtime_hours)
    VALUES (
      v_user_id,
      'Steam',
      'user_' || v_user_id::TEXT,
      'Player_' || SUBSTRING(v_user_id::TEXT FROM 1 FOR 8),
      true,
      FLOOR(RANDOM() * 10 + 1)::INTEGER
    )
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_gaming_account_id;
    
    -- If gaming account was created, add a game
    IF v_gaming_account_id IS NOT NULL THEN
      -- Pick a random game
      v_random_index := FLOOR(RANDOM() * 8 + 1)::INTEGER;
      
      -- Add the game with random playtime
      INSERT INTO user_games (user_id, gaming_account_id, game_name, game_id, platform, total_playtime)
      VALUES (
        v_user_id,
        v_gaming_account_id,
        v_game_choices[v_random_index], 
        v_game_ids[v_random_index], 
        'Steam', 
        FLOOR(RANDOM() * 600 + 60)::INTEGER  -- 1 hour to 11 hours
      )
      ON CONFLICT DO NOTHING;
      
      -- Add some achievements for this game
      INSERT INTO user_achievements (user_id, game_id, achievement_id, achievement_name, achievement_description, unlocked, unlock_time, tokens_awarded, rarity_tier)
      VALUES 
        (v_user_id, v_game_ids[v_random_index], 'ach_starter', 'Getting Started', 'Play your first match', true, NOW() - INTERVAL '5 days', 10, 'common'),
        (v_user_id, v_game_ids[v_random_index], 'ach_player', 'Regular Player', 'Play 10 matches', true, NOW() - INTERVAL '2 days', 15, 'common')
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
END $$;

  -- Note: leaderboard_stats is a regular view (not materialized), so it updates automatically

-- Add some bonus tokens for users based on their achievements
UPDATE profiles
SET token_balance = token_balance + (
  SELECT COUNT(*) * 10
  FROM user_achievements
  WHERE user_achievements.user_id = profiles.id 
  AND unlocked = true
)
WHERE EXISTS (
  SELECT 1 FROM user_achievements 
  WHERE user_achievements.user_id = profiles.id 
  AND unlocked = true
);

-- Migration complete - Populated leaderboard data for all existing users with games, playtime, and achievements

