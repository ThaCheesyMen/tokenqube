-- =====================================================
-- FIX LEADERBOARD DATA AND ADD COMPUTED STATS
-- =====================================================

-- Create a view for leaderboard stats that aggregates data properly
CREATE OR REPLACE VIEW leaderboard_stats AS
SELECT 
  p.id as user_id,
  p.username,
  p.avatar_url,
  COALESCE(p.token_balance, 0) as tokens,
  COALESCE(p.level, 1) as level,
  -- Total playtime from user_games (total_playtime is in minutes, convert to hours)
  COALESCE(SUM(ug.total_playtime) / 60.0, 0) as total_hours,
  -- Total number of games
  COALESCE(COUNT(DISTINCT ug.id), 0) as total_games,
  -- Total achievements unlocked
  COALESCE((
    SELECT COUNT(*)
    FROM user_achievements ua
    WHERE ua.user_id = p.id AND ua.unlocked = true
  ), 0) as total_achievements
FROM profiles p
LEFT JOIN user_games ug ON ug.user_id = p.id
GROUP BY p.id, p.username, p.avatar_url, p.token_balance, p.level;

-- Grant access to authenticated users
GRANT SELECT ON leaderboard_stats TO authenticated;

-- Function to get leaderboard by category
CREATE OR REPLACE FUNCTION get_leaderboard(
  p_category TEXT DEFAULT 'tokens',
  p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
  user_id UUID,
  username TEXT,
  avatar_url TEXT,
  tokens INTEGER,
  level INTEGER,
  total_hours NUMERIC,
  total_games BIGINT,
  total_achievements BIGINT,
  rank INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ls.user_id,
    ls.username,
    ls.avatar_url,
    ls.tokens,
    ls.level,
    ls.total_hours,
    ls.total_games,
    ls.total_achievements,
    CASE 
      WHEN p_category = 'hours' THEN ROW_NUMBER() OVER (ORDER BY ls.total_hours DESC)
      WHEN p_category = 'games' THEN ROW_NUMBER() OVER (ORDER BY ls.total_games DESC)
      WHEN p_category = 'achievements' THEN ROW_NUMBER() OVER (ORDER BY ls.total_achievements DESC)
      ELSE ROW_NUMBER() OVER (ORDER BY ls.tokens DESC)
    END::INTEGER as rank
  FROM leaderboard_stats ls
  WHERE 
    CASE 
      WHEN p_category = 'hours' THEN ls.total_hours > 0
      WHEN p_category = 'games' THEN ls.total_games > 0
      WHEN p_category = 'achievements' THEN ls.total_achievements > 0
      ELSE ls.tokens >= 0
    END
  ORDER BY 
    CASE 
      WHEN p_category = 'hours' THEN ls.total_hours
      WHEN p_category = 'games' THEN ls.total_games::NUMERIC
      WHEN p_category = 'achievements' THEN ls.total_achievements::NUMERIC
      ELSE ls.tokens::NUMERIC
    END DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's rank in a specific category
CREATE OR REPLACE FUNCTION get_user_rank(
  p_user_id UUID,
  p_category TEXT DEFAULT 'tokens'
)
RETURNS INTEGER AS $$
DECLARE
  v_rank INTEGER;
BEGIN
  SELECT rank INTO v_rank
  FROM (
    SELECT 
      user_id,
      CASE 
        WHEN p_category = 'hours' THEN ROW_NUMBER() OVER (ORDER BY total_hours DESC)
        WHEN p_category = 'games' THEN ROW_NUMBER() OVER (ORDER BY total_games DESC)
        WHEN p_category = 'achievements' THEN ROW_NUMBER() OVER (ORDER BY total_achievements DESC)
        ELSE ROW_NUMBER() OVER (ORDER BY tokens DESC)
      END::INTEGER as rank
    FROM leaderboard_stats
    WHERE 
      CASE 
        WHEN p_category = 'hours' THEN total_hours > 0
        WHEN p_category = 'games' THEN total_games > 0
        WHEN p_category = 'achievements' THEN total_achievements > 0
        ELSE tokens >= 0
      END
  ) ranked
  WHERE user_id = p_user_id;
  
  RETURN COALESCE(v_rank, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Migration complete
-- View and functions created successfully
-- Users will appear in leaderboard based on their actual data (tokens, games, achievements, playtime)
COMMENT ON VIEW leaderboard_stats IS 'Aggregated leaderboard statistics for all users';

