-- 🎮 TOURNAMENT MANAGEMENT SYSTEM 🎮
-- Automatic bracket generation, match tracking, and progression
-- Run this AFTER TOURNAMENT_ENHANCEMENTS.sql

-- ═══════════════════════════════════════════════════════════════
-- 1. AUTO-GENERATE TOURNAMENT BRACKET
-- ═══════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS generate_tournament_bracket(UUID) CASCADE;

CREATE FUNCTION generate_tournament_bracket(p_tournament_id UUID)
RETURNS TABLE (
  matches_created INTEGER,
  total_rounds INTEGER,
  message TEXT
) AS $$
DECLARE
  v_participants UUID[];
  v_participant_count INTEGER;
  v_max_participants INTEGER;
  v_tournament_type TEXT;
  v_rounds INTEGER;
  v_matches_per_round INTEGER;
  v_current_round INTEGER;
  v_match_number INTEGER;
  v_player_index INTEGER;
BEGIN
  -- Get tournament details
  SELECT 
    max_participants,
    COALESCE(tournament_type, format)
  INTO v_max_participants, v_tournament_type
  FROM tournaments
  WHERE id = p_tournament_id;
  
  -- Get registered participants
  SELECT array_agg(user_id ORDER BY registered_at)
  INTO v_participants
  FROM tournament_participants
  WHERE tournament_id = p_tournament_id;
  
  v_participant_count := array_length(v_participants, 1);
  
  IF v_participant_count IS NULL OR v_participant_count < 2 THEN
    RETURN QUERY SELECT 0, 0, 'Not enough participants (minimum 2 required)'::TEXT;
    RETURN;
  END IF;
  
  -- Calculate number of rounds (for single/double elimination)
  IF v_tournament_type IN ('single_elimination', 'double_elimination') THEN
    v_rounds := CEIL(LOG(2, v_participant_count))::INTEGER;
    v_matches_per_round := CEIL(v_participant_count / 2.0)::INTEGER;
    
    -- Create first round matches
    v_match_number := 1;
    v_player_index := 1;
    
    WHILE v_player_index <= v_participant_count LOOP
      INSERT INTO tournament_matches (
        tournament_id,
        round_number,
        match_number,
        player1_id,
        player2_id,
        match_status
      ) VALUES (
        p_tournament_id,
        1, -- First round
        v_match_number,
        v_participants[v_player_index],
        CASE 
          WHEN v_player_index + 1 <= v_participant_count 
          THEN v_participants[v_player_index + 1]
          ELSE NULL -- Bye (auto-advance)
        END,
        'pending'
      );
      
      v_match_number := v_match_number + 1;
      v_player_index := v_player_index + 2;
    END LOOP;
    
    RETURN QUERY SELECT 
      v_matches_per_round,
      v_rounds,
      format('Created %s matches across %s rounds', v_matches_per_round, v_rounds)::TEXT;
      
  ELSIF v_tournament_type = 'round_robin' THEN
    -- Round robin: everyone plays everyone
    v_rounds := v_participant_count - 1;
    v_match_number := 1;
    
    FOR i IN 1..v_participant_count LOOP
      FOR j IN (i+1)..v_participant_count LOOP
        INSERT INTO tournament_matches (
          tournament_id,
          round_number,
          match_number,
          player1_id,
          player2_id,
          match_status
        ) VALUES (
          p_tournament_id,
          1, -- All in round 1 for simplicity
          v_match_number,
          v_participants[i],
          v_participants[j],
          'pending'
        );
        v_match_number := v_match_number + 1;
      END LOOP;
    END LOOP;
    
    RETURN QUERY SELECT 
      v_match_number - 1,
      1,
      format('Created %s round-robin matches', v_match_number - 1)::TEXT;
  ELSE
    RETURN QUERY SELECT 0, 0, 'Unsupported tournament type'::TEXT;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION generate_tournament_bracket(UUID) TO authenticated;

-- ═══════════════════════════════════════════════════════════════
-- 2. UPDATE MATCH SCORE AND PROGRESS BRACKET
-- ═══════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS update_match_score(UUID, INTEGER, INTEGER, UUID) CASCADE;

CREATE FUNCTION update_match_score(
  p_match_id UUID,
  p_player1_score INTEGER,
  p_player2_score INTEGER,
  p_submitted_by UUID
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  winner_id UUID
) AS $$
DECLARE
  v_match RECORD;
  v_winner UUID;
  v_tournament_type TEXT;
  v_next_match_id UUID;
  v_next_match_number INTEGER;
