-- Update existing gaming account instead of inserting
-- This will update the data for your existing Steam account

UPDATE gaming_accounts
SET 
    platform_user_id = 'https://steamcommunity.com/id/sidsterflows/',
    platform_username = 'sidsterflows',
    is_verified = true,
    total_playtime_hours = 55,
    last_sync = NOW()
WHERE user_id = '4c4ef0a4-6689-46df-b215-37a9d2bcc089' 
  AND platform = 'steam'
RETURNING id;

-- After running the above UPDATE, copy the id that's returned
-- Then use that id in the achievements insert below

-- Get the gaming account ID for achievements
SELECT id FROM gaming_accounts 
WHERE user_id = '4c4ef0a4-6689-46df-b215-37a9d2bcc089' 
  AND platform = 'steam';
