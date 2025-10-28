-- ⭐ TOURNAMENT SYSTEM ENHANCEMENTS ⭐
-- Adds: Brackets, Prize Distribution, Stats, Leaderboards, Notifications
-- Run this in Supabase SQL Editor

-- ═══════════════════════════════════════════════════════════════
-- 1. TOURNAMENT MATCHES (For Bracket System)
-- ═══════════════════════════════════════════════════════════════

-- Drop existing table if needed (clean slate)
DROP TABLE IF EXISTS tournament_matches CASCADE;

CREATE TABLE tournament_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE NOT NULL,
  round_number INTEGER NOT NULL,
  match_number INTEGER NOT NULL,
  player1_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  player2_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  winner_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  player1_score INTEGER DEFAULT 0,
  player2_score INTEGER DEFAULT 0,
  match_status TEXT DEFAULT 'pending',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tournament_id, round_number, match_number)
);

-- Add CHECK constraint after table creation
ALTER TABLE tournament_matches 
ADD CONSTRAINT tournament_matches_status_check 
CHECK (match_status IN ('pending', 'in_progress', 'completed', 'forfeit'));

CREATE INDEX idx_tournament_matches_tournament ON tournament_matches(tournament_id);
CREATE INDEX idx_tournament_matches_status ON tournament_matches(match_status);

-- ═══════════════════════════════════════════════════════════════
-- 2. TOURNAMENT RESULTS (Final Placements & Prizes)
-- ═══════════════════════════════════════════════════════════════

DROP TABLE IF EXISTS tournament_results CASCADE;

CREATE TABLE tournament_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  final_placement INTEGER NOT NULL,
  prize_tokens INTEGER DEFAULT 0,
  prize_awarded BOOLEAN DEFAULT FALSE,
  prize_awarded_at TIMESTAMPTZ,
  kills INTEGER DEFAULT 0,
  deaths INTEGER DEFAULT 0,
  score INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tournament_id, user_id)
);

CREATE INDEX idx_tournament_results_tournament ON tournament_results(tournament_id);
CREATE INDEX idx_tournament_results_user ON tournament_results(user_id);
CREATE INDEX idx_tournament_results_placement ON tournament_results(final_placement);

-- ═══════════════════════════════════════════════════════════════
-- 3. TOURNAMENT STATS (Player Performance)
-- ═══════════════════════════════════════════════════════════════

DROP TABLE IF EXISTS tournament_player_stats CASCADE;

CREATE TABLE tournament_player_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  total_tournaments INTEGER DEFAULT 0,
  tournaments_won INTEGER DEFAULT 0,
  tournaments_top3 INTEGER DEFAULT 0,
  total_prize_earnings INTEGER DEFAULT 0,
  best_placement INTEGER,
  current_win_streak INTEGER DEFAULT 0,
  longest_win_streak INTEGER DEFAULT 0,
  total_kills INTEGER DEFAULT 0,
  total_deaths INTEGER DEFAULT 0,
  average_placement DECIMAL(5,2),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX idx_tournament_stats_user ON tournament_player_stats(user_id);

-- ═══════════════════════════════════════════════════════════════
-- 4. TOURNAMENT NOTIFICATIONS
-- ═══════════════════════════════════════════════════════════════

DROP TABLE IF EXISTS tournament_notifications CASCADE;

CREATE TABLE tournament_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add CHECK constraint
ALTER TABLE tournament_notifications 
ADD CONSTRAINT tournament_notifications_type_check 
CHECK (notification_type IN ('starting_soon', 'match_ready', 'won_tournament', 'prize_awarded', 'tournament_completed'));

CREATE INDEX idx_tournament_notifications_user ON tournament_notifications(user_id, is_read);
CREATE INDEX idx_tournament_notifications_created ON tournament_notifications(created_at DESC);

-- ═══════════════════════════════════════════════════════════════
-- 5. AUTOMATED PRIZE DISTRIBUTION FUNCTION
-- ═══════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS distribute_tournament_prizes(UUID) CASCADE;

