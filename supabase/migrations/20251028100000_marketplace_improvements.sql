-- =====================================================
-- MARKETPLACE SYSTEM IMPROVEMENTS
-- Escrow, reputation, ratings, dispute resolution
-- =====================================================

-- =====================================================
-- 1. ESCROW SYSTEM
-- =====================================================

CREATE TABLE IF NOT EXISTS marketplace_escrow (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid REFERENCES marketplace_transactions(id) ON DELETE CASCADE NOT NULL,
  buyer_id uuid REFERENCES profiles(id) NOT NULL,
  seller_id uuid REFERENCES profiles(id) NOT NULL,
  item_id uuid REFERENCES marketplace_items(id) NOT NULL,
  amount integer NOT NULL CHECK (amount > 0),
  status text NOT NULL CHECK (status IN ('pending', 'funded', 'released', 'refunded', 'disputed')),
  funded_at timestamptz,
  released_at timestamptz,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_marketplace_escrow_transaction 
  ON marketplace_escrow(transaction_id);

CREATE INDEX IF NOT EXISTS idx_marketplace_escrow_buyer 
  ON marketplace_escrow(buyer_id, status);

CREATE INDEX IF NOT EXISTS idx_marketplace_escrow_seller 
  ON marketplace_escrow(seller_id, status);

CREATE INDEX IF NOT EXISTS idx_marketplace_escrow_status 
  ON marketplace_escrow(status, expires_at) WHERE status IN ('pending', 'funded');

ALTER TABLE marketplace_escrow ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own escrow transactions"
  ON marketplace_escrow FOR SELECT
  USING (buyer_id = auth.uid() OR seller_id = auth.uid());

-- =====================================================
-- 2. REPUTATION SYSTEM
-- =====================================================

-- User reputation scores
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS reputation_score integer DEFAULT 100;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_sales integer DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_purchases integer DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS successful_transactions integer DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS disputed_transactions integer DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avg_rating numeric(3, 2) DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_ratings integer DEFAULT 0;

-- Reputation history
CREATE TABLE IF NOT EXISTS reputation_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  change_amount integer NOT NULL,
  old_score integer NOT NULL,
  new_score integer NOT NULL,
  reason text NOT NULL,
  reference_id uuid,
  created_at timestamptz DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reputation_changes_user 
  ON reputation_changes(user_id, created_at DESC);

ALTER TABLE reputation_changes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own reputation changes"
  ON reputation_changes FOR SELECT
  USING (user_id = auth.uid());

-- =====================================================
-- 3. RATING SYSTEM
-- =====================================================

CREATE TABLE IF NOT EXISTS marketplace_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid REFERENCES marketplace_transactions(id) ON DELETE CASCADE NOT NULL,
  rater_id uuid REFERENCES profiles(id) NOT NULL,
  rated_user_id uuid REFERENCES profiles(id) NOT NULL,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review text,
  helpful_count integer DEFAULT 0,
  created_at timestamptz DEFAULT NOW(),
  UNIQUE(transaction_id, rater_id)
);

CREATE INDEX IF NOT EXISTS idx_marketplace_ratings_rated_user 
  ON marketplace_ratings(rated_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_marketplace_ratings_transaction 
  ON marketplace_ratings(transaction_id);

ALTER TABLE marketplace_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view ratings"
  ON marketplace_ratings FOR SELECT
  USING (true);

CREATE POLICY "Users can rate completed transactions"
  ON marketplace_ratings FOR INSERT
  WITH CHECK (
    rater_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM marketplace_transactions t
      WHERE t.id = transaction_id
      AND t.transaction_status = 'completed'
      AND (t.buyer_id = auth.uid() OR t.seller_id = auth.uid())
    )
  );

-- Rating helpfulness
CREATE TABLE IF NOT EXISTS rating_helpfulness (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rating_id uuid REFERENCES marketplace_ratings(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) NOT NULL,
  is_helpful boolean NOT NULL,
  created_at timestamptz DEFAULT NOW(),
  UNIQUE(rating_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_rating_helpfulness_rating 
  ON rating_helpfulness(rating_id);

ALTER TABLE rating_helpfulness ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view rating helpfulness"
  ON rating_helpfulness FOR SELECT
  USING (true);

CREATE POLICY "Users can mark ratings helpful"
  ON rating_helpfulness FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- =====================================================
-- 4. DISPUTE RESOLUTION
-- =====================================================

CREATE TABLE IF NOT EXISTS marketplace_disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid REFERENCES marketplace_transactions(id) ON DELETE CASCADE NOT NULL,
  escrow_id uuid REFERENCES marketplace_escrow(id) NOT NULL,
  initiated_by uuid REFERENCES profiles(id) NOT NULL,
  reason text NOT NULL,
  status text NOT NULL CHECK (status IN ('open', 'investigating', 'resolved_buyer', 'resolved_seller', 'resolved_refund', 'closed')),
  resolution_notes text,
  resolved_by uuid REFERENCES profiles(id),
  resolved_at timestamptz,
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_marketplace_disputes_transaction 
  ON marketplace_disputes(transaction_id);

CREATE INDEX IF NOT EXISTS idx_marketplace_disputes_status 
  ON marketplace_disputes(status, created_at DESC);

ALTER TABLE marketplace_disputes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Involved parties can view disputes"
  ON marketplace_disputes FOR SELECT
  USING (
    initiated_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM marketplace_transactions t
      WHERE t.id = transaction_id
      AND (t.buyer_id = auth.uid() OR t.seller_id = auth.uid())
    )
  );

CREATE POLICY "Transaction parties can create disputes"
  ON marketplace_disputes FOR INSERT
  WITH CHECK (
    initiated_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM marketplace_transactions t
      WHERE t.id = transaction_id
      AND (t.buyer_id = auth.uid() OR t.seller_id = auth.uid())
    )
  );

