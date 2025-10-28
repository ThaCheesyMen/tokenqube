-- Advanced Features Migration
-- Implements: User Reports, Message History, Token Boosts, Profile Customization

-- ============================================================================
-- USER REPORTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reported_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  context TEXT, -- 'friends_list', 'chat', 'activity_feed', 'marketplace'
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'actioned', 'dismissed')),
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  action_taken TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_reports_reported ON user_reports(reported_id);
CREATE INDEX IF NOT EXISTS idx_user_reports_status ON user_reports(status);

ALTER TABLE user_reports ENABLE ROW LEVEL SECURITY;

-- Users can submit reports
DROP POLICY IF EXISTS "Users can submit reports" ON user_reports;
CREATE POLICY "Users can submit reports"
  ON user_reports FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

-- Users can view their own reports
DROP POLICY IF EXISTS "Users can view own reports" ON user_reports;
CREATE POLICY "Users can view own reports"
  ON user_reports FOR SELECT
  TO authenticated
  USING (auth.uid() = reporter_id);

-- ============================================================================
-- MESSAGE EDIT HISTORY
-- ============================================================================

CREATE TABLE IF NOT EXISTS message_edit_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL,
  message_type TEXT NOT NULL CHECK (message_type IN ('chat', 'dm')),
  previous_content TEXT NOT NULL,
  edited_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  edited_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_message_edit_history_message ON message_edit_history(message_id);

ALTER TABLE message_edit_history ENABLE ROW LEVEL SECURITY;

-- Users can view edit history of messages they can see
DROP POLICY IF EXISTS "Users can view message edit history" ON message_edit_history;
CREATE POLICY "Users can view message edit history"
  ON message_edit_history FOR SELECT
  TO authenticated
  USING (true); -- Will be filtered by application logic based on room access

-- ============================================================================
-- PROFILE ENHANCEMENTS (Token Boosts & Customization)
-- ============================================================================

-- Add new columns to profiles for boosts and customization
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS earning_boost_multiplier NUMERIC DEFAULT 1.0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS earning_boost_until TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profile_banner TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profile_title TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS animated_avatar BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS custom_flair JSONB DEFAULT '{}'::jsonb;

-- ============================================================================
-- PERSISTENT PARTIES
-- ============================================================================

-- Add persistence columns to parties table
ALTER TABLE parties ADD COLUMN IF NOT EXISTS is_persistent BOOLEAN DEFAULT FALSE;
ALTER TABLE parties ADD COLUMN IF NOT EXISTS persistent_until TIMESTAMPTZ;
ALTER TABLE parties ADD COLUMN IF NOT EXISTS auto_delete_when_empty BOOLEAN DEFAULT TRUE;

-- ============================================================================
-- PROFILE CUSTOMIZATION ITEMS (Redeemable with Tokens)
-- ============================================================================

CREATE TABLE IF NOT EXISTS profile_customization_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_type TEXT NOT NULL CHECK (item_type IN ('banner', 'title', 'animated_avatar', 'flair')),
  item_name TEXT NOT NULL,
  item_description TEXT,
  token_cost INTEGER NOT NULL,
  item_data JSONB DEFAULT '{}'::jsonb, -- Stores URL, color, animation details, etc.
  is_active BOOLEAN DEFAULT TRUE,
  rarity TEXT DEFAULT 'common' CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customization_items_type ON profile_customization_items(item_type);

ALTER TABLE profile_customization_items ENABLE ROW LEVEL SECURITY;

-- Anyone can view available items
DROP POLICY IF EXISTS "Anyone can view customization items" ON profile_customization_items;
CREATE POLICY "Anyone can view customization items"
  ON profile_customization_items FOR SELECT
  TO authenticated
  USING (is_active = true);

-- ============================================================================
-- USER OWNED CUSTOMIZATION ITEMS
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_customization_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES profile_customization_items(id) ON DELETE CASCADE,
  purchased_at TIMESTAMPTZ DEFAULT NOW(),
  is_equipped BOOLEAN DEFAULT FALSE,
  UNIQUE(user_id, item_id)
);

CREATE INDEX IF NOT EXISTS idx_user_customization_user ON user_customization_items(user_id);

ALTER TABLE user_customization_items ENABLE ROW LEVEL SECURITY;

-- Users can view their own items
DROP POLICY IF EXISTS "Users can view own customization items" ON user_customization_items;
CREATE POLICY "Users can view own customization items"
  ON user_customization_items FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can update their own items (equip/unequip)
DROP POLICY IF EXISTS "Users can update own items" ON user_customization_items;
CREATE POLICY "Users can update own items"
  ON user_customization_items FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to purchase customization item
