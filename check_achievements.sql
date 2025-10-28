-- Check if achievements are in the database
-- Replace 'YOUR_USER_ID' with your actual user ID from the profiles table

-- First, get your user ID
SELECT id, username, email FROM profiles WHERE username = 'boezy2k';

-- Check total achievements
SELECT 
  COUNT(*) as total_achievements,
  COUNT(*) FILTER (WHERE unlocked = TRUE) as unlocked_count,
  COUNT(*) FILTER (WHERE unlocked = FALSE) as locked_count,
  SUM(tokens_awarded) FILTER (WHERE unlocked = TRUE) as total_tokens_earned
FROM user_achievements
WHERE user_id = (SELECT id FROM profiles WHERE username = 'boezy2k');

-- Show sample of unlocked achievements
SELECT 
  achievement_name,
  game_id,
  unlocked,
  tokens_awarded,
  rarity_tier,
  unlock_time
FROM user_achievements
WHERE user_id = (SELECT id FROM profiles WHERE username = 'boezy2k')
AND unlocked = TRUE
ORDER BY tokens_awarded DESC
LIMIT 10;

-- Check achievement_unlocks table (for notifications)
SELECT COUNT(*) as unlock_records
FROM achievement_unlocks
WHERE user_id = (SELECT id FROM profiles WHERE username = 'boezy2k');

-- Show recent unlocks
SELECT 
  game_name,
  achievement_name,
  tokens_earned,
  rarity_tier,
  unlocked_at
FROM achievement_unlocks
WHERE user_id = (SELECT id FROM profiles WHERE username = 'boezy2k')
ORDER BY unlocked_at DESC
LIMIT 10;