CREATE FUNCTION distribute_tournament_prizes(p_tournament_id UUID)
RETURNS TABLE (
  user_id UUID,
  placement INTEGER,
  prize_amount INTEGER,
  awarded BOOLEAN
) AS $$
DECLARE
  v_total_prize INTEGER;
  v_first_place_prize INTEGER;
  v_second_place_prize INTEGER;
  v_third_place_prize INTEGER;
  v_result RECORD;
BEGIN
  -- Get tournament prize pool
  SELECT COALESCE(prize_pool, prize_pool_tokens, 0)
  INTO v_total_prize
  FROM tournaments
  WHERE id = p_tournament_id;
  
  IF v_total_prize = 0 THEN
    RAISE NOTICE 'No prize pool for tournament %', p_tournament_id;
    RETURN;
  END IF;
  
  -- Calculate prize distribution (50%, 30%, 20%)
  v_first_place_prize := FLOOR(v_total_prize * 0.50);
  v_second_place_prize := FLOOR(v_total_prize * 0.30);
  v_third_place_prize := v_total_prize - v_first_place_prize - v_second_place_prize;
  
  -- Award 1st place
  FOR v_result IN 
    SELECT tr.user_id, tr.id as result_id
    FROM tournament_results tr
    WHERE tr.tournament_id = p_tournament_id
      AND tr.final_placement = 1
      AND tr.prize_awarded = FALSE
    LIMIT 1
  LOOP
    -- Add tokens to user
    UPDATE profiles
    SET token_balance = COALESCE(token_balance, 0) + v_first_place_prize
    WHERE id = v_result.user_id;
    
    -- Mark prize as awarded
    UPDATE tournament_results
    SET prize_tokens = v_first_place_prize,
        prize_awarded = TRUE,
        prize_awarded_at = NOW()
    WHERE id = v_result.result_id;
    
    -- Create notification
    INSERT INTO tournament_notifications (user_id, tournament_id, notification_type, title, message, data)
    VALUES (
      v_result.user_id,
      p_tournament_id,
      'prize_awarded',
      '🏆 You Won 1st Place!',
      'Congratulations! You won ' || v_first_place_prize || ' tokens!',
      jsonb_build_object('placement', 1, 'prize', v_first_place_prize)
    );
    
    RETURN QUERY SELECT v_result.user_id, 1, v_first_place_prize, TRUE;
  END LOOP;
  
  -- Award 2nd place
  FOR v_result IN 
    SELECT tr.user_id, tr.id as result_id
    FROM tournament_results tr
    WHERE tr.tournament_id = p_tournament_id
      AND tr.final_placement = 2
      AND tr.prize_awarded = FALSE
    LIMIT 1
  LOOP
    UPDATE profiles
    SET token_balance = COALESCE(token_balance, 0) + v_second_place_prize
    WHERE id = v_result.user_id;
    
    UPDATE tournament_results
    SET prize_tokens = v_second_place_prize,
        prize_awarded = TRUE,
        prize_awarded_at = NOW()
    WHERE id = v_result.result_id;
    
    INSERT INTO tournament_notifications (user_id, tournament_id, notification_type, title, message, data)
    VALUES (
      v_result.user_id,
      p_tournament_id,
      'prize_awarded',
      '🥈 You Won 2nd Place!',
      'Great job! You won ' || v_second_place_prize || ' tokens!',
      jsonb_build_object('placement', 2, 'prize', v_second_place_prize)
    );
    
    RETURN QUERY SELECT v_result.user_id, 2, v_second_place_prize, TRUE;
  END LOOP;
  
  -- Award 3rd place
  FOR v_result IN 
    SELECT tr.user_id, tr.id as result_id
    FROM tournament_results tr
    WHERE tr.tournament_id = p_tournament_id
      AND tr.final_placement = 3
      AND tr.prize_awarded = FALSE
    LIMIT 1
  LOOP
    UPDATE profiles
    SET token_balance = COALESCE(token_balance, 0) + v_third_place_prize
    WHERE id = v_result.user_id;
    
    UPDATE tournament_results
    SET prize_tokens = v_third_place_prize,
        prize_awarded = TRUE,
        prize_awarded_at = NOW()
    WHERE id = v_result.result_id;
    
    INSERT INTO tournament_notifications (user_id, tournament_id, notification_type, title, message, data)
    VALUES (
      v_result.user_id,
      p_tournament_id,
      'prize_awarded',
      '🥉 You Won 3rd Place!',
      'Well done! You won ' || v_third_place_prize || ' tokens!',
      jsonb_build_object('placement', 3, 'prize', v_third_place_prize)
    );
    
    RETURN QUERY SELECT v_result.user_id, 3, v_third_place_prize, TRUE;
  END LOOP;
  
  RAISE NOTICE 'Prizes distributed: 1st=%, 2nd=%, 3rd=%', v_first_place_prize, v_second_place_prize, v_third_place_prize;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION distribute_tournament_prizes(UUID) TO authenticated;

