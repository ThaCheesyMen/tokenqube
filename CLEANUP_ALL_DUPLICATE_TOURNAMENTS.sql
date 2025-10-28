-- Remove ALL Duplicate Tournaments (Official and Community)
-- This script removes duplicate tournaments based on tournament_name

-- ═══════════════════════════════════════════════════════════════
-- STEP 1: VIEW ALL DUPLICATES
-- ═══════════════════════════════════════════════════════════════

-- First, let's see what we have
SELECT 
  tournament_name,
  game_name,
  is_official,
  status,
  id,
  created_at
FROM tournaments
WHERE tournament_name IN (
  SELECT tournament_name
  FROM tournaments
  GROUP BY tournament_name
  HAVING COUNT(*) > 1
)
ORDER BY tournament_name, created_at DESC;

-- ═══════════════════════════════════════════════════════════════
-- STEP 2: DELETE DUPLICATE PARTICIPANTS FIRST (to avoid FK errors)
-- ═══════════════════════════════════════════════════════════════

-- Delete participants from tournaments that will be removed
DELETE FROM tournament_participants
WHERE tournament_id IN (
  WITH duplicates AS (
    SELECT 
      id,
      tournament_name,
      created_at,
      ROW_NUMBER() OVER (PARTITION BY tournament_name ORDER BY created_at DESC) as rn
    FROM tournaments
  )
  SELECT id 
  FROM duplicates 
  WHERE rn > 1
);

-- ═══════════════════════════════════════════════════════════════
-- STEP 3: DELETE DUPLICATE TOURNAMENTS
-- ═══════════════════════════════════════════════════════════════

-- Delete older duplicates, keeping the most recent one for each name
WITH duplicates AS (
  SELECT 
    id,
    tournament_name,
    created_at,
    ROW_NUMBER() OVER (PARTITION BY tournament_name ORDER BY created_at DESC) as rn
  FROM tournaments
)
DELETE FROM tournaments
WHERE id IN (
  SELECT id 
  FROM duplicates 
  WHERE rn > 1
);

-- ═══════════════════════════════════════════════════════════════
-- STEP 4: SHOW REMAINING TOURNAMENTS
-- ═══════════════════════════════════════════════════════════════

SELECT 
  t.tournament_name,
  t.game_name,
  t.is_official,
  t.status,
  (SELECT COUNT(*) FROM tournament_participants WHERE tournament_id = t.id) as participant_count,
  t.max_participants,
  COALESCE(t.tournament_start, t.start_date) as starts_at,
  t.created_at
FROM tournaments t
ORDER BY t.is_official DESC, t.tournament_name;

-- ═══════════════════════════════════════════════════════════════
-- STEP 5: VERIFY NO DUPLICATES
-- ═══════════════════════════════════════════════════════════════

-- This should show each tournament name only once
SELECT 
  tournament_name,
  COUNT(*) as count
FROM tournaments
GROUP BY tournament_name
HAVING COUNT(*) > 1;

-- If no results, success! All duplicates removed.

-- ═══════════════════════════════════════════════════════════════
-- SUCCESS MESSAGE
-- ═══════════════════════════════════════════════════════════════

DO $$
DECLARE
  v_total_count INTEGER;
  v_official_count INTEGER;
  v_community_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_total_count FROM tournaments;
  SELECT COUNT(*) INTO v_official_count FROM tournaments WHERE is_official = TRUE;
  SELECT COUNT(*) INTO v_community_count FROM tournaments WHERE is_official = FALSE OR is_official IS NULL;
  
  RAISE NOTICE '';
  RAISE NOTICE '════════════════════════════════════════════════════════════';
  RAISE NOTICE '✅ ALL DUPLICATE TOURNAMENTS REMOVED!';
  RAISE NOTICE '════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE 'Total tournaments: %', v_total_count;
  RAISE NOTICE 'Official tournaments: %', v_official_count;
  RAISE NOTICE 'Community tournaments: %', v_community_count;
  RAISE NOTICE '';
  RAISE NOTICE '🎉 Each tournament name is now unique!';
  RAISE NOTICE '';
  RAISE NOTICE '🔄 Hard refresh your browser (Ctrl + F5) to see changes!';
  RAISE NOTICE '════════════════════════════════════════════════════════════';
END $$;

