-- =====================================================
-- MARKETPLACE RLS POLICIES AND HELPER FUNCTIONS
-- =====================================================

-- Enable RLS on all marketplace tables
ALTER TABLE marketplace_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_marketplace_stats ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- MARKETPLACE ITEMS POLICIES
-- =====================================================

-- Anyone can view active items
CREATE POLICY "Anyone can view active marketplace items"
  ON marketplace_items FOR SELECT
  USING (status = 'active' OR auth.uid() = seller_id);

-- Users can create their own listings
CREATE POLICY "Users can create their own listings"
  ON marketplace_items FOR INSERT
  WITH CHECK (auth.uid() = seller_id);

-- Sellers can update their own listings
CREATE POLICY "Sellers can update their own listings"
  ON marketplace_items FOR UPDATE
  USING (auth.uid() = seller_id);

-- Sellers can delete their own listings
CREATE POLICY "Sellers can delete their own listings"
  ON marketplace_items FOR DELETE
  USING (auth.uid() = seller_id);

-- =====================================================
-- MARKETPLACE TRANSACTIONS POLICIES
-- =====================================================

-- Buyers and sellers can view their transactions
CREATE POLICY "Users can view their transactions"
  ON marketplace_transactions FOR SELECT
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- Anyone can create a transaction (purchase)
CREATE POLICY "Users can create transactions"
  ON marketplace_transactions FOR INSERT
  WITH CHECK (auth.uid() = buyer_id);

-- Sellers can update transaction status (delivery)
CREATE POLICY "Sellers can update their transactions"
  ON marketplace_transactions FOR UPDATE
  USING (auth.uid() = seller_id);

-- =====================================================
-- MARKETPLACE FAVORITES POLICIES
-- =====================================================

-- Users can view their own favorites
CREATE POLICY "Users can view their favorites"
  ON marketplace_favorites FOR SELECT
  USING (auth.uid() = user_id);

-- Users can add favorites
CREATE POLICY "Users can add favorites"
  ON marketplace_favorites FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can remove favorites
CREATE POLICY "Users can remove favorites"
  ON marketplace_favorites FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- MARKETPLACE REVIEWS POLICIES
-- =====================================================

-- Anyone can view reviews
CREATE POLICY "Anyone can view reviews"
  ON marketplace_reviews FOR SELECT
  USING (true);

-- Only transaction participants can leave reviews
CREATE POLICY "Transaction participants can leave reviews"
  ON marketplace_reviews FOR INSERT
  WITH CHECK (
    auth.uid() = reviewer_id AND
    EXISTS (
      SELECT 1 FROM marketplace_transactions
      WHERE id = marketplace_reviews.transaction_id
      AND (buyer_id = auth.uid() OR seller_id = auth.uid())
      AND transaction_status = 'completed'
    )
  );

-- =====================================================
-- USER MARKETPLACE STATS POLICIES
-- =====================================================

-- Anyone can view seller stats
CREATE POLICY "Anyone can view seller stats"
  ON user_marketplace_stats FOR SELECT
  USING (true);

-- Stats are automatically managed (no manual INSERT/UPDATE/DELETE)
-- We'll use triggers for this

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to update seller stats after transaction
CREATE OR REPLACE FUNCTION update_seller_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure seller has stats entry
  INSERT INTO user_marketplace_stats (user_id)
  VALUES (NEW.seller_id)
  ON CONFLICT (user_id) DO NOTHING;

  -- Update seller stats
  IF NEW.transaction_status = 'completed' THEN
    UPDATE user_marketplace_stats
    SET 
      total_sales = total_sales + 1,
      total_tokens_earned = total_tokens_earned + NEW.seller_receives,
      updated_at = NOW()
    WHERE user_id = NEW.seller_id;
  END IF;

  -- Update buyer stats
  INSERT INTO user_marketplace_stats (user_id)
  VALUES (NEW.buyer_id)
  ON CONFLICT (user_id) DO NOTHING;

  UPDATE user_marketplace_stats
  SET 
    total_purchases = total_purchases + 1,
    total_tokens_spent = total_tokens_spent + NEW.price_tokens,
    updated_at = NOW()
  WHERE user_id = NEW.buyer_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update stats on transaction completion
DROP TRIGGER IF EXISTS trigger_update_seller_stats ON marketplace_transactions;
CREATE TRIGGER trigger_update_seller_stats
  AFTER INSERT OR UPDATE ON marketplace_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_seller_stats();

-- Function to update seller rating after review
CREATE OR REPLACE FUNCTION update_seller_rating()
RETURNS TRIGGER AS $$
BEGIN
  -- Update average rating for the reviewed user
  UPDATE user_marketplace_stats
  SET 
    average_rating = (
      SELECT AVG(rating)::DECIMAL
      FROM marketplace_reviews
      WHERE reviewed_id = NEW.reviewed_id
    ),
    total_reviews = (
      SELECT COUNT(*)
      FROM marketplace_reviews
      WHERE reviewed_id = NEW.reviewed_id
    ),
    updated_at = NOW()
  WHERE user_id = NEW.reviewed_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update rating after review
DROP TRIGGER IF EXISTS trigger_update_seller_rating ON marketplace_reviews;
CREATE TRIGGER trigger_update_seller_rating
  AFTER INSERT ON marketplace_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_seller_rating();

