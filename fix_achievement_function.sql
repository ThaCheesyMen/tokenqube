-- Fix the process_achievement_unlock function to properly award tokens on first sync
-- This fixes the issue where already-earned achievements weren't being rewarded

CREATE OR REPLACE FUNCTION process_achievement_unlock(
  p_user_id UUID,
  p_game_id TEXT,
  p_game_name TEXT,
  p_achievement_id TEXT,
  p_achievement_name TEXT,
  p_achievement_description TEXT,
  p_icon_url TEXT,
  p_unlock_time TIMESTAMPTZ,
  p_global_percentage DECIMAL DEFAULT NULL
)
RETURNS TABLE(tokens_earned INTEGER, rarity TEXT, is_new_unlock BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_already_unlocked BOOLEAN;
  v_tokens INTEGER;
  v_rarity TEXT;
  v_reward_result RECORD;
BEGIN
  -- Check if already unlocked (and exists in database)
  SELECT unlocked INTO v_already_unlocked
  FROM user_achievements
  WHERE user_id = p_user_id 
    AND game_id = p_game_id 
    AND achievement_id = p_achievement_id;

  -- If already unlocked (and exists), return early with no rewards
  -- v_already_unlocked will be NULL if record doesn't exist (first sync)
  -- v_already_unlocked will be TRUE if already rewarded
  -- v_already_unlocked will be FALSE if was locked but now unlocked
  IF v_already_unlocked IS NOT NULL AND v_already_unlocked = TRUE THEN
    RETURN QUERY SELECT 0, 'common'::TEXT, FALSE;
    RETURN;
  END IF;

  -- Calculate token reward based on rarity
  SELECT * INTO v_reward_result
  FROM calculate_achievement_tokens(p_global_percentage);
  
  v_tokens := v_reward_result.tokens;
  v_rarity := v_reward_result.rarity;

  -- Insert or update user achievement
  INSERT INTO user_achievements (
    user_id, game_id, achievement_id, achievement_name, achievement_description,
    icon_url, unlocked, unlock_time, tokens_awarded, rarity_tier
  )
  VALUES (
    p_user_id, p_game_id, p_achievement_id, p_achievement_name, p_achievement_description,
    p_icon_url, TRUE, p_unlock_time, v_tokens, v_rarity
  )
  ON CONFLICT (user_id, game_id, achievement_id)
  DO UPDATE SET
    unlocked = TRUE,
    unlock_time = p_unlock_time,
    tokens_awarded = v_tokens,
    rarity_tier = v_rarity,
    updated_at = NOW();

  -- Award tokens to user
  UPDATE profiles
  SET total_tokens = total_tokens + v_tokens
  WHERE id = p_user_id;

  -- Create unlock notification record
  INSERT INTO achievement_unlocks (
    user_id, game_id, game_name, achievement_id, achievement_name,
    achievement_description, icon_url, tokens_earned, rarity_tier, unlocked_at
  )
  VALUES (
    p_user_id, p_game_id, p_game_name, p_achievement_id, p_achievement_name,
    p_achievement_description, p_icon_url, v_tokens, v_rarity, p_unlock_time
  );

  -- Return result
  RETURN QUERY SELECT v_tokens, v_rarity, TRUE;
END;
$$;

-- Verify the function was updated
SELECT '✅ Function updated successfully! Now achievements will be properly rewarded on first sync.' as status;