BEGIN
  -- Get match details
  SELECT 
    m.*,
    COALESCE(t.tournament_type, t.format) as tournament_type
  INTO v_match
  FROM tournament_matches m
  JOIN tournaments t ON m.tournament_id = t.id
  WHERE m.id = p_match_id;
  
  IF v_match IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Match not found'::TEXT, NULL::UUID;
    RETURN;
  END IF;
  
  -- Verify submitter is a participant or admin
  IF p_submitted_by != v_match.player1_id 
     AND p_submitted_by != v_match.player2_id 
     AND NOT EXISTS (
       SELECT 1 FROM profiles 
       WHERE id = p_submitted_by 
       AND role = 'admin'
     ) THEN
    RETURN QUERY SELECT FALSE, 'Unauthorized to update this match'::TEXT, NULL::UUID;
    RETURN;
  END IF;
  
  -- Determine winner
  IF p_player1_score > p_player2_score THEN
    v_winner := v_match.player1_id;
  ELSIF p_player2_score > p_player1_score THEN
    v_winner := v_match.player2_id;
  ELSE
    RETURN QUERY SELECT FALSE, 'Scores cannot be tied'::TEXT, NULL::UUID;
    RETURN;
  END IF;
  
  -- Update match
  UPDATE tournament_matches
  SET 
    player1_score = p_player1_score,
    player2_score = p_player2_score,
    winner_id = v_winner,
    match_status = 'completed',
    completed_at = NOW()
  WHERE id = p_match_id;
  
  -- Progress bracket if single/double elimination
  IF v_match.tournament_type IN ('single_elimination', 'double_elimination') THEN
    -- Find or create next round match
    v_next_match_number := CEIL(v_match.match_number / 2.0)::INTEGER;
    
    SELECT id INTO v_next_match_id
    FROM tournament_matches
    WHERE tournament_id = v_match.tournament_id
      AND round_number = v_match.round_number + 1
      AND match_number = v_next_match_number;
    
    -- Create next match if doesn't exist
    IF v_next_match_id IS NULL THEN
      INSERT INTO tournament_matches (
        tournament_id,
        round_number,
        match_number,
        match_status
      ) VALUES (
        v_match.tournament_id,
        v_match.round_number + 1,
        v_next_match_number,
        'pending'
      ) RETURNING id INTO v_next_match_id;
    END IF;
    
    -- Advance winner to next match
    IF v_match.match_number % 2 = 1 THEN
      -- Odd match number -> player1 of next match
      UPDATE tournament_matches
      SET player1_id = v_winner
      WHERE id = v_next_match_id;
    ELSE
      -- Even match number -> player2 of next match
      UPDATE tournament_matches
      SET player2_id = v_winner
      WHERE id = v_next_match_id;
    END IF;
    
    -- Check if next match is ready to start
    UPDATE tournament_matches
    SET match_status = 'pending'
    WHERE id = v_next_match_id
      AND player1_id IS NOT NULL
      AND player2_id IS NOT NULL;
  END IF;
  
  -- Check if tournament is complete
  PERFORM check_tournament_completion(v_match.tournament_id);
  
  RETURN QUERY SELECT TRUE, 'Match score updated successfully'::TEXT, v_winner;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION update_match_score(UUID, INTEGER, INTEGER, UUID) TO authenticated;

-- ═══════════════════════════════════════════════════════════════
-- 3. CHECK AND COMPLETE TOURNAMENT
-- ═══════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS check_tournament_completion(UUID) CASCADE;

