-- Cleanup unwanted tournament registrations
-- Run this in Supabase SQL Editor

-- Step 1: Delete any auto-registrations you didn't create
-- This will remove registrations where you didn't explicitly register

DO $$
BEGIN
  RAISE NOTICE 'Cleaning up tournament registrations...';
END $$;

-- Option 1: Remove ALL your tournament registrations (if you want a fresh start)
-- Uncomment this if you want to remove ALL registrations
/*
DELETE FROM tournament_participants 
WHERE user_id = auth.uid();
*/

-- Option 2: Remove registrations from specific tournaments
-- Replace 'Winter Championship' with the tournament name you want to leave
DELETE FROM tournament_participants 
WHERE user_id IN (
  SELECT id FROM profiles WHERE id = auth.uid()
)
AND tournament_id IN (
  SELECT id FROM tournaments 
  WHERE tournament_name LIKE '%Winter Championship%'
     OR game_name LIKE '%Winter%'
);

-- Step 2: Verify cleanup - show remaining registrations
SELECT 
  t.id,
  t.tournament_name,
  t.game_name,
  t.status,
  tp.registered_at,
  'You are registered' as message
FROM tournament_participants tp
JOIN tournaments t ON tp.tournament_id = t.id
WHERE tp.user_id IN (SELECT id FROM profiles WHERE id = auth.uid())
ORDER BY tp.registered_at DESC;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Tournament registrations cleaned up!';
  RAISE NOTICE 'Check the query results above to see your current registrations.';
END $$;

