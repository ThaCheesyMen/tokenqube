-- Revenue Generation System
-- Implements: Subscriptions, Token Purchases, Marketplace Fees, Premium Features

-- ============================================================================
-- SUBSCRIPTION TIERS
-- ============================================================================

CREATE TABLE IF NOT EXISTS subscription_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_name TEXT NOT NULL UNIQUE,
  tier_level INTEGER NOT NULL UNIQUE, -- 0=free, 1=pro, 2=elite
  monthly_price NUMERIC NOT NULL,
  yearly_price NUMERIC NOT NULL,
  token_multiplier NUMERIC DEFAULT 1.0,
  monthly_bonus_tokens INTEGER DEFAULT 0,
  features JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed subscription tiers
INSERT INTO subscription_tiers (tier_name, tier_level, monthly_price, yearly_price, token_multiplier, monthly_bonus_tokens, features)
VALUES
  ('Free', 0, 0, 0, 1.0, 0, '{"ads": true, "chat_history_days": 7, "marketplace_fee": 0.07}'::jsonb),
  ('Pro', 1, 4.99, 49.99, 1.5, 500, '{"ads": false, "chat_history_days": 30, "marketplace_fee": 0.03, "priority_support": true, "early_access": true}'::jsonb),
  ('Elite', 2, 9.99, 99.99, 2.0, 1500, '{"ads": false, "chat_history_days": 365, "marketplace_fee": 0.01, "priority_support": true, "early_access": true, "vip_badge": true, "featured_profile": true}'::jsonb)
ON CONFLICT (tier_name) DO NOTHING;

-- ============================================================================
-- USER SUBSCRIPTIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tier_id UUID NOT NULL REFERENCES subscription_tiers(id),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'paused')),
  billing_cycle TEXT DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly')),
  stripe_subscription_id TEXT UNIQUE,
  stripe_customer_id TEXT,
  current_period_start TIMESTAMPTZ DEFAULT NOW(),
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status);

ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can view their own subscription
DROP POLICY IF EXISTS "Users can view own subscription" ON user_subscriptions;
CREATE POLICY "Users can view own subscription"
  ON user_subscriptions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================================
-- TOKEN PURCHASE PACKAGES
-- ============================================================================

CREATE TABLE IF NOT EXISTS token_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_name TEXT NOT NULL,
  token_amount INTEGER NOT NULL,
  price_usd NUMERIC NOT NULL,
  bonus_tokens INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed token packages
INSERT INTO token_packages (package_name, token_amount, price_usd, bonus_tokens, is_featured, sort_order)
VALUES
  ('Starter Pack', 1000, 0.99, 0, FALSE, 1),
  ('Value Pack', 5000, 3.99, 500, FALSE, 2),
  ('Popular Pack', 15000, 9.99, 2000, TRUE, 3),
  ('Mega Pack', 50000, 24.99, 10000, FALSE, 4),
  ('Ultimate Pack', 150000, 49.99, 50000, FALSE, 5)
ON CONFLICT DO NOTHING;

ALTER TABLE token_packages ENABLE ROW LEVEL SECURITY;

-- Anyone can view packages
DROP POLICY IF EXISTS "Anyone can view token packages" ON token_packages;
CREATE POLICY "Anyone can view token packages"
  ON token_packages FOR SELECT
  TO authenticated
  USING (is_active = true);

-- ============================================================================
-- TOKEN PURCHASES (Transaction History)
-- ============================================================================

CREATE TABLE IF NOT EXISTS token_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  package_id UUID REFERENCES token_packages(id),
  tokens_purchased INTEGER NOT NULL,
  bonus_tokens INTEGER DEFAULT 0,
  price_paid NUMERIC NOT NULL,
  payment_method TEXT, -- 'stripe', 'paypal', 'crypto'
  stripe_payment_intent_id TEXT,
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_token_purchases_user ON token_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_token_purchases_status ON token_purchases(status);

ALTER TABLE token_purchases ENABLE ROW LEVEL SECURITY;

-- Users can view their own purchases
DROP POLICY IF EXISTS "Users can view own purchases" ON token_purchases;
CREATE POLICY "Users can view own purchases"
  ON token_purchases FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================================
-- MARKETPLACE TRANSACTIONS (Enhanced with Fees)
-- ============================================================================

-- Add fee columns to existing marketplace_transactions
ALTER TABLE marketplace_transactions ADD COLUMN IF NOT EXISTS platform_fee_tokens INTEGER DEFAULT 0;
ALTER TABLE marketplace_transactions ADD COLUMN IF NOT EXISTS net_seller_tokens INTEGER DEFAULT 0;

-- ============================================================================
-- SPONSORED EVENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS sponsored_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name TEXT NOT NULL,
  event_type TEXT NOT NULL, -- 'tournament', 'challenge', 'giveaway'
  sponsor_name TEXT,
  sponsor_logo_url TEXT,
  prize_pool_tokens INTEGER DEFAULT 0,
  prize_pool_usd NUMERIC DEFAULT 0,
  entry_fee_tokens INTEGER DEFAULT 0,
  max_participants INTEGER,
  current_participants INTEGER DEFAULT 0,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'active', 'completed', 'cancelled')),
  rules TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sponsored_events_status ON sponsored_events(status);
