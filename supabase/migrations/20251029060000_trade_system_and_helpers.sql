-- =====================================================
-- TRADE SYSTEM & HELPER FUNCTIONS
-- =====================================================

-- Trade Offers Table
CREATE TABLE IF NOT EXISTS trade_offers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  to_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  from_items TEXT[] DEFAULT '{}',
  to_items TEXT[] DEFAULT '{}',
  from_tokens INTEGER DEFAULT 0,
  to_tokens INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'declined', 'cancelled')),
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trade Transactions (history)
CREATE TABLE IF NOT EXISTS trade_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trade_id UUID REFERENCES trade_offers(id) ON DELETE SET NULL,
  from_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  to_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  from_items TEXT[] DEFAULT '{}',
  to_items TEXT[] DEFAULT '{}',
  from_tokens INTEGER DEFAULT 0,
  to_tokens INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_trade_offers_from_user ON trade_offers(from_user_id, status);
CREATE INDEX IF NOT EXISTS idx_trade_offers_to_user ON trade_offers(to_user_id, status);
CREATE INDEX IF NOT EXISTS idx_trade_transactions_from ON trade_transactions(from_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trade_transactions_to ON trade_transactions(to_user_id, created_at DESC);

-- RLS Policies
ALTER TABLE trade_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their trades" ON trade_offers;
CREATE POLICY "Users can view their trades"
  ON trade_offers FOR SELECT
  USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

DROP POLICY IF EXISTS "Users can create trade offers" ON trade_offers;
CREATE POLICY "Users can create trade offers"
  ON trade_offers FOR INSERT
  WITH CHECK (auth.uid() = from_user_id);

DROP POLICY IF EXISTS "Users can update their trades" ON trade_offers;
CREATE POLICY "Users can update their trades"
  ON trade_offers FOR UPDATE
  USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

DROP POLICY IF EXISTS "Users can view their trade history" ON trade_transactions;
CREATE POLICY "Users can view their trade history"
  ON trade_transactions FOR SELECT
  USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

-- Helper Function: Transfer Tokens
CREATE OR REPLACE FUNCTION transfer_tokens(
  from_user UUID,
  to_user UUID,
  amount INTEGER
) RETURNS VOID AS $$
BEGIN
  -- Deduct from sender
  UPDATE profiles
  SET token_balance = token_balance - amount
  WHERE id = from_user AND token_balance >= amount;
  
  -- Add to receiver
  UPDATE profiles
  SET token_balance = token_balance + amount
  WHERE id = to_user;
  
  -- Log transaction
  INSERT INTO token_transactions (user_id, amount, type, source, description)
  VALUES 
    (from_user, -amount, 'spend', 'trade', 'Trade transfer'),
    (to_user, amount, 'earn', 'trade', 'Trade received');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper Function: Add Tokens (if not exists)
CREATE OR REPLACE FUNCTION add_tokens(user_id UUID, amount INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE profiles
  SET token_balance = token_balance + amount,
      total_earned = total_earned + amount
  WHERE id = user_id;
  
  INSERT INTO token_transactions (user_id, amount, type, source)
  VALUES (user_id, amount, 'earn', 'marketplace');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Price History Table (for marketplace analytics)
CREATE TABLE IF NOT EXISTS marketplace_price_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id UUID REFERENCES marketplace_items(id) ON DELETE CASCADE,
  game_name TEXT NOT NULL,
  item_name TEXT NOT NULL,
  item_type TEXT,
  price_tokens INTEGER NOT NULL,
  transaction_type TEXT CHECK (transaction_type IN ('sale', 'listing', 'auction')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_price_history_item ON marketplace_price_history(item_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_price_history_game ON marketplace_price_history(game_name, created_at DESC);

ALTER TABLE marketplace_price_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view price history" ON marketplace_price_history;
CREATE POLICY "Anyone can view price history"
  ON marketplace_price_history FOR SELECT
  USING (true);

-- Function: Get Price History for an Item
CREATE OR REPLACE FUNCTION get_price_history(p_item_name TEXT, p_game_name TEXT, days INTEGER DEFAULT 30)
RETURNS TABLE (
  date DATE,
  avg_price DECIMAL,
  min_price INTEGER,
  max_price INTEGER,
  sales_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    DATE(created_at) as date,
    AVG(price_tokens)::DECIMAL as avg_price,
    MIN(price_tokens) as min_price,
    MAX(price_tokens) as max_price,
    COUNT(*) as sales_count
  FROM marketplace_price_history
  WHERE item_name ILIKE p_item_name
    AND game_name ILIKE p_game_name
    AND created_at >= NOW() - (days || ' days')::INTERVAL
  GROUP BY DATE(created_at)
  ORDER BY date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Log Price History on Sale
CREATE OR REPLACE FUNCTION log_price_history()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.transaction_status = 'completed' THEN
    INSERT INTO marketplace_price_history (
      item_id, game_name, item_name, item_type, price_tokens, transaction_type
    )
    SELECT 
      mi.id, mi.game_name, mi.item_name, mi.item_type, NEW.price_tokens, 'sale'
    FROM marketplace_items mi
    WHERE mi.id = NEW.item_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_log_price_history ON marketplace_transactions;
CREATE TRIGGER trigger_log_price_history
  AFTER UPDATE ON marketplace_transactions
  FOR EACH ROW
  EXECUTE FUNCTION log_price_history();

-- Done!
SELECT 'Trade system and helper functions created successfully!' AS message;