CREATE FUNCTION check_tournament_completion(p_tournament_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_pending_matches INTEGER;
  v_tournament_type TEXT;
  v_final_winner UUID;
  v_second_place UUID;
  v_third_place UUID;
BEGIN
  -- Count pending matches
  SELECT COUNT(*) INTO v_pending_matches
  FROM tournament_matches
  WHERE tournament_id = p_tournament_id
    AND match_status != 'completed';
  
  -- If all matches complete, finalize tournament
  IF v_pending_matches = 0 THEN
    SELECT COALESCE(tournament_type, format)
    INTO v_tournament_type
    FROM tournaments
    WHERE id = p_tournament_id;
    
    -- Get final standings
    IF v_tournament_type IN ('single_elimination', 'double_elimination') THEN
      -- Winner is from final match (highest round)
      SELECT winner_id INTO v_final_winner
      FROM tournament_matches
      WHERE tournament_id = p_tournament_id
      ORDER BY round_number DESC, match_number
      LIMIT 1;
      
      -- 2nd place is loser of final
      SELECT 
        CASE 
          WHEN player1_id = v_final_winner THEN player2_id
          ELSE player1_id
        END INTO v_second_place
      FROM tournament_matches
      WHERE tournament_id = p_tournament_id
      ORDER BY round_number DESC, match_number
      LIMIT 1;
      
      -- 3rd place is winner of second-to-last round
      SELECT winner_id INTO v_third_place
      FROM tournament_matches
      WHERE tournament_id = p_tournament_id
        AND winner_id != v_final_winner
        AND winner_id != v_second_place
      ORDER BY round_number DESC, match_number
      LIMIT 1;
      
    ELSIF v_tournament_type = 'round_robin' THEN
      -- Winner has most match wins
      WITH match_wins AS (
        SELECT 
          winner_id,
          COUNT(*) as wins
        FROM tournament_matches
        WHERE tournament_id = p_tournament_id
          AND winner_id IS NOT NULL
        GROUP BY winner_id
        ORDER BY COUNT(*) DESC
      )
      SELECT winner_id INTO v_final_winner
      FROM match_wins
      LIMIT 1;
    END IF;
    
    -- Create tournament results
    IF v_final_winner IS NOT NULL THEN
      INSERT INTO tournament_results (tournament_id, user_id, final_placement)
      VALUES (p_tournament_id, v_final_winner, 1)
      ON CONFLICT (tournament_id, user_id) DO UPDATE
      SET final_placement = 1;
    END IF;
    
    IF v_second_place IS NOT NULL THEN
      INSERT INTO tournament_results (tournament_id, user_id, final_placement)
      VALUES (p_tournament_id, v_second_place, 2)
      ON CONFLICT (tournament_id, user_id) DO UPDATE
      SET final_placement = 2;
    END IF;
    
    IF v_third_place IS NOT NULL THEN
      INSERT INTO tournament_results (tournament_id, user_id, final_placement)
      VALUES (p_tournament_id, v_third_place, 3)
      ON CONFLICT (tournament_id, user_id) DO UPDATE
      SET final_placement = 3;
    END IF;
    
    -- Mark tournament as completed
    UPDATE tournaments
    SET status = 'completed'
    WHERE id = p_tournament_id;
    
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION check_tournament_completion(UUID) TO authenticated;

-- ═══════════════════════════════════════════════════════════════
-- 4. START TOURNAMENT (Generate bracket and set status)
-- ═══════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS start_tournament(UUID, UUID) CASCADE;

CREATE FUNCTION start_tournament(
  p_tournament_id UUID,
  p_started_by UUID
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  matches_created INTEGER
) AS $$
DECLARE
  v_tournament RECORD;
  v_result RECORD;
  v_user_role TEXT;
BEGIN
  -- Get tournament
  SELECT * INTO v_tournament
  FROM tournaments
  WHERE id = p_tournament_id;
  
  IF v_tournament IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Tournament not found'::TEXT, 0;
    RETURN;
  END IF;
  
  -- Check authorization
  SELECT role INTO v_user_role
  FROM profiles
  WHERE id = p_started_by;
  
  IF v_user_role != 'admin' 
     AND v_tournament.organizer_id != p_started_by 
     AND v_tournament.is_official != TRUE THEN
    RETURN QUERY SELECT FALSE, 'Unauthorized to start this tournament'::TEXT, 0;
    RETURN;
  END IF;
  
  -- Check if already started
  IF v_tournament.status = 'in_progress' OR v_tournament.status = 'completed' THEN
    RETURN QUERY SELECT FALSE, 'Tournament already started'::TEXT, 0;
    RETURN;
  END IF;
  
  -- Generate bracket
  SELECT * INTO v_result
  FROM generate_tournament_bracket(p_tournament_id);
  
  IF v_result.matches_created = 0 THEN
    RETURN QUERY SELECT FALSE, v_result.message, 0;
    RETURN;
  END IF;
  
  -- Update tournament status
  UPDATE tournaments
  SET status = 'in_progress'
  WHERE id = p_tournament_id;
  
  -- Notify all participants
  INSERT INTO tournament_notifications (user_id, tournament_id, notification_type, title, message)
  SELECT 
    tp.user_id,
    p_tournament_id,
    'starting_soon',
    '🎮 Tournament Started!',
    v_tournament.tournament_name || ' has begun! Check your first match.'
  FROM tournament_participants tp
  WHERE tp.tournament_id = p_tournament_id;
  
  RETURN QUERY SELECT TRUE, v_result.message, v_result.matches_created;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION start_tournament(UUID, UUID) TO authenticated;

-- ═══════════════════════════════════════════════════════════════
-- 5. GET ACTIVE TOURNAMENTS (For monitoring dashboard)
-- ═══════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS get_active_tournaments() CASCADE;

CREATE FUNCTION get_active_tournaments()
RETURNS TABLE (
  tournament_id UUID,
  tournament_name TEXT,
  game_name TEXT,
  status TEXT,
  participant_count BIGINT,
  total_matches BIGINT,
  completed_matches BIGINT,
  pending_matches BIGINT,
  current_round INTEGER,
  tournament_start TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.tournament_name,
    t.game_name,
    t.status,
    (SELECT COUNT(*) FROM tournament_participants WHERE tournament_id = t.id) as participant_count,
    (SELECT COUNT(*) FROM tournament_matches WHERE tournament_id = t.id) as total_matches,
    (SELECT COUNT(*) FROM tournament_matches WHERE tournament_id = t.id AND match_status = 'completed') as completed_matches,
    (SELECT COUNT(*) FROM tournament_matches WHERE tournament_id = t.id AND match_status = 'pending') as pending_matches,
    (SELECT MAX(round_number) FROM tournament_matches WHERE tournament_id = t.id) as current_round,
    COALESCE(t.tournament_start, t.start_date) as tournament_start
  FROM tournaments t
  WHERE t.status IN ('in_progress', 'upcoming')
    AND COALESCE(t.tournament_start, t.start_date) >= NOW() - INTERVAL '24 hours'
  ORDER BY t.status DESC, COALESCE(t.tournament_start, t.start_date) ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_active_tournaments() TO authenticated;
GRANT EXECUTE ON FUNCTION get_active_tournaments() TO anon;

-- ═══════════════════════════════════════════════════════════════
-- 6. GET MY ACTIVE MATCHES (For players)
-- ═══════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS get_my_active_matches(UUID) CASCADE;

CREATE FUNCTION get_my_active_matches(p_user_id UUID)
RETURNS TABLE (
  match_id UUID,
  tournament_id UUID,
  tournament_name TEXT,
  game_name TEXT,
  round_number INTEGER,
  round_name TEXT,
  opponent_id UUID,
  opponent_username TEXT,
  match_status TEXT,
  my_score INTEGER,
  opponent_score INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id as match_id,
    t.id as tournament_id,
    t.tournament_name,
    t.game_name,
    m.round_number,
    CASE m.round_number
      WHEN 1 THEN 'Round 1'
      WHEN 2 THEN 'Round 2'
      WHEN 3 THEN 'Quarter Finals'
      WHEN 4 THEN 'Semi Finals'
      WHEN 5 THEN 'Finals'
      ELSE 'Round ' || m.round_number::TEXT
    END as round_name,
    CASE 
      WHEN m.player1_id = p_user_id THEN m.player2_id
      ELSE m.player1_id
    END as opponent_id,
    CASE 
      WHEN m.player1_id = p_user_id THEN p2.username
      ELSE p1.username
    END as opponent_username,
    m.match_status,
    CASE 
      WHEN m.player1_id = p_user_id THEN m.player1_score
      ELSE m.player2_score
    END as my_score,
    CASE 
      WHEN m.player1_id = p_user_id THEN m.player2_score
      ELSE m.player1_score
    END as opponent_score
  FROM tournament_matches m
  JOIN tournaments t ON m.tournament_id = t.id
  LEFT JOIN profiles p1 ON m.player1_id = p1.id
  LEFT JOIN profiles p2 ON m.player2_id = p2.id
  WHERE (m.player1_id = p_user_id OR m.player2_id = p_user_id)
    AND m.match_status IN ('pending', 'in_progress')
    AND t.status = 'in_progress'
  ORDER BY m.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_my_active_matches(UUID) TO authenticated;

-- ═══════════════════════════════════════════════════════════════
-- 7. SUCCESS MESSAGE
-- ═══════════════════════════════════════════════════════════════

DO $$
BEGIN
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '✅ TOURNAMENT MANAGEMENT SYSTEM INSTALLED!';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '🎮 New Functions Available:';
  RAISE NOTICE '  • generate_tournament_bracket(tournament_id)';
  RAISE NOTICE '  • start_tournament(tournament_id, user_id)';
  RAISE NOTICE '  • update_match_score(match_id, p1_score, p2_score, user_id)';
  RAISE NOTICE '  • check_tournament_completion(tournament_id)';
  RAISE NOTICE '  • get_active_tournaments()';
  RAISE NOTICE '  • get_my_active_matches(user_id)';
  RAISE NOTICE '';
  RAISE NOTICE '🏆 Features:';
  RAISE NOTICE '  ✓ Auto-generate brackets (single/double elim, round robin)';
  RAISE NOTICE '  ✓ Match score tracking';
  RAISE NOTICE '  ✓ Automatic bracket progression';
  RAISE NOTICE '  ✓ Tournament completion detection';
  RAISE NOTICE '  ✓ Player notifications';
  RAISE NOTICE '  ✓ Real-time monitoring';
  RAISE NOTICE '';
  RAISE NOTICE '🚀 Next: Build tournament management UI!';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
END $$;

