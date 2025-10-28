-- Remove Duplicate Official Tournaments
-- This keeps the newest instance of each tournament and removes older duplicates

-- ═══════════════════════════════════════════════════════════════
-- REMOVE DUPLICATE OFFICIAL TOURNAMENTS
-- ═══════════════════════════════════════════════════════════════

-- First, let's see what duplicates we have
DO $$
DECLARE
  v_duplicate_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_duplicate_count
  FROM tournaments
  WHERE is_official = TRUE
  GROUP BY tournament_name
  HAVING COUNT(*) > 1;
  
  RAISE NOTICE '════════════════════════════════════════════════════════════';
  RAISE NOTICE 'Found duplicate tournaments';
  RAISE NOTICE '════════════════════════════════════════════════════════════';
END $$;

-- Delete older duplicates, keeping the most recent one for each tournament
WITH duplicates AS (
  SELECT 
    id,
    tournament_name,
    created_at,
    ROW_NUMBER() OVER (PARTITION BY tournament_name ORDER BY created_at DESC) as rn
  FROM tournaments
  WHERE is_official = TRUE
)
DELETE FROM tournaments
WHERE id IN (
  SELECT id 
  FROM duplicates 
  WHERE rn > 1
);

-- Show remaining official tournaments
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM tournaments
  WHERE is_official = TRUE;
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ Cleanup Complete!';
  RAISE NOTICE '';
  RAISE NOTICE 'Remaining official tournaments: %', v_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Official Tournaments:';
END $$;

-- Display the remaining tournaments
SELECT 
  t.tournament_name,
  t.game_name,
  t.status,
  (SELECT COUNT(*) FROM tournament_participants WHERE tournament_id = t.id) as participant_count,
  t.max_participants,
  COALESCE(t.tournament_start, t.start_date) as starts_at,
  t.created_at
FROM tournaments t
WHERE t.is_official = TRUE
ORDER BY t.tournament_name;

-- ═══════════════════════════════════════════════════════════════
-- VERIFICATION
-- ═══════════════════════════════════════════════════════════════

-- Verify no duplicates remain
SELECT 
  tournament_name,
  COUNT(*) as count
FROM tournaments
WHERE is_official = TRUE
GROUP BY tournament_name
ORDER BY tournament_name;

-- Should show 3 tournaments, each with count = 1

-- ═══════════════════════════════════════════════════════════════
-- SUCCESS MESSAGE
-- ═══════════════════════════════════════════════════════════════

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '════════════════════════════════════════════════════════════';
  RAISE NOTICE '✅ DUPLICATE TOURNAMENTS REMOVED!';
  RAISE NOTICE '════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE 'You should now have exactly 3 official tournaments:';
  RAISE NOTICE '  1. TokenQube Fortnite Championship';
  RAISE NOTICE '  2. TokenQube Battlefield Championship';
  RAISE NOTICE '  3. TokenQube CS:GO Championship';
  RAISE NOTICE '';
  RAISE NOTICE 'Each tournament cycles every 6 hours automatically!';
  RAISE NOTICE '';
  RAISE NOTICE 'Refresh your browser to see the changes!';
  RAISE NOTICE '════════════════════════════════════════════════════════════';
END $$;

