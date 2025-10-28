-- ================================================
-- TOKENQUBE OFFICIAL TOURNAMENTS SYSTEM
-- ================================================
-- Creates 3 official recurring tournaments that reset every 6 hours
-- Fortnite, Battlefield 6, CS:GO

-- Function to create next tournament iteration
CREATE OR REPLACE FUNCTION create_next_official_tournament(
  p_game_name TEXT,
  p_tournament_type TEXT,
  p_max_participants INTEGER,
  p_entry_fee INTEGER,
  p_prize_pool INTEGER
) RETURNS UUID AS $$
DECLARE
  v_tournament_id UUID;
  v_next_start TIMESTAMPTZ;
  v_next_end TIMESTAMPTZ;
BEGIN
  -- Calculate next tournament start (next 6-hour block)
  v_next_start := date_trunc('hour', NOW()) + 
    INTERVAL '1 hour' * (6 - EXTRACT(HOUR FROM NOW())::INTEGER % 6);
  
  -- Registration ends 30 minutes before tournament start
  v_next_end := v_next_start - INTERVAL '30 minutes';
  
  -- Create tournament (handle both old and new column names)
  -- Build dynamic INSERT based on which columns exist
  EXECUTE format('
    INSERT INTO tournaments (
      %s,
      game_name,
      platform,
      %s,
      max_participants,
      %s,
      %s,
      %s,
      %s,
      %s,
      status,
      %s,
      rules,
      is_official
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
    ) RETURNING id',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tournaments' AND column_name = 'tournament_name') 
      THEN 'tournament_name' ELSE 'name' END,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tournaments' AND column_name = 'tournament_type') 
      THEN 'tournament_type' ELSE 'format' END,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tournaments' AND column_name = 'entry_fee') 
      THEN 'entry_fee' ELSE 'entry_fee_tokens' END,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tournaments' AND column_name = 'prize_pool') 
      THEN 'prize_pool' ELSE 'prize_pool_tokens' END,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tournaments' AND column_name = 'registration_start') 
      THEN 'registration_start' ELSE 'created_at' END,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tournaments' AND column_name = 'registration_end') 
      THEN 'registration_end' ELSE 'registration_deadline' END,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tournaments' AND column_name = 'tournament_start') 
      THEN 'tournament_start' ELSE 'start_date' END,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tournaments' AND column_name = 'organizer_id') 
      THEN 'organizer_id' ELSE 'created_by' END
  ) USING
    'TokenQube ' || p_game_name || ' Championship',
    p_game_name,
    'cross-platform',
    p_tournament_type,
    p_max_participants,
    p_entry_fee,
    p_prize_pool,
    NOW(),
    v_next_end,
    v_next_start,
    'upcoming',
    NULL::uuid, -- NULL for official tournaments (no specific organizer)
    'Official TokenQube tournament. Top players win token prizes! Good luck and have fun!',
    TRUE
  INTO v_tournament_id;
  
  RETURN v_tournament_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check and create new official tournaments
CREATE OR REPLACE FUNCTION maintain_official_tournaments()
RETURNS void AS $$
DECLARE
  v_fortnite_count INTEGER;
  v_bf6_count INTEGER;
  v_csgo_count INTEGER;
BEGIN
  -- Check for upcoming Fortnite tournaments (handle both column names)
  SELECT COUNT(*) INTO v_fortnite_count
  FROM tournaments
  WHERE game_name = 'Fortnite'
    AND is_official = TRUE
    AND status = 'upcoming'
    AND COALESCE(tournament_start, start_date) > NOW();
  
  IF v_fortnite_count = 0 THEN
    -- Use 'round_robin' as it's a valid format value
    PERFORM create_next_official_tournament('Fortnite', 'round_robin', 100, 50, 5000);
  END IF;
  
  -- Check for upcoming Battlefield 6 tournaments
  SELECT COUNT(*) INTO v_bf6_count
  FROM tournaments
  WHERE game_name = 'Battlefield 6'
    AND is_official = TRUE
    AND status = 'upcoming'
    AND COALESCE(tournament_start, start_date) > NOW();
  
  IF v_bf6_count = 0 THEN
    -- Use 'double_elimination' as it's a valid format value
    PERFORM create_next_official_tournament('Battlefield 6', 'double_elimination', 64, 50, 3000);
  END IF;
  
  -- Check for upcoming CS:GO tournaments
  SELECT COUNT(*) INTO v_csgo_count
  FROM tournaments
  WHERE game_name = 'CS:GO'
    AND is_official = TRUE
    AND status = 'upcoming'
    AND COALESCE(tournament_start, start_date) > NOW();
  
  IF v_csgo_count = 0 THEN
    PERFORM create_next_official_tournament('CS:GO', 'single_elimination', 32, 100, 10000);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add is_official column if it doesn't exist
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tournaments' AND column_name = 'is_official'
  ) THEN
    ALTER TABLE tournaments ADD COLUMN is_official BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_tournaments_official ON tournaments(is_official, status, tournament_start);

