-- ===================================
-- COMPREHENSIVE ACHIEVEMENT DEBUG
-- ===================================

-- 1. Check if achievement functions exist
SELECT '=== CHECKING FUNCTIONS ===' AS step;

SELECT 
  routine_name, 
  routine_type,
  data_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name LIKE '%achievement%' 
ORDER BY routine_name;

-- 2. Check if tables exist and have data
SELECT '=== CHECKING TABLES ===' AS step;

SELECT 
  'user_achievements' AS table_name,
  COUNT(*) AS total_rows,
  COUNT(*) FILTER (WHERE unlocked = TRUE) AS unlocked_count,
  COUNT(*) FILTER (WHERE unlocked = FALSE) AS locked_count
FROM user_achievements;

SELECT 
  'achievement_unlocks' AS table_name,
  COUNT(*) AS total_unlock_events
FROM achievement_unlocks;

SELECT 
  'steam_achievements' AS table_name,
  COUNT(*) AS total_global_achievements
FROM steam_achievements;

-- 3. Get your user ID
SELECT '=== YOUR USER INFO ===' AS step;

SELECT 
  id AS user_id,
  username
FROM profiles 
WHERE username = 'boezy2k';

-- 4. Check if you have ANY achievements for ANY user
SELECT '=== SAMPLE ACHIEVEMENT DATA ===' AS step;

SELECT 
  ua.user_id,
  p.username,
  ua.game_id,
  COUNT(*) AS achievement_count,
  COUNT(*) FILTER (WHERE ua.unlocked = TRUE) AS unlocked,
  SUM(ua.tokens_awarded) AS total_tokens
FROM user_achievements ua
LEFT JOIN profiles p ON p.id = ua.user_id
GROUP BY ua.user_id, p.username, ua.game_id
ORDER BY achievement_count DESC
LIMIT 10;

-- 5. Check your specific achievements (using subquery to get user_id)
SELECT '=== YOUR ACHIEVEMENTS ===' AS step;

SELECT 
  game_id,
  achievement_name,
  unlocked,
  unlock_time,
  tokens_awarded,
  rarity_tier,
  global_percentage
FROM user_achievements
WHERE user_id = (SELECT id FROM profiles WHERE username = 'boezy2k')
ORDER BY unlock_time DESC NULLS LAST
LIMIT 20;

-- 6. Check your gaming accounts and games
SELECT '=== YOUR GAMING ACCOUNTS ===' AS step;

SELECT 
  ga.platform,
  ga.platform_user_id,
  ga.total_playtime_hours,
  COUNT(DISTINCT ug.id) AS total_games,
  COUNT(DISTINCT ug.id) FILTER (WHERE ug.hours_played > 0) AS played_games
FROM gaming_accounts ga
LEFT JOIN user_games ug ON ug.gaming_account_id = ga.id
WHERE ga.user_id = (SELECT id FROM profiles WHERE username = 'boezy2k')
GROUP BY ga.id, ga.platform, ga.platform_user_id, ga.total_playtime_hours;

-- 7. Sample of your games
SELECT '=== YOUR GAMES (SAMPLE) ===' AS step;

SELECT 
  game_name,
  game_id,
  hours_played,
  last_sync
FROM user_games
WHERE user_id = (SELECT id FROM profiles WHERE username = 'boezy2k')
ORDER BY hours_played DESC
LIMIT 10;

-- 8. Check RLS policies on user_achievements
SELECT '=== RLS POLICIES ===' AS step;

SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'user_achievements'
ORDER BY policyname;

