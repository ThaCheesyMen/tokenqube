-- Token Withdrawal and Crypto Economy System
-- Enables users to withdraw tokens for crypto with platform fee tracking

-- Token Withdrawals Table
CREATE TABLE IF NOT EXISTS token_withdrawals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount_tokens INTEGER NOT NULL CHECK (amount_tokens > 0),
  fee_tokens INTEGER NOT NULL DEFAULT 0,
  net_amount_tokens INTEGER NOT NULL,
  amount_usd NUMERIC NOT NULL,
  crypto_address TEXT NOT NULL,
  crypto_type TEXT NOT NULL CHECK (crypto_type IN ('BTC', 'ETH', 'USDT', 'USDC')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'rejected', 'cancelled')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  transaction_hash TEXT, -- Blockchain tx hash when completed
  notes TEXT,
  CONSTRAINT withdrawal_min_amount CHECK (amount_tokens >= 10000) -- Minimum 10,000 tokens
);

CREATE INDEX idx_token_withdrawals_user ON token_withdrawals(user_id, requested_at DESC);
CREATE INDEX idx_token_withdrawals_status ON token_withdrawals(status, requested_at DESC);

-- RLS Policies for token_withdrawals
ALTER TABLE token_withdrawals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own withdrawals" ON token_withdrawals;
CREATE POLICY "Users can view own withdrawals"
  ON token_withdrawals FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create withdrawals" ON token_withdrawals;
CREATE POLICY "Users can create withdrawals"
  ON token_withdrawals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Platform Revenue Tracking (Enhanced)
CREATE TABLE IF NOT EXISTS platform_revenue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Income streams
  token_sales_revenue NUMERIC DEFAULT 0,
  marketplace_fees NUMERIC DEFAULT 0,
  withdrawal_fees NUMERIC DEFAULT 0,
  subscription_revenue NUMERIC DEFAULT 0,
  ad_revenue NUMERIC DEFAULT 0,
  affiliate_revenue NUMERIC DEFAULT 0,
  sponsored_events_revenue NUMERIC DEFAULT 0,
  
  -- Expenses
  token_redemptions NUMERIC DEFAULT 0,
  crypto_withdrawals NUMERIC DEFAULT 0,
  payment_processing_fees NUMERIC DEFAULT 0,
  
  -- Net
  gross_revenue NUMERIC DEFAULT 0,
  net_revenue NUMERIC DEFAULT 0,
  
  -- Metrics
  total_token_purchases INTEGER DEFAULT 0,
  total_withdrawals INTEGER DEFAULT 0,
  active_users INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(date)
);

CREATE INDEX idx_platform_revenue_date ON platform_revenue(date DESC);

-- Admin Notifications for Withdrawals
CREATE TABLE IF NOT EXISTS admin_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  is_read BOOLEAN DEFAULT FALSE,
  data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ
);

CREATE INDEX idx_admin_notifications_unread ON admin_notifications(is_read, created_at DESC) WHERE is_read = FALSE;

-- Function to track withdrawal fee as revenue
CREATE OR REPLACE FUNCTION track_withdrawal_fee()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' THEN
    -- Track the fee as revenue
    INSERT INTO platform_revenue (
      date,
      withdrawal_fees,
      crypto_withdrawals,
      total_withdrawals,
      updated_at
    )
    VALUES (
      CURRENT_DATE,
      (NEW.fee_tokens * 0.001), -- Convert tokens to USD
      NEW.amount_usd,
      1,
      NOW()
    )
    ON CONFLICT (date) DO UPDATE SET
      withdrawal_fees = platform_revenue.withdrawal_fees + (NEW.fee_tokens * 0.001),
      crypto_withdrawals = platform_revenue.crypto_withdrawals + NEW.amount_usd,
      total_withdrawals = platform_revenue.total_withdrawals + 1,
      updated_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_track_withdrawal_fee
  AFTER UPDATE OF status ON token_withdrawals
  FOR EACH ROW
  EXECUTE FUNCTION track_withdrawal_fee();