-- Grant permissions
GRANT EXECUTE ON FUNCTION create_next_official_tournament(TEXT, TEXT, INTEGER, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION maintain_official_tournaments() TO authenticated;

-- Initialize: Create first set of official tournaments
SELECT maintain_official_tournaments();

-- Auto-update tournament status based on time
CREATE OR REPLACE FUNCTION update_tournament_status()
RETURNS void AS $$
BEGIN
  -- Set to in_progress if tournament has started (handle both column names)
  UPDATE tournaments
  SET status = 'in_progress'
  WHERE status = 'upcoming'
    AND COALESCE(tournament_start, start_date) <= NOW();
  
  -- Set to completed if tournament ended (6 hours after start for official tournaments)
  UPDATE tournaments
  SET status = 'completed'
  WHERE status = 'in_progress'
    AND is_official = TRUE
    AND COALESCE(tournament_start, start_date) + INTERVAL '6 hours' <= NOW();
  
  -- Create new official tournaments after old ones complete
  PERFORM maintain_official_tournaments();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION update_tournament_status() TO authenticated;

-- Create RPC function for client to call
CREATE OR REPLACE FUNCTION get_official_tournaments()
RETURNS TABLE (
  id UUID,
  tournament_name TEXT,
  game_name TEXT,
  platform TEXT,
  tournament_type TEXT,
  max_participants INTEGER,
  entry_fee INTEGER,
  prize_pool INTEGER,
  registration_start TIMESTAMPTZ,
  registration_end TIMESTAMPTZ,
  tournament_start TIMESTAMPTZ,
  status TEXT,
  participant_count BIGINT,
  time_until_start INTERVAL
) AS $$
BEGIN
  -- Update statuses first
  PERFORM update_tournament_status();
  
  RETURN QUERY
  SELECT 
    t.id,
    COALESCE(t.tournament_name, t.name) as tournament_name,
    t.game_name,
    COALESCE(t.platform, 'PC'::TEXT) as platform,
    COALESCE(t.tournament_type, t.format) as tournament_type,
    t.max_participants,
    COALESCE(t.entry_fee, t.entry_fee_tokens, 0) as entry_fee,
    COALESCE(t.prize_pool, t.prize_pool_tokens, 0) as prize_pool,
    COALESCE(t.registration_start, t.created_at) as registration_start,
    COALESCE(t.registration_end, t.registration_deadline) as registration_end,
    COALESCE(t.tournament_start, t.start_date) as tournament_start,
    t.status,
    COUNT(tp.id) as participant_count,
    (COALESCE(t.tournament_start, t.start_date) - NOW()) as time_until_start
  FROM tournaments t
  LEFT JOIN tournament_participants tp ON t.id = tp.tournament_id
  WHERE t.is_official = TRUE
    AND t.status IN ('upcoming', 'in_progress')
  GROUP BY t.id, t.tournament_name, t.name, t.platform, t.tournament_type, t.format, 
           t.entry_fee, t.entry_fee_tokens, t.prize_pool, t.prize_pool_tokens,
           t.registration_start, t.created_at, t.registration_end, t.registration_deadline,
           t.tournament_start, t.start_date
  ORDER BY COALESCE(t.tournament_start, t.start_date) ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_official_tournaments() TO authenticated;
GRANT EXECUTE ON FUNCTION get_official_tournaments() TO anon;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Official TokenQube tournaments created!';
  RAISE NOTICE '🎮 Fortnite Championship - Round Robin, Every 6 hours, 100 players, 5000 tokens';
  RAISE NOTICE '🎮 Battlefield 6 Championship - Double Elimination, Every 6 hours, 64 players, 3000 tokens';
  RAISE NOTICE '🎮 CS:GO Championship - Single Elimination, Every 6 hours, 32 players, 10000 tokens';
  RAISE NOTICE '';
  RAISE NOTICE '🚀 Now refresh your browser and go to the Tournaments page!';
  RAISE NOTICE '⚡ Clear cache (Ctrl+Shift+Delete) and hard refresh (Ctrl+F5)';
END $$;