-- ═══════════════════════════════════════════════════════════════
-- 6. UPDATE PLAYER STATS FUNCTION
-- ═══════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS update_player_tournament_stats(UUID, INTEGER, INTEGER, INTEGER, INTEGER) CASCADE;

CREATE FUNCTION update_player_tournament_stats(
  p_user_id UUID,
  p_placement INTEGER,
  p_prize INTEGER,
  p_kills INTEGER DEFAULT 0,
  p_deaths INTEGER DEFAULT 0
)
RETURNS void AS $$
DECLARE
  v_won BOOLEAN;
  v_top3 BOOLEAN;
  v_current_streak INTEGER;
BEGIN
  v_won := (p_placement = 1);
  v_top3 := (p_placement <= 3);
  
  -- Get current streak
  SELECT current_win_streak INTO v_current_streak
  FROM tournament_player_stats
  WHERE user_id = p_user_id;
  
  -- If they won, increment streak, otherwise reset
  IF v_won THEN
    v_current_streak := COALESCE(v_current_streak, 0) + 1;
  ELSE
    v_current_streak := 0;
  END IF;
  
  -- Insert or update stats
  INSERT INTO tournament_player_stats (
    user_id,
    total_tournaments,
    tournaments_won,
    tournaments_top3,
    total_prize_earnings,
    best_placement,
    current_win_streak,
    longest_win_streak,
    total_kills,
    total_deaths,
    updated_at
  ) VALUES (
    p_user_id,
    1,
    CASE WHEN v_won THEN 1 ELSE 0 END,
    CASE WHEN v_top3 THEN 1 ELSE 0 END,
    p_prize,
    p_placement,
    v_current_streak,
    v_current_streak,
    p_kills,
    p_deaths,
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    total_tournaments = tournament_player_stats.total_tournaments + 1,
    tournaments_won = tournament_player_stats.tournaments_won + CASE WHEN v_won THEN 1 ELSE 0 END,
    tournaments_top3 = tournament_player_stats.tournaments_top3 + CASE WHEN v_top3 THEN 1 ELSE 0 END,
    total_prize_earnings = tournament_player_stats.total_prize_earnings + p_prize,
    best_placement = LEAST(tournament_player_stats.best_placement, p_placement),
    current_win_streak = v_current_streak,
    longest_win_streak = GREATEST(tournament_player_stats.longest_win_streak, v_current_streak),
    total_kills = tournament_player_stats.total_kills + p_kills,
    total_deaths = tournament_player_stats.total_deaths + p_deaths,
    average_placement = (
      (tournament_player_stats.average_placement * tournament_player_stats.total_tournaments + p_placement) 
      / (tournament_player_stats.total_tournaments + 1)
    ),
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION update_player_tournament_stats(UUID, INTEGER, INTEGER, INTEGER, INTEGER) TO authenticated;

-- ═══════════════════════════════════════════════════════════════
-- 7. GET TOURNAMENT LEADERBOARD
-- ═══════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS get_tournament_leaderboard(INTEGER) CASCADE;

CREATE FUNCTION get_tournament_leaderboard(p_limit INTEGER DEFAULT 100)
RETURNS TABLE (
  rank BIGINT,
  user_id UUID,
  username TEXT,
  avatar_url TEXT,
  total_tournaments INTEGER,
  tournaments_won INTEGER,
  win_rate DECIMAL,
  total_earnings INTEGER,
  current_streak INTEGER,
  best_placement INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ROW_NUMBER() OVER (ORDER BY s.tournaments_won DESC, s.total_prize_earnings DESC) as rank,
    s.user_id,
    p.username,
    p.avatar_url,
    s.total_tournaments,
    s.tournaments_won,
    CASE 
      WHEN s.total_tournaments > 0 
      THEN ROUND((s.tournaments_won::DECIMAL / s.total_tournaments::DECIMAL) * 100, 1)
      ELSE 0
    END as win_rate,
    s.total_prize_earnings,
    s.current_win_streak,
    s.best_placement
  FROM tournament_player_stats s
  JOIN profiles p ON s.user_id = p.id
  WHERE s.total_tournaments > 0
  ORDER BY s.tournaments_won DESC, s.total_prize_earnings DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_tournament_leaderboard(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_tournament_leaderboard(INTEGER) TO anon;

-- ═══════════════════════════════════════════════════════════════
-- 8. GET USER TOURNAMENT HISTORY
-- ═══════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS get_user_tournament_history(UUID, INTEGER) CASCADE;

CREATE FUNCTION get_user_tournament_history(p_user_id UUID, p_limit INTEGER DEFAULT 20)
RETURNS TABLE (
  tournament_id UUID,
  tournament_name TEXT,
  game_name TEXT,
  tournament_start TIMESTAMPTZ,
  final_placement INTEGER,
  prize_tokens INTEGER,
  total_participants BIGINT,
  kills INTEGER,
  deaths INTEGER,
  score INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id as tournament_id,
    t.tournament_name,
    t.game_name,
    COALESCE(t.tournament_start, t.start_date) as tournament_start,
    tr.final_placement,
    tr.prize_tokens,
    (SELECT COUNT(*) FROM tournament_participants WHERE tournament_id = t.id) as total_participants,
    tr.kills,
    tr.deaths,
    tr.score
  FROM tournament_results tr
  JOIN tournaments t ON tr.tournament_id = t.id
  WHERE tr.user_id = p_user_id
  ORDER BY COALESCE(t.tournament_start, t.start_date) DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_user_tournament_history(UUID, INTEGER) TO authenticated;

-- ═══════════════════════════════════════════════════════════════
-- 9. GET TOURNAMENT BRACKET
-- ═══════════════════════════════════════════════════════════════

-- Drop existing function with any signature
DO $$ 
BEGIN
  EXECUTE 'DROP FUNCTION IF EXISTS get_tournament_bracket CASCADE';
EXCEPTION 
  WHEN OTHERS THEN NULL;
END $$;

CREATE FUNCTION get_tournament_bracket(p_tournament_id UUID)
RETURNS TABLE (
  match_id UUID,
  round_number INTEGER,
  round_name TEXT,
  match_number INTEGER,
  player1_id UUID,
  player1_username TEXT,
  player1_score INTEGER,
  player2_id UUID,
  player2_username TEXT,
  player2_score INTEGER,
  winner_id UUID,
  match_status TEXT,
  completed_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id as match_id,
    m.round_number,
    CASE m.round_number
      WHEN 1 THEN 'Round 1'
      WHEN 2 THEN 'Round 2'
      WHEN 3 THEN 'Quarter Finals'
      WHEN 4 THEN 'Semi Finals'
      WHEN 5 THEN 'Finals'
      ELSE 'Round ' || m.round_number::TEXT
    END as round_name,
    m.match_number,
    m.player1_id,
    p1.username as player1_username,
    m.player1_score,
    m.player2_id,
    p2.username as player2_username,
    m.player2_score,
    m.winner_id,
    m.match_status,
    m.completed_at
  FROM tournament_matches m
  LEFT JOIN profiles p1 ON m.player1_id = p1.id
  LEFT JOIN profiles p2 ON m.player2_id = p2.id
  WHERE m.tournament_id = p_tournament_id
  ORDER BY m.round_number, m.match_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_tournament_bracket(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_tournament_bracket(UUID) TO anon;

-- ═══════════════════════════════════════════════════════════════
-- 10. AUTO-COMPLETE TOURNAMENT & DISTRIBUTE PRIZES TRIGGER
-- ═══════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS auto_complete_tournament() CASCADE;

CREATE FUNCTION auto_complete_tournament()
RETURNS TRIGGER AS $$
BEGIN
  -- When tournament status changes to 'completed', distribute prizes
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    -- Distribute prizes
    PERFORM distribute_tournament_prizes(NEW.id);
    
    -- Notify all participants
    INSERT INTO tournament_notifications (user_id, tournament_id, notification_type, title, message)
    SELECT 
      tp.user_id,
      NEW.id,
      'tournament_completed',
      'Tournament Completed!',
      NEW.tournament_name || ' has ended. Check results!'
    FROM tournament_participants tp
    WHERE tp.tournament_id = NEW.id;
    
    RAISE NOTICE 'Tournament % completed and prizes distributed', NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_complete_tournament ON tournaments;
CREATE TRIGGER trigger_auto_complete_tournament
  AFTER UPDATE OF status ON tournaments
  FOR EACH ROW
  EXECUTE FUNCTION auto_complete_tournament();

-- ═══════════════════════════════════════════════════════════════
-- 11. RLS POLICIES
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE tournament_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_player_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_notifications ENABLE ROW LEVEL SECURITY;

-- Anyone can view matches and results
DROP POLICY IF EXISTS "Anyone can view tournament matches" ON tournament_matches;
CREATE POLICY "Anyone can view tournament matches" ON tournament_matches FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Anyone can view tournament results" ON tournament_results;
CREATE POLICY "Anyone can view tournament results" ON tournament_results FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Anyone can view player stats" ON tournament_player_stats;
CREATE POLICY "Anyone can view player stats" ON tournament_player_stats FOR SELECT TO authenticated USING (true);

-- Users can view their own notifications
DROP POLICY IF EXISTS "Users can view own notifications" ON tournament_notifications;
CREATE POLICY "Users can view own notifications" ON tournament_notifications FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own notifications" ON tournament_notifications;
CREATE POLICY "Users can update own notifications" ON tournament_notifications FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- ═══════════════════════════════════════════════════════════════
-- 12. SUCCESS MESSAGE
-- ═══════════════════════════════════════════════════════════════

DO $$
BEGIN
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '✅ TOURNAMENT ENHANCEMENTS INSTALLED SUCCESSFULLY!';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '🏆 New Features Added:';
  RAISE NOTICE '  ✓ Live Tournament Brackets';
  RAISE NOTICE '  ✓ Automated Prize Distribution (50%%, 30%%, 20%%)';
  RAISE NOTICE '  ✓ Tournament History & Stats Tracking';
  RAISE NOTICE '  ✓ Global Leaderboards';
  RAISE NOTICE '  ✓ Tournament Notifications';
  RAISE NOTICE '';
  RAISE NOTICE '📊 New Tables Created:';
  RAISE NOTICE '  • tournament_matches';
  RAISE NOTICE '  • tournament_results';
  RAISE NOTICE '  • tournament_player_stats';
  RAISE NOTICE '  • tournament_notifications';
  RAISE NOTICE '';
  RAISE NOTICE '🔧 New Functions Available:';
  RAISE NOTICE '  • distribute_tournament_prizes(tournament_id)';
  RAISE NOTICE '  • update_player_tournament_stats(...)';
  RAISE NOTICE '  • get_tournament_leaderboard(limit)';
  RAISE NOTICE '  • get_user_tournament_history(user_id, limit)';
  RAISE NOTICE '  • get_tournament_bracket(tournament_id)';
  RAISE NOTICE '';
  RAISE NOTICE '🚀 Next Steps:';
  RAISE NOTICE '  1. Refresh your browser';
  RAISE NOTICE '  2. Go to Tournaments page';
  RAISE NOTICE '  3. New UI will be deployed automatically!';
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
END $$;

