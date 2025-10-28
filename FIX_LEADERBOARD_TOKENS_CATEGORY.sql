-- ============================================
-- FIX LEADERBOARD TOKENS CATEGORY
-- Use total_earned instead of token_balance
-- ============================================

-- Drop and recreate the function with correct logic
DROP FUNCTION IF EXISTS get_leaderboard(TEXT, INTEGER) CASCADE;

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
    -- TOKENS CATEGORY - Use total_earned (lifetime earnings) NOT token_balance
    IF p_category = 'tokens' THEN
        RETURN QUERY
        SELECT 
            p.id,
            p.username,
            p.avatar_url,
            COALESCE(p.total_earned, 0)::NUMERIC as total_value,
            ROW_NUMBER() OVER (ORDER BY COALESCE(p.total_earned, 0) DESC)::BIGINT as rank_position
        FROM profiles p
        ORDER BY COALESCE(p.total_earned, 0) DESC
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
        -- Default to tokens (total_earned)
        RETURN QUERY
        SELECT 
            p.id,
            p.username,
            p.avatar_url,
            COALESCE(p.total_earned, 0)::NUMERIC as total_value,
            ROW_NUMBER() OVER (ORDER BY COALESCE(p.total_earned, 0) DESC)::BIGINT as rank_position
        FROM profiles p
        ORDER BY COALESCE(p.total_earned, 0) DESC
        LIMIT p_limit;
    END IF;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_leaderboard(TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_leaderboard(TEXT, INTEGER) TO anon;

-- ============================================
-- TEST THE FIX
-- ============================================

-- Test tokens leaderboard
SELECT 
    username,
    total_value as total_earned,
    rank_position
FROM get_leaderboard('tokens', 10);

-- Verify your data
SELECT 
    username,
    token_balance as current_balance,
    total_earned as lifetime_earnings,
    total_spent
FROM profiles
WHERE username = 'boezy2k';

-- Expected results:
-- token_balance = 3,105 (what you have now)
-- total_earned = 2,705 (lifetime earnings)
-- total_spent = 400 (what you've spent)

RAISE NOTICE '✅ Leaderboard now shows TOTAL EARNED (lifetime) not current balance';
RAISE NOTICE '📊 Your stats: Balance=3,105, Earned=2,705, Spent=400';