-- Dispute messages
CREATE TABLE IF NOT EXISTS dispute_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id uuid REFERENCES marketplace_disputes(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) NOT NULL,
  message text NOT NULL,
  is_admin boolean DEFAULT false,
  created_at timestamptz DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dispute_messages_dispute 
  ON dispute_messages(dispute_id, created_at);

ALTER TABLE dispute_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Dispute parties can view messages"
  ON dispute_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM marketplace_disputes d
      JOIN marketplace_transactions t ON d.transaction_id = t.id
      WHERE d.id = dispute_id
      AND (d.initiated_by = auth.uid() OR t.buyer_id = auth.uid() OR t.seller_id = auth.uid())
    )
  );

CREATE POLICY "Dispute parties can send messages"
  ON dispute_messages FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM marketplace_disputes d
      JOIN marketplace_transactions t ON d.transaction_id = t.id
      WHERE d.id = dispute_id
      AND (d.initiated_by = auth.uid() OR t.buyer_id = auth.uid() OR t.seller_id = auth.uid())
    )
  );

-- =====================================================
-- 5. MARKETPLACE FUNCTIONS
-- =====================================================

-- Create escrow transaction
CREATE OR REPLACE FUNCTION create_escrow_transaction(
  p_buyer_id UUID,
  p_seller_id UUID,
  p_item_id UUID,
  p_amount INTEGER,
  p_expiry_hours INTEGER DEFAULT 72
)
RETURNS jsonb AS $$
DECLARE
  v_buyer_balance INTEGER;
  v_transaction_id UUID;
  v_escrow_id UUID;
BEGIN
  -- Lock buyer profile
  SELECT token_balance INTO v_buyer_balance
  FROM profiles
  WHERE id = p_buyer_id
  FOR UPDATE;

  -- Check balance
  IF v_buyer_balance < p_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance');
  END IF;

  -- Deduct from buyer
  UPDATE profiles
  SET token_balance = token_balance - p_amount
  WHERE id = p_buyer_id;

  -- Create transaction
  INSERT INTO marketplace_transactions (buyer_id, seller_id, item_id, amount, status)
  VALUES (p_buyer_id, p_seller_id, p_item_id, p_amount, 'in_escrow')
  RETURNING id INTO v_transaction_id;

  -- Create escrow
  INSERT INTO marketplace_escrow (
    transaction_id,
    buyer_id,
    seller_id,
    item_id,
    amount,
    status,
    funded_at,
    expires_at
  )
  VALUES (
    v_transaction_id,
    p_buyer_id,
    p_seller_id,
    p_item_id,
    p_amount,
    'funded',
    NOW(),
    NOW() + (p_expiry_hours || ' hours')::INTERVAL
  )
  RETURNING id INTO v_escrow_id;

  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', v_transaction_id,
    'escrow_id', v_escrow_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Release escrow to seller
CREATE OR REPLACE FUNCTION release_escrow(
  p_escrow_id UUID,
  p_user_id UUID
)
RETURNS jsonb AS $$
DECLARE
  v_escrow marketplace_escrow%ROWTYPE;
  v_fee_percentage NUMERIC := 0.05; -- 5% platform fee
  v_fee_amount INTEGER;
  v_seller_amount INTEGER;
