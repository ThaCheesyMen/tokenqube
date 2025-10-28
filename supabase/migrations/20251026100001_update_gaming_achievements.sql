-- Update gaming_achievements table for enhanced achievement tracking

-- Add new columns to gaming_achievements
ALTER TABLE gaming_achievements 
  ADD COLUMN IF NOT EXISTS game_id TEXT,
  ADD COLUMN IF NOT EXISTS achievement_display_name TEXT,
  ADD COLUMN IF NOT EXISTS rarity_percent NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS unlocked_at TIMESTAMPTZ DEFAULT now();

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_gaming_achievements_game ON gaming_achievements(game_id);
CREATE INDEX IF NOT EXISTS idx_gaming_achievements_user_game ON gaming_achievements(user_id, game_id);

-- Drop old function if exists (handles function overloading)
DROP FUNCTION IF EXISTS award_playtime_tokens(UUID, UUID, TEXT, NUMERIC, INTEGER);
DROP FUNCTION IF EXISTS award_playtime_tokens(UUID, TEXT, TEXT, INTEGER);

-- Update RPC function to award playtime tokens with new signature
CREATE OR REPLACE FUNCTION award_playtime_tokens(
  p_user_id UUID,
  p_gaming_account_id UUID,
  p_game_name TEXT,
  p_game_id TEXT,
  p_hours_played NUMERIC,
  p_tokens_earned INTEGER
)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  -- Insert playtime reward record
  INSERT INTO playtime_rewards (
    user_id,
    gaming_account_id,
    game_name,
    game_id,
    hours_played,
    tokens_earned
  ) VALUES (
    p_user_id,
    p_gaming_account_id,
    p_game_name,
    p_game_id,
    p_hours_played,
    p_tokens_earned
  );
  
  -- Update user balance
  UPDATE profiles
  SET 
    token_balance = token_balance + p_tokens_earned,
    total_earned = total_earned + p_tokens_earned
  WHERE id = p_user_id;
  
  -- Record transaction
  INSERT INTO transactions (user_id, amount, type, description)
  VALUES (
    p_user_id,
    p_tokens_earned,
    'gaming_playtime',
    format('Played %s hours of %s', ROUND(p_hours_played::numeric, 2), p_game_name)
  );
  
  v_result := json_build_object(
    'success', true,
    'tokens_earned', p_tokens_earned,
    'hours_played', p_hours_played
  );
  
  RETURN v_result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION award_playtime_tokens TO authenticated;
GRANT EXECUTE ON FUNCTION award_playtime_tokens TO service_role;