-- Function to track token purchase revenue
CREATE OR REPLACE FUNCTION track_token_purchase_revenue(
  p_amount_usd NUMERIC,
  p_tokens_purchased INTEGER
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO platform_revenue (
    date,
    token_sales_revenue,
    total_token_purchases,
    active_users,
    updated_at
  )
  VALUES (
    CURRENT_DATE,
    p_amount_usd,
    1,
    1,
    NOW()
  )
  ON CONFLICT (date) DO UPDATE SET
    token_sales_revenue = platform_revenue.token_sales_revenue + p_amount_usd,
    total_token_purchases = platform_revenue.total_token_purchases + 1,
    updated_at = NOW();
  
  -- Also update gross and net revenue
  UPDATE platform_revenue
  SET 
    gross_revenue = COALESCE(token_sales_revenue, 0) + COALESCE(marketplace_fees, 0) + 
                    COALESCE(withdrawal_fees, 0) + COALESCE(subscription_revenue, 0) +
                    COALESCE(ad_revenue, 0) + COALESCE(affiliate_revenue, 0),
    net_revenue = gross_revenue - COALESCE(token_redemptions, 0) - 
                  COALESCE(crypto_withdrawals, 0) - COALESCE(payment_processing_fees, 0)
  WHERE date = CURRENT_DATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION track_token_purchase_revenue(NUMERIC, INTEGER) TO authenticated;

-- Enhanced marketplace transaction tracking
CREATE OR REPLACE FUNCTION track_marketplace_fee()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.transaction_status = 'completed' THEN
    INSERT INTO platform_revenue (
      date,
      marketplace_fees,
      updated_at
    )
    VALUES (
      CURRENT_DATE,
      (NEW.platform_fee_tokens * 0.001), -- Convert tokens to USD
      NOW()
    )
    ON CONFLICT (date) DO UPDATE SET
      marketplace_fees = platform_revenue.marketplace_fees + (NEW.platform_fee_tokens * 0.001),
      updated_at = NOW();
      
    -- Update gross and net revenue
    UPDATE platform_revenue
    SET 
      gross_revenue = COALESCE(token_sales_revenue, 0) + COALESCE(marketplace_fees, 0) + 
                      COALESCE(withdrawal_fees, 0) + COALESCE(subscription_revenue, 0) +
                      COALESCE(ad_revenue, 0) + COALESCE(affiliate_revenue, 0),
      net_revenue = gross_revenue - COALESCE(token_redemptions, 0) - 
                    COALESCE(crypto_withdrawals, 0) - COALESCE(payment_processing_fees, 0)
    WHERE date = CURRENT_DATE;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply trigger if marketplace_transactions exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'marketplace_transactions') THEN
    DROP TRIGGER IF EXISTS trigger_track_marketplace_fee ON marketplace_transactions;
    CREATE TRIGGER trigger_track_marketplace_fee
      AFTER UPDATE OF transaction_status ON marketplace_transactions
      FOR EACH ROW
      EXECUTE FUNCTION track_marketplace_fee();
  END IF;
END $$;

-- Revenue summary view for easy querying
CREATE OR REPLACE VIEW revenue_analytics AS
SELECT
  date,
  token_sales_revenue,
  marketplace_fees,
  withdrawal_fees,
  subscription_revenue,
  ad_revenue,
  affiliate_revenue,
  sponsored_events_revenue,
  gross_revenue,
  token_redemptions,
  crypto_withdrawals,
  payment_processing_fees,
  net_revenue,
  total_token_purchases,
  total_withdrawals,
  active_users,
  -- Calculate profit margin
  CASE 
    WHEN gross_revenue > 0 THEN ((net_revenue / gross_revenue) * 100)
    ELSE 0
  END as profit_margin_percent
FROM platform_revenue
ORDER BY date DESC;

-- Function to get revenue summary for a date range
CREATE OR REPLACE FUNCTION get_revenue_summary(
  start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
  end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  total_gross_revenue NUMERIC,
  total_net_revenue NUMERIC,
  total_token_sales NUMERIC,
  total_marketplace_fees NUMERIC,
  total_withdrawal_fees NUMERIC,
  total_purchases INTEGER,
  total_withdrawals_count INTEGER,
  avg_daily_revenue NUMERIC,
  profit_margin NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    SUM(gross_revenue)::NUMERIC as total_gross_revenue,
    SUM(net_revenue)::NUMERIC as total_net_revenue,
    SUM(token_sales_revenue)::NUMERIC as total_token_sales,
    SUM(marketplace_fees)::NUMERIC as total_marketplace_fees,
    SUM(withdrawal_fees)::NUMERIC as total_withdrawal_fees,
    SUM(total_token_purchases)::INTEGER as total_purchases,
    SUM(total_withdrawals)::INTEGER as total_withdrawals_count,
    AVG(gross_revenue)::NUMERIC as avg_daily_revenue,
    CASE
      WHEN SUM(gross_revenue) > 0 THEN
        ((SUM(net_revenue) / SUM(gross_revenue)) * 100)::NUMERIC
      ELSE 0::NUMERIC
    END as profit_margin
  FROM platform_revenue
  WHERE date BETWEEN start_date AND end_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_revenue_summary(DATE, DATE) TO authenticated;

-- Verification
DO $$
BEGIN
  RAISE NOTICE '✅ Crypto Economy System installed successfully!';
  RAISE NOTICE '================================================';
  RAISE NOTICE '  ✓ Token withdrawal system with crypto support';
  RAISE NOTICE '  ✓ Platform revenue tracking & analytics';
  RAISE NOTICE '  ✓ Automated fee collection (2%% on withdrawals, 5%% on marketplace)';
  RAISE NOTICE '  ✓ Admin notification system';
  RAISE NOTICE '  ✓ Revenue analytics and reporting';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'Features:';
  RAISE NOTICE '  • Users can withdraw tokens for BTC/ETH/USDT';
  RAISE NOTICE '  • Automatic passive income tracking';
  RAISE NOTICE '  • Real-time revenue analytics';
  RAISE NOTICE '  • Marketplace & withdrawal fee collection';
END $$;