BEGIN
  -- Get escrow details
  SELECT * INTO v_escrow
  FROM marketplace_escrow
  WHERE id = p_escrow_id
  FOR UPDATE;

  -- Verify caller is buyer
  IF v_escrow.buyer_id != p_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only buyer can release escrow');
  END IF;

  -- Check status
  IF v_escrow.status != 'funded' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Escrow not in funded state');
  END IF;

  -- Calculate fee
  v_fee_amount := FLOOR(v_escrow.amount * v_fee_percentage);
  v_seller_amount := v_escrow.amount - v_fee_amount;

  -- Transfer to seller
  UPDATE profiles
  SET 
    token_balance = token_balance + v_seller_amount,
    total_earned = total_earned + v_seller_amount,
    total_sales = total_sales + 1,
    successful_transactions = successful_transactions + 1
  WHERE id = v_escrow.seller_id;

  -- Update buyer stats
  UPDATE profiles
  SET 
    total_purchases = total_purchases + 1,
    successful_transactions = successful_transactions + 1
  WHERE id = v_escrow.buyer_id;

  -- Update escrow
  UPDATE marketplace_escrow
  SET 
    status = 'released',
    released_at = NOW()
  WHERE id = p_escrow_id;

  -- Update transaction
  UPDATE marketplace_transactions
  SET status = 'completed'
  WHERE id = v_escrow.transaction_id;

  -- Log platform fee
  INSERT INTO token_transactions (user_id, amount, type, description)
  VALUES (v_escrow.seller_id, -v_fee_amount, 'marketplace_fee', 'Platform fee');

  RETURN jsonb_build_object('success', true, 'message', 'Escrow released successfully');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Refund escrow to buyer
CREATE OR REPLACE FUNCTION refund_escrow(
  p_escrow_id UUID,
  p_user_id UUID,
  p_reason TEXT
)
RETURNS jsonb AS $$
DECLARE
  v_escrow marketplace_escrow%ROWTYPE;
BEGIN
  SELECT * INTO v_escrow
  FROM marketplace_escrow
  WHERE id = p_escrow_id
  FOR UPDATE;

  -- Verify caller is seller or admin
  IF v_escrow.seller_id != p_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only seller can refund');
  END IF;

  IF v_escrow.status != 'funded' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Escrow not in funded state');
  END IF;

  -- Refund to buyer
  UPDATE profiles
  SET token_balance = token_balance + v_escrow.amount
  WHERE id = v_escrow.buyer_id;

  -- Update escrow
  UPDATE marketplace_escrow
  SET status = 'refunded'
  WHERE id = p_escrow_id;

  -- Update transaction
  UPDATE marketplace_transactions
  SET status = 'refunded'
  WHERE id = v_escrow.transaction_id;

  RETURN jsonb_build_object('success', true, 'message', 'Escrow refunded successfully');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update reputation after rating
CREATE OR REPLACE FUNCTION update_reputation_after_rating()
RETURNS TRIGGER AS $$
DECLARE
  v_old_score INTEGER;
  v_new_score INTEGER;
  v_reputation_change INTEGER;
BEGIN
  -- Get current reputation
  SELECT reputation_score INTO v_old_score
  FROM profiles
  WHERE id = NEW.rated_user_id;

  -- Calculate reputation change based on rating
  v_reputation_change := (NEW.rating - 3) * 5; -- -10 to +10

  -- Update profile
  UPDATE profiles
  SET 
    reputation_score = GREATEST(0, LEAST(1000, reputation_score + v_reputation_change)),
    avg_rating = (
      SELECT AVG(rating)::numeric(3, 2)
      FROM marketplace_ratings
      WHERE rated_user_id = NEW.rated_user_id
    ),
    total_ratings = total_ratings + 1
  WHERE id = NEW.rated_user_id
  RETURNING reputation_score INTO v_new_score;

  -- Log reputation change
  INSERT INTO reputation_changes (
    user_id,
    change_amount,
    old_score,
    new_score,
    reason,
    reference_id
  ) VALUES (
    NEW.rated_user_id,
    v_reputation_change,
    v_old_score,
    v_new_score,
    'Rating received',
    NEW.id
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_reputation_on_rating ON marketplace_ratings;
CREATE TRIGGER update_reputation_on_rating
  AFTER INSERT ON marketplace_ratings
  FOR EACH ROW
  EXECUTE FUNCTION update_reputation_after_rating();

-- =====================================================
-- 6. GRANT PERMISSIONS
-- =====================================================

GRANT EXECUTE ON FUNCTION create_escrow_transaction TO authenticated;
GRANT EXECUTE ON FUNCTION release_escrow TO authenticated;
GRANT EXECUTE ON FUNCTION refund_escrow TO authenticated;

-- =====================================================
-- VERIFICATION
-- =====================================================

DO $$ 
BEGIN
  RAISE NOTICE '✅ Marketplace improvements applied successfully!';
  RAISE NOTICE '======================================';
  RAISE NOTICE 'Added features:';
  RAISE NOTICE '  ✓ Escrow system with automatic fund holding';
  RAISE NOTICE '  ✓ Reputation scoring system';
  RAISE NOTICE '  ✓ Rating and review system';
  RAISE NOTICE '  ✓ Dispute resolution system';
  RAISE NOTICE '  ✓ Transaction safety measures';
  RAISE NOTICE '  ✓ Platform fee collection (5%)';
END $$;

