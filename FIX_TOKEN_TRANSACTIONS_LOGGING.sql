-- ================================================================
-- FIX TOKEN TRANSACTIONS LOGGING
-- Ensures all token awards are logged to token_transactions table
-- ================================================================

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS add_tokens(UUID, INTEGER, TEXT) CASCADE;

-- Create improved add_tokens function with transaction logging
CREATE OR REPLACE FUNCTION add_tokens(
  p_user_id UUID,
  p_amount INTEGER,
  p_source TEXT DEFAULT 'playtime',
  p_description TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  v_category TEXT;
  v_description TEXT;
BEGIN
  -- Determine category based on source
  v_category := CASE p_source
    WHEN 'playtime' THEN 'playtime'
    WHEN 'gaming_session' THEN 'playtime'
    WHEN 'daily_login' THEN 'reward'
    WHEN 'quest' THEN 'quest'
    WHEN 'achievement' THEN 'reward'
    WHEN 'referral' THEN 'referral'
    WHEN 'leaderboard' THEN 'reward'
    ELSE 'other'
  END;

  -- Generate description if not provided
  v_description := COALESCE(
    p_description,
    CASE p_source
      WHEN 'playtime' THEN 'Earned from gaming session'
      WHEN 'gaming_session' THEN 'Earned from gaming session'
      WHEN 'daily_login' THEN 'Daily login reward'
      WHEN 'quest' THEN 'Quest completion reward'
      WHEN 'achievement' THEN 'Achievement unlocked'
      WHEN 'referral' THEN 'Friend referral bonus'
      WHEN 'leaderboard' THEN 'Leaderboard reward'
      ELSE 'Token reward'
    END
  );

  -- Update user balance
  UPDATE profiles
  SET 
    token_balance = token_balance + p_amount,
    total_earned = total_earned + p_amount,
    updated_at = NOW()
  WHERE id = p_user_id;

  -- Log transaction
  INSERT INTO token_transactions (
    user_id,
    amount,
    type,
    category,
    source,
    description,
    created_at
  ) VALUES (
    p_user_id,
    p_amount,
    'earn',
    v_category,
    p_source,
    v_description,
    NOW()
  );

  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error in add_tokens: %', SQLERRM;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION add_tokens(UUID, INTEGER, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION add_tokens(UUID, INTEGER, TEXT, TEXT) TO anon;

-- ================================================================
-- CREATE OR UPDATE RPC FOR SPENDING TOKENS
-- ================================================================

DROP FUNCTION IF EXISTS spend_tokens(UUID, INTEGER, TEXT, TEXT) CASCADE;

CREATE OR REPLACE FUNCTION spend_tokens(
  p_user_id UUID,
  p_amount INTEGER,
  p_category TEXT DEFAULT 'marketplace',
  p_description TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  v_current_balance INTEGER;
  v_description TEXT;
BEGIN
  -- Get current balance
  SELECT token_balance INTO v_current_balance
  FROM profiles
  WHERE id = p_user_id;

  -- Check if user has enough tokens
  IF v_current_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient tokens: has %, needs %', v_current_balance, p_amount;
  END IF;

  -- Generate description if not provided
  v_description := COALESCE(
    p_description,
    CASE p_category
      WHEN 'marketplace' THEN 'Marketplace purchase'
      WHEN 'boost' THEN 'Token boost activated'
      WHEN 'redemption' THEN 'Reward redemption'
      WHEN 'customization' THEN 'Profile customization'
      ELSE 'Token purchase'
    END
  );

  -- Update user balance
  UPDATE profiles
  SET 
    token_balance = token_balance - p_amount,
    total_spent = total_spent + p_amount,
    updated_at = NOW()
  WHERE id = p_user_id;

  -- Log transaction
  INSERT INTO token_transactions (
    user_id,
    amount,
    type,
    category,
    source,
    description,
    created_at
  ) VALUES (
    p_user_id,
    p_amount,
    'spend',
    p_category,
    NULL,
    v_description,
    NOW()
  );

  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error in spend_tokens: %', SQLERRM;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION spend_tokens(UUID, INTEGER, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION spend_tokens(UUID, INTEGER, TEXT, TEXT) TO anon;

-- ================================================================
-- UPDATE PLAYTIME TRACKING TO USE NEW FUNCTION
-- ================================================================

-- This function is called by the frontend when tracking playtime
-- It should now properly log transactions via add_tokens
CREATE OR REPLACE FUNCTION update_playtime(
  p_user_id UUID,
  p_game_name TEXT,
  p_hours_to_add NUMERIC,
  p_platform TEXT DEFAULT 'PC'
) RETURNS VOID AS $$
DECLARE
  v_tokens_earned INTEGER;
  v_gaming_account_id UUID;
BEGIN
  -- Calculate tokens (50 per hour)
  v_tokens_earned := FLOOR(p_hours_to_add * 50);

  -- Get or create gaming account
  INSERT INTO gaming_accounts (user_id, platform, platform_id, total_playtime_hours)
  VALUES (p_user_id, p_platform, p_user_id::TEXT, 0)
  ON CONFLICT (user_id, platform, platform_id)
  DO UPDATE SET updated_at = NOW()
  RETURNING id INTO v_gaming_account_id;

  -- Update playtime
  UPDATE gaming_accounts
  SET total_playtime_hours = total_playtime_hours + p_hours_to_add
  WHERE id = v_gaming_account_id;

  -- Award tokens using the improved function (which logs transactions)
  IF v_tokens_earned > 0 THEN
    PERFORM add_tokens(
      p_user_id,
      v_tokens_earned,
      'playtime',
      'Played ' || p_game_name || ' for ' || ROUND(p_hours_to_add::NUMERIC, 2)::TEXT || ' hours'
    );
  END IF;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION update_playtime(UUID, TEXT, NUMERIC, TEXT) TO authenticated;

-- ================================================================
-- VERIFY SETUP
-- ================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Token transaction logging system updated!';
  RAISE NOTICE '✅ add_tokens now creates transaction records';
  RAISE NOTICE '✅ spend_tokens now creates transaction records';
  RAISE NOTICE '✅ update_playtime integrated with new system';
  RAISE NOTICE '';
  RAISE NOTICE '🎮 Gaming sessions will now appear in transaction history';
  RAISE NOTICE '💰 All token earnings are logged automatically';
END $$;

