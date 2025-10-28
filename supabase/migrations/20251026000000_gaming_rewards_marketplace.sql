/*
  # Gaming Rewards & Marketplace System
  
  ## New Tables
  
  1. playtime_rewards - Track hourly playtime rewards
  2. playtime_milestones - Define milestone bonuses
  3. achievement_multipliers - Rarity-based reward multipliers
  4. competitive_matches - Track competitive game results
  5. marketplace_items - Items for sale
  6. marketplace_transactions - Purchase history
  7. marketplace_favorites - User favorites
  8. marketplace_reviews - Buyer/seller reviews
  9. user_marketplace_stats - Seller statistics
  10. game_tiers - Define token rates per game
*/

-- Game Tiers (token rates per hour)
CREATE TABLE IF NOT EXISTS game_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_name text NOT NULL UNIQUE,
  tier integer NOT NULL, -- 1, 2, or 3
  tokens_per_hour integer NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Playtime Rewards
CREATE TABLE IF NOT EXISTS playtime_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  gaming_account_id uuid REFERENCES gaming_accounts(id) ON DELETE CASCADE NOT NULL,
  game_name text NOT NULL,
  hours_played decimal NOT NULL,
  tokens_earned integer NOT NULL,
  reward_rate integer NOT NULL,
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  claimed boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Playtime Milestones
CREATE TABLE IF NOT EXISTS playtime_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_name text, -- NULL means applies to all games
  hours_required integer NOT NULL,
  bonus_tokens integer NOT NULL,
  milestone_name text NOT NULL,
  badge_icon text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- User Milestone Achievements
CREATE TABLE IF NOT EXISTS user_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  milestone_id uuid REFERENCES playtime_milestones(id) ON DELETE CASCADE NOT NULL,
  game_name text NOT NULL,
  achieved_at timestamptz DEFAULT now(),
  tokens_awarded integer NOT NULL,
  UNIQUE(user_id, milestone_id, game_name)
);

-- Achievement Multipliers
CREATE TABLE IF NOT EXISTS achievement_multipliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rarity text NOT NULL UNIQUE,
  base_tokens integer NOT NULL,
  multiplier decimal DEFAULT 1.0,
  description text
);

-- Enhanced Gaming Achievements (add rarity)
ALTER TABLE gaming_achievements ADD COLUMN IF NOT EXISTS rarity text DEFAULT 'common';
ALTER TABLE gaming_achievements ADD COLUMN IF NOT EXISTS game_name text;
ALTER TABLE gaming_achievements ADD COLUMN IF NOT EXISTS achievement_id text;
ALTER TABLE gaming_achievements ADD COLUMN IF NOT EXISTS unlock_date timestamptz DEFAULT now();

-- Competitive Matches
CREATE TABLE IF NOT EXISTS competitive_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  game_name text NOT NULL,
  match_result text NOT NULL, -- win, loss, draw
  rank_change integer DEFAULT 0,
  performance_score integer DEFAULT 0,
  tokens_earned integer NOT NULL,
  match_date timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Marketplace Items
CREATE TABLE IF NOT EXISTS marketplace_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  game_name text NOT NULL,
  item_name text NOT NULL,
  item_description text NOT NULL,
  item_type text NOT NULL, -- skin, weapon, currency, account, cosmetic
  item_rarity text,
  price_tokens integer NOT NULL,
  price_usd decimal,
  quantity integer DEFAULT 1,
  images text[] DEFAULT '{}',
  condition text DEFAULT 'new',
  tradeable_until timestamptz,
  platform text NOT NULL,
  is_verified boolean DEFAULT false,
  status text DEFAULT 'active', -- active, sold, reserved, removed
  views integer DEFAULT 0,
  favorites integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Marketplace Transactions
CREATE TABLE IF NOT EXISTS marketplace_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid REFERENCES marketplace_items(id) ON DELETE CASCADE NOT NULL,
  seller_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  buyer_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  price_tokens integer NOT NULL,
  platform_fee integer NOT NULL,
  seller_receives integer NOT NULL,
  transaction_status text DEFAULT 'pending', -- pending, completed, disputed, cancelled
  delivery_status text DEFAULT 'pending', -- pending, in_progress, delivered, confirmed
  delivery_method text,
  buyer_rating integer,
  seller_rating integer,
  dispute_reason text,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- Marketplace Favorites
