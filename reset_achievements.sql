-- Drop existing achievement tables if they exist (in correct order due to dependencies)
DROP TABLE IF EXISTS achievement_unlocks CASCADE;
DROP TABLE IF EXISTS user_achievements CASCADE;
DROP TABLE IF EXISTS steam_achievements CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS calculate_achievement_tokens(DECIMAL);
DROP FUNCTION IF EXISTS process_achievement_unlock(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, DECIMAL);
DROP FUNCTION IF EXISTS get_user_achievement_stats(UUID);
DROP FUNCTION IF EXISTS get_recent_unlocks(UUID, INTEGER);
DROP FUNCTION IF EXISTS get_game_achievement_progress(UUID, TEXT);

-- Now run the achievements migration
\i supabase/migrations/20251027130000_achievements_system.sql

-- Verify
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
AND table_name IN ('steam_achievements', 'user_achievements', 'achievement_unlocks')
ORDER BY table_name;

