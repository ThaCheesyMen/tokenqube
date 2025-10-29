-- =====================================================
-- CRYPTO INTEGRATION - ADVANCED FEATURES
-- =====================================================

-- =====================================================
-- 1. CRYPTO QUEST REWARDS
-- =====================================================

-- Add crypto reward columns to quest_templates
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'quest_templates' AND column_name = 'crypto_reward_usd') 
  THEN
    ALTER TABLE quest_templates ADD COLUMN crypto_reward_usd DECIMAL(10,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'quest_templates' AND column_name = 'is_crypto_quest') 
  THEN
    ALTER TABLE quest_templates ADD COLUMN is_crypto_quest BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Create crypto_quest_rewards table
CREATE TABLE IF NOT EXISTS crypto_quest_rewards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  quest_id UUID REFERENCES quest_templates(id) ON DELETE CASCADE,
  crypto_amount_usd DECIMAL(10,2) NOT NULL,
  crypto_currency TEXT DEFAULT 'USDT',
  crypto_address TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  crypto_tx_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_crypto_quest_rewards_user ON crypto_quest_rewards(user_id, status);
CREATE INDEX IF NOT EXISTS idx_crypto_quest_rewards_status ON crypto_quest_rewards(status, created_at DESC);

-- RLS for crypto_quest_rewards
ALTER TABLE crypto_quest_rewards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their crypto rewards" ON crypto_quest_rewards;
CREATE POLICY "Users can view their crypto rewards"
  ON crypto_quest_rewards FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert crypto reward claims" ON crypto_quest_rewards;
CREATE POLICY "Users can insert crypto reward claims"
  ON crypto_quest_rewards FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- 2. CRYPTO STAKING SYSTEM
-- =====================================================

-- Create crypto_staking table
CREATE TABLE IF NOT EXISTS crypto_staking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  crypto_currency TEXT NOT NULL,
  crypto_amount_usd DECIMAL(10,2) NOT NULL,
  crypto_amount TEXT NOT NULL, -- Actual crypto amount (e.g., "0.001 BTC")
  crypto_address TEXT,
  apy_rate DECIMAL(5,2) DEFAULT 10.00, -- 10% annual yield
  tokens_per_day INTEGER NOT NULL,
  staked_at TIMESTAMPTZ DEFAULT NOW(),
  unstake_requested_at TIMESTAMPTZ,
  unstaked_at TIMESTAMPTZ,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'unstaking', 'unstaked')),
  crypto_tx_hash TEXT,
  total_tokens_earned INTEGER DEFAULT 0,
  last_reward_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crypto_staking_user ON crypto_staking(user_id, status);
CREATE INDEX IF NOT EXISTS idx_crypto_staking_active ON crypto_staking(status, last_reward_at);

-- RLS for crypto_staking
ALTER TABLE crypto_staking ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their crypto stakes" ON crypto_staking;
CREATE POLICY "Users can view their crypto stakes"
  ON crypto_staking FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create crypto stakes" ON crypto_staking;
CREATE POLICY "Users can create crypto stakes"
  ON crypto_staking FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their crypto stakes" ON crypto_staking;
CREATE POLICY "Users can update their crypto stakes"
  ON crypto_staking FOR UPDATE
  USING (auth.uid() = user_id);

-- =====================================================
-- 3. CRYPTO MARKETPLACE DIRECT PAYMENTS
-- =====================================================

-- Add crypto payment option to marketplace_transactions
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'marketplace_transactions' AND column_name = 'payment_method') 
  THEN
    ALTER TABLE marketplace_transactions ADD COLUMN payment_method TEXT DEFAULT 'tokens' 
      CHECK (payment_method IN ('tokens', 'crypto'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'marketplace_transactions' AND column_name = 'crypto_amount_usd') 
  THEN
    ALTER TABLE marketplace_transactions ADD COLUMN crypto_amount_usd DECIMAL(10,2);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'marketplace_transactions' AND column_name = 'crypto_currency') 
  THEN
    ALTER TABLE marketplace_transactions ADD COLUMN crypto_currency TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'marketplace_transactions' AND column_name = 'crypto_tx_hash') 
  THEN
    ALTER TABLE marketplace_transactions ADD COLUMN crypto_tx_hash TEXT;
  END IF;
END $$;

-- =====================================================
-- 4. CRYPTO AUCTION ESCROW
-- =====================================================

-- Add crypto escrow to auction_bids
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'auction_bids' AND column_name = 'escrow_type') 
  THEN
    ALTER TABLE auction_bids ADD COLUMN escrow_type TEXT DEFAULT 'tokens' 
      CHECK (escrow_type IN ('tokens', 'crypto'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'auction_bids' AND column_name = 'crypto_escrow_amount') 
  THEN
    ALTER TABLE auction_bids ADD COLUMN crypto_escrow_amount DECIMAL(10,2);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'auction_bids' AND column_name = 'crypto_escrow_address') 
  THEN
    ALTER TABLE auction_bids ADD COLUMN crypto_escrow_address TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'auction_bids' AND column_name = 'crypto_escrow_tx') 
  THEN
    ALTER TABLE auction_bids ADD COLUMN crypto_escrow_tx TEXT;
  END IF;
END $$;

-- =====================================================
-- 5. HELPER FUNCTIONS
-- =====================================================

-- Function: Process daily crypto staking rewards
CREATE OR REPLACE FUNCTION process_crypto_staking_rewards()
RETURNS INTEGER AS $$
DECLARE
  stake_record RECORD;
  rewards_processed INTEGER := 0;
