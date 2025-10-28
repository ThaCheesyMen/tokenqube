-- Run Profile Enhancements Migration
\i supabase/migrations/20251027120000_profile_enhancements.sql

-- Run Achievements System Migration
\i supabase/migrations/20251027130000_achievements_system.sql

-- Verify tables were created
SELECT 
  'user_achievements' as table_name,
  COUNT(*) as row_count
FROM user_achievements
UNION ALL
SELECT 
  'achievement_unlocks' as table_name,
  COUNT(*) as row_count
FROM achievement_unlocks
UNION ALL
SELECT 
  'steam_achievements' as table_name,
  COUNT(*) as row_count
FROM steam_achievements;

-- Show profile columns
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'profiles'
AND column_name IN ('bio', 'custom_status', 'status', 'status_emoji', 'avatar_url', 'banner_url')
ORDER BY column_name;

