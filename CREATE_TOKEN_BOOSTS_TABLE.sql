-- ================================================================
-- CREATE TOKEN BOOSTS TABLE
-- For the Quick Actions Bar to track active boosts
-- ================================================================

-- Create token_boosts table
CREATE TABLE IF NOT EXISTS token_boosts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  boost_type TEXT NOT NULL, -- '2x', '3x', '5x', etc.
  multiplier NUMERIC NOT NULL DEFAULT 2.0,
  duration_hours INTEGER NOT NULL,
  tokens_cost INTEGER NOT NULL,
  activated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_multiplier CHECK (multiplier >= 1.0 AND multiplier <= 10.0),
  CONSTRAINT valid_duration CHECK (duration_hours > 0 AND duration_hours <= 168)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_token_boosts_user_active 
ON token_boosts(user_id, is_active, expires_at DESC);

CREATE INDEX IF NOT EXISTS idx_token_boosts_expires 
ON token_boosts(expires_at);

-- Enable RLS
ALTER TABLE token_boosts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view own boosts" ON token_boosts;
CREATE POLICY "Users can view own boosts"
ON token_boosts FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own boosts" ON token_boosts;
CREATE POLICY "Users can insert own boosts"
ON token_boosts FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own boosts" ON token_boosts;
CREATE POLICY "Users can update own boosts"
ON token_boosts FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Drop existing functions first
DROP FUNCTION IF EXISTS purchase_token_boost(NUMERIC, INTEGER, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS get_active_boosts(UUID) CASCADE;
DROP FUNCTION IF EXISTS get_total_multiplier(UUID) CASCADE;
DROP FUNCTION IF EXISTS deactivate_expired_boosts() CASCADE;

-- Function to purchase and activate a boost
CREATE FUNCTION purchase_token_boost(
  p_multiplier NUMERIC,
  p_duration_hours INTEGER,
  p_cost INTEGER
) RETURNS JSON AS $$
DECLARE
  v_user_id UUID;
  v_current_balance INTEGER;
  v_boost_id UUID;
  v_expires_at TIMESTAMPTZ;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Check balance
  SELECT token_balance INTO v_current_balance
  FROM profiles
  WHERE id = v_user_id;

  IF v_current_balance < p_cost THEN
    RETURN json_build_object(
      'success', false, 
      'error', 'Insufficient tokens',
      'required', p_cost,
      'current', v_current_balance
    );
  END IF;

  -- Deduct tokens
  PERFORM spend_tokens(v_user_id, p_cost, 'boost', 
    p_multiplier::TEXT || 'x Token Boost (' || p_duration_hours || 'h)');

  -- Calculate expiration
  v_expires_at := NOW() + (p_duration_hours || ' hours')::INTERVAL;

  -- Create boost
  INSERT INTO token_boosts (
    user_id,
    boost_type,
    multiplier,
    duration_hours,
    tokens_cost,
    expires_at
  ) VALUES (
    v_user_id,
    p_multiplier::TEXT || 'x',
    p_multiplier,
    p_duration_hours,
    p_cost,
    v_expires_at
  ) RETURNING id INTO v_boost_id;

  RETURN json_build_object(
    'success', true,
    'boost_id', v_boost_id,
    'expires_at', v_expires_at,
    'message', 'Boost activated!'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION purchase_token_boost(NUMERIC, INTEGER, INTEGER) TO authenticated;

-- Function to get active boosts for a user
CREATE FUNCTION get_active_boosts(p_user_id UUID DEFAULT NULL)
RETURNS TABLE (
  multiplier NUMERIC,
  expires_at TIMESTAMPTZ,
  time_remaining INTERVAL
) AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := COALESCE(p_user_id, auth.uid());
  
  RETURN QUERY
  SELECT 
    tb.multiplier,
    tb.expires_at,
    tb.expires_at - NOW() as time_remaining
  FROM token_boosts tb
  WHERE tb.user_id = v_user_id
    AND tb.is_active = true
    AND tb.expires_at > NOW()
  ORDER BY tb.expires_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_active_boosts(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_active_boosts(UUID) TO anon;

-- Function to calculate total multiplier
CREATE FUNCTION get_total_multiplier(p_user_id UUID DEFAULT NULL)
RETURNS NUMERIC AS $$
DECLARE
  v_user_id UUID;
  v_total_multiplier NUMERIC := 1.0;
BEGIN
  v_user_id := COALESCE(p_user_id, auth.uid());
  
  SELECT COALESCE(SUM(multiplier - 1.0), 0) + 1.0 INTO v_total_multiplier
  FROM token_boosts
  WHERE user_id = v_user_id
    AND is_active = true
    AND expires_at > NOW();
  
  RETURN v_total_multiplier;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_total_multiplier(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_total_multiplier(UUID) TO anon;

-- Auto-deactivate expired boosts
CREATE FUNCTION deactivate_expired_boosts()
RETURNS void AS $$
BEGIN
  UPDATE token_boosts
  SET is_active = false
  WHERE expires_at <= NOW()
    AND is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a periodic job to clean up expired boosts (optional, can be run manually)
-- This would typically be set up with pg_cron or similar

