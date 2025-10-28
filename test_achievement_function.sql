-- ===================================
-- TEST ACHIEVEMENT PROCESSING
-- ===================================

-- First, get your user ID
DO $$
DECLARE
  v_user_id UUID;
  v_result RECORD;
BEGIN
  -- Get user ID
  SELECT id INTO v_user_id FROM profiles WHERE username = 'boezy2k';
  
  RAISE NOTICE 'User ID: %', v_user_id;
  
  -- Test the process_achievement_unlock function directly
  RAISE NOTICE '=== TESTING process_achievement_unlock FUNCTION ===';
  
  SELECT * INTO v_result
  FROM process_achievement_unlock(
    v_user_id,
    '252490', -- Rust game ID
    'Rust',
    'TEST_ACH_001',
    'Test Achievement',
    'This is a test achievement',
    'https://example.com/icon.jpg',
    NOW(),
    50.0 -- 50% global completion rate
  );
  
  RAISE NOTICE 'Result - Tokens: %, Rarity: %, Is New: %', 
    v_result.tokens_earned, 
    v_result.rarity, 
    v_result.is_new_unlock;
    
  -- Check if it was inserted
  IF EXISTS (
    SELECT 1 FROM user_achievements 
    WHERE user_id = v_user_id 
      AND game_id = '252490' 
      AND achievement_id = 'TEST_ACH_001'
  ) THEN
    RAISE NOTICE '✅ Achievement was inserted into database!';
  ELSE
    RAISE NOTICE '❌ Achievement was NOT inserted into database!';
  END IF;
  
  -- Show the inserted achievement
  RAISE NOTICE '=== INSERTED ACHIEVEMENT ===';
  FOR v_result IN 
    SELECT * FROM user_achievements 
    WHERE user_id = v_user_id 
      AND game_id = '252490' 
      AND achievement_id = 'TEST_ACH_001'
  LOOP
    RAISE NOTICE 'Achievement: %, Unlocked: %, Tokens: %',
      v_result.achievement_name,
      v_result.unlocked,
      v_result.tokens_awarded;
  END LOOP;
  
  -- Test calling it again (should return 0 tokens as already unlocked)
  RAISE NOTICE '=== TESTING DUPLICATE CALL (should return 0 tokens) ===';
  
  SELECT * INTO v_result
  FROM process_achievement_unlock(
    v_user_id,
    '252490',
    'Rust',
    'TEST_ACH_001',
    'Test Achievement',
    'This is a test achievement',
    'https://example.com/icon.jpg',
    NOW(),
    50.0
  );
  
  RAISE NOTICE 'Second call - Tokens: %, Rarity: %, Is New: %', 
    v_result.tokens_earned, 
    v_result.rarity, 
    v_result.is_new_unlock;
    
  -- Cleanup test data
  DELETE FROM user_achievements 
  WHERE user_id = v_user_id 
    AND game_id = '252490' 
    AND achievement_id = 'TEST_ACH_001';
    
  DELETE FROM achievement_unlocks
  WHERE user_id = v_user_id
    AND game_id = '252490'
    AND achievement_id = 'TEST_ACH_001';
    
  RAISE NOTICE '🧹 Test data cleaned up';
  
END $$;