CREATE OR REPLACE FUNCTION purchase_customization_item(p_item_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_item_cost INTEGER;
  v_user_balance INTEGER;
  v_result JSONB;
BEGIN
  -- Get item cost
  SELECT token_cost INTO v_item_cost
  FROM profile_customization_items
  WHERE id = p_item_id AND is_active = true;

  IF v_item_cost IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Item not found or inactive');
  END IF;

  -- Check if user already owns it
  IF EXISTS (SELECT 1 FROM user_customization_items WHERE user_id = v_user_id AND item_id = p_item_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Item already owned');
  END IF;

  -- Get user balance
  SELECT token_balance INTO v_user_balance
  FROM profiles
  WHERE id = v_user_id;

  IF v_user_balance < v_item_cost THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient tokens');
  END IF;

  -- Deduct tokens
  UPDATE profiles
  SET token_balance = token_balance - v_item_cost,
      total_spent = total_spent + v_item_cost
  WHERE id = v_user_id;

  -- Add item to user's inventory
  INSERT INTO user_customization_items (user_id, item_id)
  VALUES (v_user_id, p_item_id);

  -- Log transaction
  INSERT INTO transactions (user_id, amount, type, description, reference_id)
  VALUES (v_user_id, -v_item_cost, 'customization_purchase', 'Purchased profile customization item', p_item_id);

  RETURN jsonb_build_object('success', true, 'tokens_spent', v_item_cost);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to purchase token boost
CREATE OR REPLACE FUNCTION purchase_token_boost(p_multiplier NUMERIC, p_duration_hours INTEGER, p_cost INTEGER)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_user_balance INTEGER;
BEGIN
  -- Get user balance
  SELECT token_balance INTO v_user_balance
  FROM profiles
  WHERE id = v_user_id;

  IF v_user_balance < p_cost THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient tokens');
  END IF;

  -- Deduct tokens
  UPDATE profiles
  SET token_balance = token_balance - p_cost,
      total_spent = total_spent + p_cost,
      earning_boost_multiplier = p_multiplier,
      earning_boost_until = NOW() + (p_duration_hours || ' hours')::INTERVAL
  WHERE id = v_user_id;

  -- Log transaction
  INSERT INTO transactions (user_id, amount, type, description)
  VALUES (v_user_id, -p_cost, 'boost_purchase', format('%sx Token Boost for %s hours', p_multiplier, p_duration_hours));

  RETURN jsonb_build_object('success', true, 'boost_active_until', NOW() + (p_duration_hours || ' hours')::INTERVAL);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to save message edit history
CREATE OR REPLACE FUNCTION save_message_edit_history()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.message IS DISTINCT FROM NEW.message THEN
    INSERT INTO message_edit_history (message_id, message_type, previous_content, edited_by)
    VALUES (
      OLD.id,
      CASE TG_TABLE_NAME
        WHEN 'chat_messages' THEN 'chat'
        WHEN 'dm_messages' THEN 'dm'
      END,
      OLD.message,
      NEW.user_id -- or NEW.sender_id for DMs
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for message edit history
DROP TRIGGER IF EXISTS chat_message_edit_history ON chat_messages;
CREATE TRIGGER chat_message_edit_history
  BEFORE UPDATE ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION save_message_edit_history();

DROP TRIGGER IF EXISTS dm_message_edit_history ON dm_messages;
CREATE TRIGGER dm_message_edit_history
  BEFORE UPDATE ON dm_messages
  FOR EACH ROW
  EXECUTE FUNCTION save_message_edit_history();

-- Grant permissions
GRANT EXECUTE ON FUNCTION purchase_customization_item TO authenticated;
GRANT EXECUTE ON FUNCTION purchase_token_boost TO authenticated;

-- ============================================================================
-- SEED DATA: Profile Customization Items
-- ============================================================================

INSERT INTO profile_customization_items (item_type, item_name, item_description, token_cost, item_data, rarity)
VALUES
  -- Banners
  ('banner', 'Cosmic Nebula', 'A stunning purple and blue nebula banner', 500, '{"url": "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=1200"}', 'rare'),
  ('banner', 'Neon City', 'Cyberpunk cityscape at night', 750, '{"url": "https://images.unsplash.com/photo-1542831371-29b0f74f9713?w=1200"}', 'epic'),
  ('banner', 'Gaming Setup', 'Epic RGB gaming battlestation', 300, '{"url": "https://images.unsplash.com/photo-1593305841991-05c297ba4575?w=1200"}', 'common'),
  
  -- Titles
  ('title', 'Token Master', 'For the dedicated earners', 250, '{"color": "#FFD700", "glow": true}', 'rare'),
  ('title', 'Gaming Legend', 'For true gaming veterans', 500, '{"color": "#FF6B6B", "glow": true}', 'epic'),
  ('title', 'Early Adopter', 'One of the first users', 1000, '{"color": "#00D9FF", "glow": true, "animated": true}', 'legendary'),
  
  -- Animated Avatars
  ('animated_avatar', 'Animated Avatar Frame', 'Add animation to your avatar', 400, '{"animation": "pulse"}', 'rare'),
  ('animated_avatar', 'Rainbow Glow Avatar', 'Rainbow glow effect', 600, '{"animation": "rainbow"}', 'epic'),
  
  -- Flair
  ('flair', 'Fire Emoji', 'Show you''re on fire', 100, '{"emoji": "🔥"}', 'common'),
  ('flair', 'Crown Emoji', 'Royal treatment', 200, '{"emoji": "👑"}', 'rare'),
  ('flair', 'Trophy Emoji', 'Victory badge', 300, '{"emoji": "🏆"}', 'epic')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- SEED DATA: Token Boosts (as redeemable items in Rewards)
-- ============================================================================

-- These will be displayed in the Rewards page as purchasable boosts
-- The actual purchase is handled by the purchase_token_boost function

