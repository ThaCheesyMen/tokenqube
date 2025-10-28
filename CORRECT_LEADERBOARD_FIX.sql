-- ============================================
-- CORRECT LEADERBOARD FIX
-- Uses the SAME tables as the frontend
-- ============================================

-- Drop all old versions
DROP FUNCTION IF EXISTS get_leaderboard(TEXT, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS get_leaderboard(TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_leaderboard() CASCADE;

-- Create the CORRECT function matching frontend logic
CREATE OR REPLACE FUNCTION get_leaderboard(
    p_category TEXT DEFAULT 'tokens',
    p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
    user_id UUID,
    username TEXT,
    avatar_url TEXT,
    total_value NUMERIC,
    rank_position BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- TOKENS CATEGORY - Use token_balance from profiles
    IF p_category = 'tokens' THEN
        RETURN QUERY
        SELECT 
            p.id,
            p.username,
            p.avatar_url,
            COALESCE(p.token_balance, 0)::NUMERIC as total_value,
            ROW_NUMBER() OVER (ORDER BY COALESCE(p.token_balance, 0) DESC)::BIGINT as rank_position
        FROM profiles p
        ORDER BY COALESCE(p.token_balance, 0) DESC
        LIMIT p_limit;
    
    -- HOURS CATEGORY - Sum total_playtime_hours from gaming_accounts
    ELSIF p_category = 'hours' THEN
        RETURN QUERY
        SELECT 
            p.id,
            p.username,
            p.avatar_url,
            COALESCE(
                (SELECT SUM(COALESCE(ga.total_playtime_hours, 0)) 
                 FROM gaming_accounts ga 
                 WHERE ga.user_id = p.id),
                0
            )::NUMERIC as total_value,
            ROW_NUMBER() OVER (
                ORDER BY COALESCE(
                    (SELECT SUM(COALESCE(ga.total_playtime_hours, 0)) 
                     FROM gaming_accounts ga 
                     WHERE ga.user_id = p.id),
                    0
                ) DESC
            )::BIGINT as rank_position
        FROM profiles p
        ORDER BY total_value DESC
        LIMIT p_limit;
    
    -- GAMES CATEGORY - Count rows in user_games
    ELSIF p_category = 'games' THEN
        RETURN QUERY
        SELECT 
            p.id,
            p.username,
            p.avatar_url,
            COALESCE(
                (SELECT COUNT(*) 
                 FROM user_games ug 
                 WHERE ug.user_id = p.id),
                0
            )::NUMERIC as total_value,
            ROW_NUMBER() OVER (
                ORDER BY COALESCE(
                    (SELECT COUNT(*) 
                     FROM user_games ug 
                     WHERE ug.user_id = p.id),
                    0
                ) DESC
            )::BIGINT as rank_position
        FROM profiles p
        ORDER BY total_value DESC
        LIMIT p_limit;
    
    -- ACHIEVEMENTS CATEGORY - Count unlocked achievements
    ELSIF p_category = 'achievements' THEN
        RETURN QUERY
        SELECT 
            p.id,
            p.username,
            p.avatar_url,
            COALESCE(
                (SELECT COUNT(*) 
                 FROM user_achievements ua 
                 WHERE ua.user_id = p.id AND ua.unlocked = true),
                0
            )::NUMERIC as total_value,
            ROW_NUMBER() OVER (
                ORDER BY COALESCE(
                    (SELECT COUNT(*) 
                     FROM user_achievements ua 
                     WHERE ua.user_id = p.id AND ua.unlocked = true),
                    0
                ) DESC
            )::BIGINT as rank_position
        FROM profiles p
        ORDER BY total_value DESC
        LIMIT p_limit;
    
    ELSE
        -- Default to tokens
        RETURN QUERY
        SELECT 
            p.id,
            p.username,
            p.avatar_url,
            COALESCE(p.token_balance, 0)::NUMERIC as total_value,
            ROW_NUMBER() OVER (ORDER BY COALESCE(p.token_balance, 0) DESC)::BIGINT as rank_position
        FROM profiles p
        ORDER BY COALESCE(p.token_balance, 0) DESC
        LIMIT p_limit;
    END IF;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_leaderboard(TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_leaderboard(TEXT, INTEGER) TO anon;

-- ============================================
-- TEST ALL CATEGORIES
-- ============================================

-- Test tokens (should match frontend)
SELECT 'TOKENS LEADERBOARD' as test;
SELECT 
    username,
    total_value as tokens,
    rank_position
FROM get_leaderboard('tokens', 10);

-- Test hours (should match frontend - 141.0 for boezy2k)
SELECT 'HOURS LEADERBOARD' as test;
SELECT 
    username,
    total_value as hours,
    rank_position
FROM get_leaderboard('hours', 10);

-- Test games (should match frontend - 19 for boezy2k)
SELECT 'GAMES LEADERBOARD' as test;
SELECT 
    username,
    total_value as games,
    rank_position
FROM get_leaderboard('games', 10);

-- Test achievements (should match frontend)
SELECT 'ACHIEVEMENTS LEADERBOARD' as test;
SELECT 
    username,
    total_value as achievements,
    rank_position
FROM get_leaderboard('achievements', 10);

-- ============================================
-- VERIFY THE DATA SOURCES
-- ============================================

-- Show gaming_accounts data for boezy2k
SELECT 
    'GAMING_ACCOUNTS FOR BOEZY2K' as info,
    ga.platform,
    ga.total_playtime_hours
FROM gaming_accounts ga
JOIN profiles p ON p.id = ga.user_id
WHERE p.username = 'boezy2k';

-- Show user_games count for boezy2k
SELECT 
    'USER_GAMES FOR BOEZY2K' as info,
    COUNT(*) as total_games
FROM user_games ug
JOIN profiles p ON p.id = ug.user_id
WHERE p.username = 'boezy2k';

-- Show user_achievements count for boezy2k
SELECT 
    'USER_ACHIEVEMENTS FOR BOEZY2K' as info,
    COUNT(*) as total_achievements
FROM user_achievements ua
JOIN profiles p ON p.id = ua.user_id
WHERE p.username = 'boezy2k'
AND ua.unlocked = true;