BEGIN
  FOR stake_record IN 
    SELECT * FROM crypto_staking 
    WHERE status = 'active' 
    AND last_reward_at < NOW() - INTERVAL '24 hours'
  LOOP
    -- Calculate tokens to award
    -- tokens_per_day is already calculated when stake is created
    
    -- Add tokens to user
    UPDATE profiles
    SET token_balance = token_balance + stake_record.tokens_per_day,
        total_earned = total_earned + stake_record.tokens_per_day
    WHERE id = stake_record.user_id;

    -- Update stake record
    UPDATE crypto_staking
    SET total_tokens_earned = total_tokens_earned + tokens_per_day,
        last_reward_at = NOW()
    WHERE id = stake_record.id;

    -- Log transaction
    INSERT INTO token_transactions (user_id, amount, type, source, description)
    VALUES (
      stake_record.user_id,
      stake_record.tokens_per_day,
      'earn',
      'crypto_staking',
      'Daily crypto staking reward: ' || stake_record.crypto_currency
    );

    -- Send notification
    INSERT INTO notifications (user_id, title, message, type)
    VALUES (
      stake_record.user_id,
      'Staking Reward Received!',
      'You earned ' || stake_record.tokens_per_day || ' tokens from ' || stake_record.crypto_currency || ' staking!',
      'reward'
    );

    rewards_processed := rewards_processed + 1;
  END LOOP;

  RETURN rewards_processed;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Claim crypto quest reward
CREATE OR REPLACE FUNCTION claim_crypto_quest_reward(
  p_user_id UUID,
  p_quest_id UUID,
  p_crypto_address TEXT
)
RETURNS JSON AS $$
DECLARE
  v_quest RECORD;
  v_user_quest RECORD;
  v_reward_id UUID;
BEGIN
  -- Get quest details
  SELECT * INTO v_quest
  FROM quest_templates
  WHERE id = p_quest_id AND is_crypto_quest = true;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Quest not found or not a crypto quest');
  END IF;

  -- Check if user completed quest
  SELECT * INTO v_user_quest
  FROM user_quests
  WHERE user_id = p_user_id 
    AND quest_id = p_quest_id 
    AND status = 'completed';

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Quest not completed');
  END IF;

  -- Check if already claimed
  IF EXISTS (
    SELECT 1 FROM crypto_quest_rewards 
    WHERE user_id = p_user_id AND quest_id = p_quest_id
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Reward already claimed');
  END IF;

  -- Create crypto reward claim
  INSERT INTO crypto_quest_rewards (
    user_id,
    quest_id,
    crypto_amount_usd,
    crypto_currency,
    crypto_address,
    status
  ) VALUES (
    p_user_id,
    p_quest_id,
    v_quest.crypto_reward_usd,
    'USDT',
    p_crypto_address,
    'pending'
  ) RETURNING id INTO v_reward_id;

  -- Send notification
  INSERT INTO notifications (user_id, title, message, type)
  VALUES (
    p_user_id,
    'Crypto Reward Claimed!',
    'Your $' || v_quest.crypto_reward_usd || ' USDT reward is being processed!',
    'reward'
  );

  RETURN json_build_object(
    'success', true, 
    'reward_id', v_reward_id,
    'amount_usd', v_quest.crypto_reward_usd
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 6. SAMPLE CRYPTO QUESTS
-- =====================================================

-- Insert sample crypto quests
INSERT INTO quest_templates (
  quest_type,
  name,
  description,
  requirements,
  token_reward,
  xp_reward,
  difficulty,
  cooldown_hours,
  is_active,
  is_crypto_quest,
  crypto_reward_usd
) VALUES
  (
    'special',
    'Crypto Champion Marathon',
    'Play 100 hours of any game to earn real cryptocurrency!',
    '{"hours_played": 100}',
    0,
    500,
    'extreme',
    720, -- 30 days cooldown
    true,
    true,
    25.00 -- $25 USDT reward
  ),
  (
    'weekly',
    'Crypto Weekly Grind',
    'Play 50 hours this week for crypto rewards',
    '{"hours_played": 50}',
    0,
    200,
    'hard',
    168, -- 7 days
    true,
    true,
    10.00 -- $10 USDT reward
  ),
  (
    'special',
    'Marketplace Mogul',
    'Complete 20 successful marketplace sales',
    '{"sales_count": 20}',
    0,
    300,
    'hard',
    168,
    true,
    true,
    15.00 -- $15 USDT reward
  )
ON CONFLICT DO NOTHING;

-- =====================================================
-- 7. ADMIN DASHBOARD VIEWS
-- =====================================================

-- View for crypto staking stats
CREATE OR REPLACE VIEW crypto_staking_stats AS
SELECT 
  crypto_currency,
  COUNT(*) as total_stakes,
  SUM(crypto_amount_usd) as total_value_usd,
  AVG(apy_rate) as avg_apy,
  SUM(total_tokens_earned) as total_tokens_paid
FROM crypto_staking
WHERE status = 'active'
GROUP BY crypto_currency;

-- View for crypto quest rewards stats
CREATE OR REPLACE VIEW crypto_quest_stats AS
SELECT 
  status,
  COUNT(*) as total_claims,
  SUM(crypto_amount_usd) as total_amount_usd,
  AVG(crypto_amount_usd) as avg_amount_usd
FROM crypto_quest_rewards
GROUP BY status;

-- Done!
SELECT 'Crypto integration features created successfully!' AS message;

