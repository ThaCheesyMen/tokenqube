-- Insert Sample Games
-- Replace YOUR_USER_ID and YOUR_GAMING_ACCOUNT_ID with actual values

-- Step 1: Find your user ID
-- SELECT id, username FROM profiles WHERE username = 'YOUR_USERNAME';

-- Step 2: Find your gaming account ID
-- SELECT id, platform, platform_username FROM gaming_accounts WHERE user_id = 'YOUR_USER_ID';

-- Step 3: Insert sample games for Steam
-- Example: Insert a few games for testing

INSERT INTO user_games (
  user_id,
  gaming_account_id,
  game_name,
  game_id,
  platform,
  hours_played,
  is_owned,
  last_sync,
  created_at
) VALUES
  -- Replace with your actual IDs
  -- (
  --   'YOUR_USER_ID',
  --   'YOUR_GAMING_ACCOUNT_ID',
  --   'Cyberpunk 2077',
  --   '1091500',
  --   'steam',
  --   13.1,
  --   true,
  --   NOW(),
  --   NOW()
  -- ),
  -- (
  --   'YOUR_USER_ID',
  --   'YOUR_GAMING_ACCOUNT_ID',
  --   'THE FINALS',
  --   '2073850',
  --   'steam',
  --   37.5,
  --   true,
  --   NOW(),
  --   NOW()
  -- ),
  -- (
  --   'YOUR_USER_ID',
  --   'YOUR_GAMING_ACCOUNT_ID',
  --   'Half-Life 2',
  --   '220',
  --   'steam',
  --   8.5,
  --   true,
  --   NOW(),
  --   NOW()
  -- ),
  -- (
  --   'YOUR_USER_ID',
  --   'YOUR_GAMING_ACCOUNT_ID',
  --   'Grand Theft Auto V',
  --   '271590',
  --   'steam',
  --   125.3,
  --   true,
  --   NOW(),
  --   NOW()
  -- ),
  -- (
  --   'YOUR_USER_ID',
  --   'YOUR_GAMING_ACCOUNT_ID',
  --   'Counter-Strike 2',
  --   '730',
  --   'steam',
  --   250.7,
  --   true,
  --   NOW(),
  --   NOW()
  -- );

-- Uncomment the lines above and replace the IDs to insert games
-- Note: You can get your gaming account ID by running:
-- SELECT id FROM gaming_accounts WHERE user_id = auth.uid();