CREATE TABLE IF NOT EXISTS marketplace_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  item_id uuid REFERENCES marketplace_items(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, item_id)
);

-- Marketplace Reviews
CREATE TABLE IF NOT EXISTS marketplace_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid REFERENCES marketplace_transactions(id) ON DELETE CASCADE NOT NULL,
  reviewer_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  reviewed_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(transaction_id, reviewer_id)
);

-- User Marketplace Stats
CREATE TABLE IF NOT EXISTS user_marketplace_stats (
  user_id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  total_sales integer DEFAULT 0,
  total_purchases integer DEFAULT 0,
  total_tokens_earned integer DEFAULT 0,
  total_tokens_spent integer DEFAULT 0,
  average_rating decimal DEFAULT 0,
  total_reviews integer DEFAULT 0,
  verified_seller boolean DEFAULT false,
  seller_tier text DEFAULT 'bronze',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_playtime_rewards_user ON playtime_rewards(user_id);
CREATE INDEX IF NOT EXISTS idx_playtime_rewards_game ON playtime_rewards(game_name);
CREATE INDEX IF NOT EXISTS idx_marketplace_items_seller ON marketplace_items(seller_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_items_game ON marketplace_items(game_name);
CREATE INDEX IF NOT EXISTS idx_marketplace_items_status ON marketplace_items(status);
CREATE INDEX IF NOT EXISTS idx_marketplace_transactions_buyer ON marketplace_transactions(buyer_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_transactions_seller ON marketplace_transactions(seller_id);
CREATE INDEX IF NOT EXISTS idx_competitive_matches_user ON competitive_matches(user_id);

-- Enable RLS
ALTER TABLE game_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE playtime_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE playtime_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievement_multipliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitive_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_marketplace_stats ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Game Tiers (public read)
CREATE POLICY "Anyone can view game tiers" ON game_tiers FOR SELECT USING (true);

-- Playtime Rewards (users can view their own)
CREATE POLICY "Users can view own playtime rewards" ON playtime_rewards FOR SELECT USING (auth.uid() = user_id);

-- Playtime Milestones (public read)
CREATE POLICY "Anyone can view milestones" ON playtime_milestones FOR SELECT USING (true);

-- User Milestones (users can view their own)
CREATE POLICY "Users can view own milestones" ON user_milestones FOR SELECT USING (auth.uid() = user_id);

-- Achievement Multipliers (public read)
CREATE POLICY "Anyone can view multipliers" ON achievement_multipliers FOR SELECT USING (true);

-- Competitive Matches (users can view their own)
CREATE POLICY "Users can view own matches" ON competitive_matches FOR SELECT USING (auth.uid() = user_id);

-- Marketplace Items (public read active items, sellers can manage their own)
CREATE POLICY "Anyone can view active items" ON marketplace_items FOR SELECT USING (status = 'active' OR auth.uid() = seller_id);
CREATE POLICY "Sellers can insert items" ON marketplace_items FOR INSERT WITH CHECK (auth.uid() = seller_id);
CREATE POLICY "Sellers can update own items" ON marketplace_items FOR UPDATE USING (auth.uid() = seller_id);
CREATE POLICY "Sellers can delete own items" ON marketplace_items FOR DELETE USING (auth.uid() = seller_id);

-- Marketplace Transactions (buyers and sellers can view their own)
CREATE POLICY "Users can view own transactions" ON marketplace_transactions FOR SELECT USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- Marketplace Favorites (users can manage their own)
CREATE POLICY "Users can view own favorites" ON marketplace_favorites FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can add favorites" ON marketplace_favorites FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove favorites" ON marketplace_favorites FOR DELETE USING (auth.uid() = user_id);

-- Marketplace Reviews (public read, users can write reviews for their transactions)
CREATE POLICY "Anyone can view reviews" ON marketplace_reviews FOR SELECT USING (true);
CREATE POLICY "Users can write reviews" ON marketplace_reviews FOR INSERT WITH CHECK (auth.uid() = reviewer_id);

-- User Marketplace Stats (public read)
CREATE POLICY "Anyone can view marketplace stats" ON user_marketplace_stats FOR SELECT USING (true);

-- Functions

-- Award Playtime Tokens
CREATE OR REPLACE FUNCTION award_playtime_tokens(
  p_user_id uuid,
  p_gaming_account_id uuid,
  p_game_name text,
  p_hours_played decimal,
  p_tokens_per_hour integer
)
RETURNS json AS $$
DECLARE
  v_tokens_earned integer;
  v_period_start timestamptz;
  v_period_end timestamptz;
BEGIN
  v_tokens_earned := FLOOR(p_hours_played * p_tokens_per_hour);
  v_period_end := now();
  v_period_start := v_period_end - (p_hours_played || ' hours')::interval;
  
  -- Record playtime reward
  INSERT INTO playtime_rewards (
    user_id, gaming_account_id, game_name, hours_played, 
    tokens_earned, reward_rate, period_start, period_end, claimed
  ) VALUES (
    p_user_id, p_gaming_account_id, p_game_name, p_hours_played,
    v_tokens_earned, p_tokens_per_hour, v_period_start, v_period_end, true
  );
  
  -- Update user balance
  UPDATE profiles
  SET token_balance = token_balance + v_tokens_earned,
      total_earned = total_earned + v_tokens_earned
  WHERE id = p_user_id;
  
  -- Record transaction
  INSERT INTO transactions (user_id, amount, type, description)
  VALUES (p_user_id, v_tokens_earned, 'playtime_reward', 
          'Played ' || p_game_name || ' for ' || p_hours_played || ' hours');
  
  RETURN json_build_object('success', true, 'tokens_earned', v_tokens_earned);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check and Award Milestones
CREATE OR REPLACE FUNCTION check_playtime_milestones(
  p_user_id uuid,
  p_game_name text,
  p_total_hours decimal
)
RETURNS json AS $$
DECLARE
  v_milestone RECORD;
  v_tokens_awarded integer := 0;
  v_milestones_achieved integer := 0;
BEGIN
  -- Check for applicable milestones
  FOR v_milestone IN 
    SELECT * FROM playtime_milestones 
    WHERE (game_name IS NULL OR game_name = p_game_name)
      AND hours_required <= p_total_hours
      AND is_active = true
      AND NOT EXISTS (
        SELECT 1 FROM user_milestones 
        WHERE user_id = p_user_id 
          AND milestone_id = playtime_milestones.id 
          AND game_name = p_game_name
      )
  LOOP
    -- Award milestone
    INSERT INTO user_milestones (user_id, milestone_id, game_name, tokens_awarded)
    VALUES (p_user_id, v_milestone.id, p_game_name, v_milestone.bonus_tokens);
    
    -- Update user balance
    UPDATE profiles
    SET token_balance = token_balance + v_milestone.bonus_tokens,
        total_earned = total_earned + v_milestone.bonus_tokens
    WHERE id = p_user_id;
    
    -- Record transaction
    INSERT INTO transactions (user_id, amount, type, description)
    VALUES (p_user_id, v_milestone.bonus_tokens, 'milestone_bonus', 
            'Achieved ' || v_milestone.milestone_name || ' in ' || p_game_name);
    
    v_tokens_awarded := v_tokens_awarded + v_milestone.bonus_tokens;
    v_milestones_achieved := v_milestones_achieved + 1;
  END LOOP;
  
  RETURN json_build_object(
    'success', true, 
    'milestones_achieved', v_milestones_achieved,
    'tokens_awarded', v_tokens_awarded
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Purchase Marketplace Item
CREATE OR REPLACE FUNCTION purchase_marketplace_item(
  p_item_id uuid,
  p_buyer_id uuid
)
RETURNS json AS $$
DECLARE
  v_item RECORD;
  v_platform_fee integer;
  v_seller_receives integer;
BEGIN
  -- Get item details
  SELECT * INTO v_item FROM marketplace_items WHERE id = p_item_id AND status = 'active';
  
  IF v_item IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Item not found or not available');
  END IF;
  
  IF v_item.seller_id = p_buyer_id THEN
    RETURN json_build_object('success', false, 'error', 'Cannot buy your own item');
  END IF;
  
  -- Check buyer balance
  IF (SELECT token_balance FROM profiles WHERE id = p_buyer_id) < v_item.price_tokens THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient tokens');
  END IF;
  
  -- Calculate fees (5%)
  v_platform_fee := FLOOR(v_item.price_tokens * 0.05);
  v_seller_receives := v_item.price_tokens - v_platform_fee;
  
  -- Deduct from buyer
  UPDATE profiles
  SET token_balance = token_balance - v_item.price_tokens,
      total_spent = total_spent + v_item.price_tokens
  WHERE id = p_buyer_id;
  
  -- Add to seller
  UPDATE profiles
  SET token_balance = token_balance + v_seller_receives,
      total_earned = total_earned + v_seller_receives
  WHERE id = v_item.seller_id;
  
  -- Mark item as sold
  UPDATE marketplace_items
  SET status = 'sold', updated_at = now()
  WHERE id = p_item_id;
  
  -- Create transaction record
  INSERT INTO marketplace_transactions (
    item_id, seller_id, buyer_id, price_tokens, 
    platform_fee, seller_receives, transaction_status
  ) VALUES (
    p_item_id, v_item.seller_id, p_buyer_id, v_item.price_tokens,
    v_platform_fee, v_seller_receives, 'pending'
  );
  
  -- Update marketplace stats
  INSERT INTO user_marketplace_stats (user_id, total_purchases, total_tokens_spent)
  VALUES (p_buyer_id, 1, v_item.price_tokens)
  ON CONFLICT (user_id) DO UPDATE
  SET total_purchases = user_marketplace_stats.total_purchases + 1,
      total_tokens_spent = user_marketplace_stats.total_tokens_spent + v_item.price_tokens;
      
  INSERT INTO user_marketplace_stats (user_id, total_sales, total_tokens_earned)
  VALUES (v_item.seller_id, 1, v_seller_receives)
  ON CONFLICT (user_id) DO UPDATE
  SET total_sales = user_marketplace_stats.total_sales + 1,
      total_tokens_earned = user_marketplace_stats.total_tokens_earned + v_seller_receives;
  
  -- Record transactions
  INSERT INTO transactions (user_id, amount, type, description)
  VALUES (p_buyer_id, -v_item.price_tokens, 'marketplace_purchase', 
          'Purchased ' || v_item.item_name);
          
  INSERT INTO transactions (user_id, amount, type, description)
  VALUES (v_item.seller_id, v_seller_receives, 'marketplace_sale', 
          'Sold ' || v_item.item_name);
  
  RETURN json_build_object('success', true, 'transaction_id', 
    (SELECT id FROM marketplace_transactions WHERE item_id = p_item_id ORDER BY created_at DESC LIMIT 1));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert Initial Data

-- Game Tiers
INSERT INTO game_tiers (game_name, tier, tokens_per_hour) VALUES
  ('Fortnite', 1, 5),
  ('Valorant', 1, 5),
  ('Counter-Strike 2', 1, 5),
  ('CS:GO', 1, 5),
  ('Apex Legends', 1, 5),
  ('Call of Duty: Warzone', 1, 5),
  ('League of Legends', 1, 5),
  ('Dota 2', 1, 5),
  ('Minecraft', 2, 3),
  ('Roblox', 2, 3),
  ('Rocket League', 2, 3),
  ('Overwatch 2', 2, 3),
  ('Rainbow Six Siege', 2, 3),
  ('Destiny 2', 2, 3),
  ('Warframe', 2, 3),
  ('Other', 3, 2)
ON CONFLICT (game_name) DO NOTHING;

-- Playtime Milestones (Global - apply to all games)
INSERT INTO playtime_milestones (game_name, hours_required, bonus_tokens, milestone_name, badge_icon) VALUES
  (NULL, 10, 50, 'Casual Player', '🎮'),
  (NULL, 50, 300, 'Dedicated Gamer', '🎯'),
  (NULL, 100, 750, 'Hardcore Player', '🔥'),
  (NULL, 500, 5000, 'Gaming Legend', '👑'),
  (NULL, 1000, 15000, 'Master Gamer', '💎')
ON CONFLICT DO NOTHING;

-- Achievement Multipliers
INSERT INTO achievement_multipliers (rarity, base_tokens, multiplier, description) VALUES
  ('common', 10, 1.0, 'Common achievements (>50% unlock rate)'),
  ('uncommon', 25, 1.0, 'Uncommon achievements (25-50% unlock rate)'),
  ('rare', 50, 1.0, 'Rare achievements (10-25% unlock rate)'),
  ('epic', 100, 1.0, 'Epic achievements (5-10% unlock rate)'),
  ('legendary', 250, 1.0, 'Legendary achievements (<5% unlock rate)')
ON CONFLICT (rarity) DO NOTHING;