CREATE INDEX IF NOT EXISTS idx_sponsored_events_dates ON sponsored_events(start_date, end_date);

ALTER TABLE sponsored_events ENABLE ROW LEVEL SECURITY;

-- Anyone can view active events
DROP POLICY IF EXISTS "Anyone can view events" ON sponsored_events;
CREATE POLICY "Anyone can view events"
  ON sponsored_events FOR SELECT
  TO authenticated
  USING (status IN ('upcoming', 'active', 'completed'));

-- ============================================================================
-- EVENT PARTICIPANTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS event_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES sponsored_events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  entry_fee_paid INTEGER DEFAULT 0,
  placement INTEGER,
  prize_won INTEGER DEFAULT 0,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_event_participants_event ON event_participants(event_id);
CREATE INDEX IF NOT EXISTS idx_event_participants_user ON event_participants(user_id);

ALTER TABLE event_participants ENABLE ROW LEVEL SECURITY;

-- Users can view participants of events they can see
DROP POLICY IF EXISTS "Users can view event participants" ON event_participants;
CREATE POLICY "Users can view event participants"
  ON event_participants FOR SELECT
  TO authenticated
  USING (true);

-- Users can join events
DROP POLICY IF EXISTS "Users can join events" ON event_participants;
CREATE POLICY "Users can join events"
  ON event_participants FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- AFFILIATE LINKS
-- ============================================================================