-- Function to update seller tier based on performance
CREATE OR REPLACE FUNCTION update_seller_tier()
RETURNS TRIGGER AS $$
DECLARE
  new_tier TEXT;
BEGIN
  -- Determine tier based on total sales and rating
  IF NEW.total_sales >= 100 AND NEW.average_rating >= 4.8 THEN
    new_tier := 'diamond';
  ELSIF NEW.total_sales >= 50 AND NEW.average_rating >= 4.5 THEN
    new_tier := 'platinum';
  ELSIF NEW.total_sales >= 25 AND NEW.average_rating >= 4.0 THEN
    new_tier := 'gold';
  ELSIF NEW.total_sales >= 10 AND NEW.average_rating >= 3.5 THEN
    new_tier := 'silver';
  ELSE
    new_tier := 'bronze';
  END IF;

  -- Update tier if changed
  IF NEW.seller_tier != new_tier THEN
    NEW.seller_tier := new_tier;
  END IF;

  -- Verified seller status (50+ sales and 4.5+ rating)
  IF NEW.total_sales >= 50 AND NEW.average_rating >= 4.5 THEN
    NEW.verified_seller := TRUE;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update seller tier
DROP TRIGGER IF EXISTS trigger_update_seller_tier ON user_marketplace_stats;
CREATE TRIGGER trigger_update_seller_tier
  BEFORE UPDATE ON user_marketplace_stats
  FOR EACH ROW
  EXECUTE FUNCTION update_seller_tier();

-- =====================================================
-- RPC FUNCTIONS FOR MARKETPLACE
-- =====================================================

-- Get marketplace dashboard stats (for admins)
CREATE OR REPLACE FUNCTION get_marketplace_stats()
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_listings', (SELECT COUNT(*) FROM marketplace_items WHERE status = 'active'),
    'total_transactions', (SELECT COUNT(*) FROM marketplace_transactions),
    'total_volume', (SELECT COALESCE(SUM(price_tokens), 0) FROM marketplace_transactions WHERE transaction_status = 'completed'),
    'total_fees', (SELECT COALESCE(SUM(platform_fee), 0) FROM marketplace_transactions WHERE transaction_status = 'completed'),
    'active_sellers', (SELECT COUNT(DISTINCT seller_id) FROM marketplace_items WHERE status = 'active'),
    'avg_item_price', (SELECT COALESCE(AVG(price_tokens), 0)::INTEGER FROM marketplace_items WHERE status = 'active'),
    'total_reviews', (SELECT COUNT(*) FROM marketplace_reviews),
    'avg_seller_rating', (SELECT COALESCE(AVG(rating), 0)::DECIMAL FROM marketplace_reviews)
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Search marketplace items with filters
CREATE OR REPLACE FUNCTION search_marketplace_items(
  p_search TEXT DEFAULT NULL,
  p_game_name TEXT DEFAULT NULL,
  p_item_type TEXT DEFAULT NULL,
  p_min_price INTEGER DEFAULT 0,
  p_max_price INTEGER DEFAULT 1000000,
  p_platform TEXT DEFAULT NULL,
  p_rarity TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS SETOF marketplace_items AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM marketplace_items
  WHERE status = 'active'
    AND (p_search IS NULL OR item_name ILIKE '%' || p_search || '%' OR item_description ILIKE '%' || p_search || '%')
    AND (p_game_name IS NULL OR game_name = p_game_name)
    AND (p_item_type IS NULL OR item_type = p_item_type)
    AND (p_platform IS NULL OR platform = p_platform)
    AND (p_rarity IS NULL OR item_rarity = p_rarity)
    AND price_tokens BETWEEN p_min_price AND p_max_price
  ORDER BY created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Already exist from previous migrations, but ensure they're there
CREATE INDEX IF NOT EXISTS idx_marketplace_items_status 
  ON marketplace_items(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_marketplace_items_seller 
  ON marketplace_items(seller_id, status);

CREATE INDEX IF NOT EXISTS idx_marketplace_items_game 
  ON marketplace_items(game_name, status);

CREATE INDEX IF NOT EXISTS idx_marketplace_items_price 
  ON marketplace_items(price_tokens, status);

CREATE INDEX IF NOT EXISTS idx_marketplace_transactions_buyer 
  ON marketplace_transactions(buyer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_marketplace_transactions_seller 
  ON marketplace_transactions(seller_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_marketplace_reviews_reviewed 
  ON marketplace_reviews(reviewed_id);

CREATE INDEX IF NOT EXISTS idx_marketplace_favorites_user 
  ON marketplace_favorites(user_id, created_at DESC);

-- =====================================================
-- INITIAL DATA (Optional)
-- =====================================================

-- Ensure all existing users have marketplace stats entries
INSERT INTO user_marketplace_stats (user_id)
SELECT id FROM profiles
ON CONFLICT (user_id) DO NOTHING;

COMMENT ON TABLE marketplace_items IS 'Items listed for sale in the marketplace';
COMMENT ON TABLE marketplace_transactions IS 'Purchase transactions with escrow support';
COMMENT ON TABLE marketplace_reviews IS 'Buyer and seller reviews after transactions';
COMMENT ON TABLE user_marketplace_stats IS 'Aggregated marketplace statistics per user';

-- Done!
SELECT 'Marketplace RLS policies and functions created successfully!' AS message;