CREATE TABLE IF NOT EXISTS affiliate_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  link_type TEXT NOT NULL, -- 'steam', 'amazon', 'razer', etc.
  product_name TEXT NOT NULL,
  product_url TEXT NOT NULL,
  affiliate_url TEXT NOT NULL,
  commission_rate NUMERIC DEFAULT 0.05,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS affiliate_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id UUID NOT NULL REFERENCES affiliate_links(id),
  user_id UUID REFERENCES profiles(id),
  clicked_at TIMESTAMPTZ DEFAULT NOW(),
  converted BOOLEAN DEFAULT FALSE,
  commission_earned NUMERIC DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_link ON affiliate_clicks(link_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_user ON affiliate_clicks(user_id);

-- ============================================================================
-- AD REVENUE TRACKING
-- ============================================================================

CREATE TABLE IF NOT EXISTS ad_impressions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  ad_type TEXT NOT NULL, -- 'banner', 'interstitial', 'rewarded_video'
  ad_placement TEXT, -- 'dashboard', 'sidebar', etc.
  revenue_earned NUMERIC DEFAULT 0,
  tokens_rewarded INTEGER DEFAULT 0, -- For rewarded videos
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ad_impressions_user ON ad_impressions(user_id);
CREATE INDEX IF NOT EXISTS idx_ad_impressions_date ON ad_impressions(created_at);

-- ============================================================================
-- REVENUE ANALYTICS
-- ============================================================================

CREATE TABLE IF NOT EXISTS revenue_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL UNIQUE,
  subscription_revenue NUMERIC DEFAULT 0,
  token_sale_revenue NUMERIC DEFAULT 0,
  marketplace_fees NUMERIC DEFAULT 0,
  ad_revenue NUMERIC DEFAULT 0,
  affiliate_revenue NUMERIC DEFAULT 0,
  event_revenue NUMERIC DEFAULT 0,
  total_revenue NUMERIC DEFAULT 0,
  token_redemption_cost NUMERIC DEFAULT 0,
  net_profit NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_revenue_summary_date ON revenue_summary(date);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to process token purchase
CREATE OR REPLACE FUNCTION process_token_purchase(
  p_package_id UUID,
  p_stripe_payment_intent_id TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_package RECORD;
  v_total_tokens INTEGER;
BEGIN
  -- Get package details
  SELECT * INTO v_package
  FROM token_packages
  WHERE id = p_package_id AND is_active = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Package not found');
  END IF;

  v_total_tokens := v_package.token_amount + v_package.bonus_tokens;

  -- Record purchase
  INSERT INTO token_purchases (
    user_id, package_id, tokens_purchased, bonus_tokens, 
    price_paid, payment_method, stripe_payment_intent_id, status
  ) VALUES (
    v_user_id, p_package_id, v_package.token_amount, v_package.bonus_tokens,
    v_package.price_usd, 'stripe', p_stripe_payment_intent_id, 'completed'
  );

  -- Add tokens to user balance
  UPDATE profiles
  SET token_balance = token_balance + v_total_tokens,
      total_earned = total_earned + v_total_tokens
  WHERE id = v_user_id;

  -- Log transaction
  INSERT INTO transactions (user_id, amount, type, description, reference_id)
  VALUES (
    v_user_id, v_total_tokens, 'token_purchase',
    format('Purchased %s (%s tokens + %s bonus)', v_package.package_name, v_package.token_amount, v_package.bonus_tokens),
    p_package_id
  );

  RETURN jsonb_build_object(
    'success', true,
    'tokens_added', v_total_tokens,
    'new_balance', (SELECT token_balance FROM profiles WHERE id = v_user_id)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to activate subscription
CREATE OR REPLACE FUNCTION activate_subscription(
  p_tier_id UUID,
  p_billing_cycle TEXT,
  p_stripe_subscription_id TEXT,
  p_stripe_customer_id TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_tier RECORD;
  v_period_end TIMESTAMPTZ;
BEGIN
  -- Get tier details
  SELECT * INTO v_tier
  FROM subscription_tiers
  WHERE id = p_tier_id AND is_active = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Tier not found');
  END IF;

  -- Calculate period end
  IF p_billing_cycle = 'yearly' THEN
    v_period_end := NOW() + INTERVAL '1 year';
  ELSE
    v_period_end := NOW() + INTERVAL '1 month';
  END IF;

  -- Upsert subscription
  INSERT INTO user_subscriptions (
    user_id, tier_id, status, billing_cycle,
    stripe_subscription_id, stripe_customer_id,
    current_period_start, current_period_end
  ) VALUES (
    v_user_id, p_tier_id, 'active', p_billing_cycle,
    p_stripe_subscription_id, p_stripe_customer_id,
    NOW(), v_period_end
  )
  ON CONFLICT (user_id) DO UPDATE SET
    tier_id = EXCLUDED.tier_id,
    status = 'active',
    billing_cycle = EXCLUDED.billing_cycle,
    stripe_subscription_id = EXCLUDED.stripe_subscription_id,
    stripe_customer_id = EXCLUDED.stripe_customer_id,
    current_period_start = NOW(),
    current_period_end = v_period_end,
    updated_at = NOW();

  -- Award monthly bonus tokens
  IF v_tier.monthly_bonus_tokens > 0 THEN
    UPDATE profiles
    SET token_balance = token_balance + v_tier.monthly_bonus_tokens,
        total_earned = total_earned + v_tier.monthly_bonus_tokens
    WHERE id = v_user_id;

    INSERT INTO transactions (user_id, amount, type, description)
    VALUES (
      v_user_id, v_tier.monthly_bonus_tokens, 'subscription_bonus',
      format('Monthly bonus from %s subscription', v_tier.tier_name)
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'tier', v_tier.tier_name,
    'period_end', v_period_end
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to join sponsored event
CREATE OR REPLACE FUNCTION join_sponsored_event(p_event_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_event RECORD;
  v_user_balance INTEGER;
BEGIN
  -- Get event details
  SELECT * INTO v_event
  FROM sponsored_events
  WHERE id = p_event_id AND status = 'active';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Event not found or not active');
  END IF;

  -- Check if already joined
  IF EXISTS (SELECT 1 FROM event_participants WHERE event_id = p_event_id AND user_id = v_user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already joined this event');
  END IF;

  -- Check max participants
  IF v_event.max_participants IS NOT NULL AND v_event.current_participants >= v_event.max_participants THEN
    RETURN jsonb_build_object('success', false, 'error', 'Event is full');
  END IF;

  -- Check balance and deduct entry fee
  IF v_event.entry_fee_tokens > 0 THEN
    SELECT token_balance INTO v_user_balance FROM profiles WHERE id = v_user_id;
    
    IF v_user_balance < v_event.entry_fee_tokens THEN
      RETURN jsonb_build_object('success', false, 'error', 'Insufficient tokens');
    END IF;

    UPDATE profiles
    SET token_balance = token_balance - v_event.entry_fee_tokens,
        total_spent = total_spent + v_event.entry_fee_tokens
    WHERE id = v_user_id;

    INSERT INTO transactions (user_id, amount, type, description, reference_id)
    VALUES (
      v_user_id, -v_event.entry_fee_tokens, 'event_entry',
      format('Entry fee for %s', v_event.event_name), p_event_id
    );
  END IF;

  -- Add participant
  INSERT INTO event_participants (event_id, user_id, entry_fee_paid)
  VALUES (p_event_id, v_user_id, v_event.entry_fee_tokens);

  -- Update participant count
  UPDATE sponsored_events
  SET current_participants = current_participants + 1
  WHERE id = p_event_id;

  RETURN jsonb_build_object('success', true, 'message', 'Successfully joined event');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate marketplace fee based on user tier
CREATE OR REPLACE FUNCTION get_marketplace_fee(p_user_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  v_fee NUMERIC;
BEGIN
  SELECT 
    COALESCE(
      (st.features->>'marketplace_fee')::NUMERIC,
      0.07
    ) INTO v_fee
  FROM user_subscriptions us
  JOIN subscription_tiers st ON st.id = us.tier_id
  WHERE us.user_id = p_user_id AND us.status = 'active';

  RETURN COALESCE(v_fee, 0.07); -- Default 7% for free users
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION process_token_purchase TO authenticated;
GRANT EXECUTE ON FUNCTION activate_subscription TO authenticated;
GRANT EXECUTE ON FUNCTION join_sponsored_event TO authenticated;
GRANT EXECUTE ON FUNCTION get_marketplace_fee TO authenticated;

