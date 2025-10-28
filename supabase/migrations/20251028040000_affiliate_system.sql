-- Affiliate Rewards Enhancement System
-- Multi-tier referrals, leaderboard, analytics dashboard

-- Enhance referrals table
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS tier INTEGER DEFAULT 1 CHECK (tier BETWEEN 1 AND 3);
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS referrer_earnings INTEGER DEFAULT 0;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS referee_level INTEGER DEFAULT 1;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS last_activity TIMESTAMPTZ DEFAULT NOW();

-- Create referral earnings table
CREATE TABLE IF NOT EXISTS referral_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  referee_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  referral_id UUID REFERENCES referrals(id) ON DELETE CASCADE NOT NULL,
  amount INTEGER NOT NULL,
  earning_type TEXT NOT NULL CHECK (earning_type IN ('signup', 'activity', 'purchase', 'achievement', 'milestone')),
  tier INTEGER DEFAULT 1,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create referral milestones table
CREATE TABLE IF NOT EXISTS referral_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  milestone_name TEXT NOT NULL,
  referral_count INTEGER NOT NULL,
  reward_tokens INTEGER NOT NULL,
  reward_badge TEXT,
  reward_title TEXT,
  description TEXT,
  icon TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert referral milestones
INSERT INTO referral_milestones (milestone_name, referral_count, reward_tokens, reward_badge, reward_title, description, icon) VALUES
  ('First Steps', 1, 100, 'referrer_bronze', 'Recruiter', 'Refer your first friend', '🥉'),
  ('Growing Network', 5, 500, 'referrer_silver', 'Scout', 'Build a network of 5 referrals', '🥈'),
  ('Influencer', 10, 1500, 'referrer_gold', 'Influencer', 'Reach 10 active referrals', '🥇'),
  ('Community Builder', 25, 5000, 'referrer_platinum', 'Ambassador', 'Build a community of 25 members', '💎'),
  ('Legend', 50, 15000, 'referrer_diamond', 'Legend', 'Legendary recruiter with 50+ referrals', '👑'),
  ('Elite', 100, 50000, 'referrer_elite', 'Elite Recruiter', 'Elite status with 100+ referrals', '⭐');

-- Create referral stats table (for analytics)
CREATE TABLE IF NOT EXISTS referral_stats (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  total_referrals INTEGER DEFAULT 0,
  active_referrals INTEGER DEFAULT 0,
  total_earnings INTEGER DEFAULT 0,
  tier1_earnings INTEGER DEFAULT 0,
  tier2_earnings INTEGER DEFAULT 0,
  tier3_earnings INTEGER DEFAULT 0,
  highest_milestone TEXT,
  last_referral_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE referral_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_stats ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "referral_earnings_select" ON referral_earnings FOR SELECT USING (
  auth.uid() = referrer_id OR auth.uid() = referee_id
);
CREATE POLICY "referral_earnings_insert" ON referral_earnings FOR INSERT WITH CHECK (auth.uid() = referrer_id);

CREATE POLICY "referral_milestones_select" ON referral_milestones FOR SELECT USING (true);

CREATE POLICY "referral_stats_select" ON referral_stats FOR SELECT USING (
  auth.uid() = user_id OR
  EXISTS (
    SELECT 1 FROM friends 
    WHERE ((user_id = auth.uid() AND friend_id = referral_stats.user_id) OR 
           (friend_id = auth.uid() AND user_id = referral_stats.user_id))
    AND status = 'accepted'
  )
);
CREATE POLICY "referral_stats_insert" ON referral_stats FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "referral_stats_update" ON referral_stats FOR UPDATE USING (auth.uid() = user_id);

-- Function to calculate referral commission
CREATE OR REPLACE FUNCTION calculate_referral_commission(
  p_amount INTEGER,
  p_tier INTEGER
)
RETURNS INTEGER AS $$
BEGIN
  RETURN CASE
    WHEN p_tier = 1 THEN p_amount * 5 / 100  -- 5% for direct referrals
    WHEN p_tier = 2 THEN p_amount * 3 / 100  -- 3% for 2nd tier
    WHEN p_tier = 3 THEN p_amount * 1 / 100  -- 1% for 3rd tier
    ELSE 0
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to award referral earnings
CREATE OR REPLACE FUNCTION award_referral_earnings(
  p_referee_id UUID,
  p_amount INTEGER,
  p_earning_type TEXT,
  p_description TEXT DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  v_referral RECORD;
  v_commission INTEGER;
  v_total_awarded INTEGER := 0;
BEGIN
  -- Get direct referrer (tier 1)
  SELECT * INTO v_referral
  FROM referrals
  WHERE referred_id = p_referee_id
  AND is_active = TRUE;

  IF FOUND THEN
    -- Award tier 1 commission
    v_commission := calculate_referral_commission(p_amount, 1);
    
    IF v_commission > 0 THEN
      -- Add tokens to referrer
      UPDATE profiles
      SET token_balance = token_balance + v_commission,
          total_tokens = COALESCE(total_tokens, 0) + v_commission
      WHERE id = v_referral.referrer_id;

      -- Log earning
      INSERT INTO referral_earnings (
        referrer_id,
        referee_id,
        referral_id,
        amount,
        earning_type,
        tier,
        description
      ) VALUES (
        v_referral.referrer_id,
        p_referee_id,
        v_referral.id,
        v_commission,
        p_earning_type,
        1,
        COALESCE(p_description, 'Tier 1 referral commission')
      );

      -- Update referral earnings
      UPDATE referrals
      SET referrer_earnings = referrer_earnings + v_commission,
          last_activity = NOW()
      WHERE id = v_referral.id;

      v_total_awarded := v_total_awarded + v_commission;

      -- Create notification
      PERFORM create_notification_from_template(
        v_referral.referrer_id,
        'token_received',
        jsonb_build_object(
          'tokens', v_commission,
          'source', 'referral earnings'
        )
      );
    END IF;

    -- TODO: Get tier 2 and tier 3 referrers (implement multi-level if needed)
  END IF;

  -- Update referral stats
  PERFORM update_referral_stats(v_referral.referrer_id);

  RETURN v_total_awarded;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update referral stats
CREATE OR REPLACE FUNCTION update_referral_stats(
  p_user_id UUID
)
RETURNS VOID AS $$
DECLARE
  v_total_referrals INTEGER;
  v_active_referrals INTEGER;
  v_total_earnings INTEGER;
  v_tier1_earnings INTEGER;
  v_tier2_earnings INTEGER;
  v_tier3_earnings INTEGER;
  v_last_referral TIMESTAMPTZ;
BEGIN
  -- Count referrals
  SELECT COUNT(*), COUNT(*) FILTER (WHERE is_active)
  INTO v_total_referrals, v_active_referrals
  FROM referrals
  WHERE referrer_id = p_user_id;

  -- Calculate earnings by tier
  SELECT 
    COALESCE(SUM(amount), 0),
    COALESCE(SUM(amount) FILTER (WHERE tier = 1), 0),
    COALESCE(SUM(amount) FILTER (WHERE tier = 2), 0),
    COALESCE(SUM(amount) FILTER (WHERE tier = 3), 0)
  INTO v_total_earnings, v_tier1_earnings, v_tier2_earnings, v_tier3_earnings
  FROM referral_earnings
  WHERE referrer_id = p_user_id;

  -- Get last referral date
  SELECT MAX(created_at) INTO v_last_referral
  FROM referrals
  WHERE referrer_id = p_user_id;

  -- Upsert stats
  INSERT INTO referral_stats (
    user_id,
    total_referrals,
    active_referrals,
    total_earnings,
    tier1_earnings,
    tier2_earnings,
    tier3_earnings,
    last_referral_at,
    updated_at
  ) VALUES (
    p_user_id,
    v_total_referrals,
    v_active_referrals,
    v_total_earnings,
    v_tier1_earnings,
    v_tier2_earnings,
    v_tier3_earnings,
    v_last_referral,
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    total_referrals = EXCLUDED.total_referrals,
    active_referrals = EXCLUDED.active_referrals,
    total_earnings = EXCLUDED.total_earnings,
    tier1_earnings = EXCLUDED.tier1_earnings,
    tier2_earnings = EXCLUDED.tier2_earnings,
    tier3_earnings = EXCLUDED.tier3_earnings,
    last_referral_at = EXCLUDED.last_referral_at,
    updated_at = NOW();

  -- Check and award milestones
  PERFORM check_referral_milestones(p_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check and award milestones
CREATE OR REPLACE FUNCTION check_referral_milestones(
  p_user_id UUID
)
RETURNS VOID AS $$
DECLARE
  v_milestone RECORD;
  v_total_referrals INTEGER;
  v_current_milestone TEXT;
BEGIN
  -- Get total referrals
  SELECT total_referrals, highest_milestone
  INTO v_total_referrals, v_current_milestone
  FROM referral_stats
  WHERE user_id = p_user_id;

  -- Check each milestone
  FOR v_milestone IN
    SELECT *
    FROM referral_milestones
    WHERE referral_count <= v_total_referrals
    ORDER BY referral_count DESC
    LIMIT 1
  LOOP
    -- Award milestone if not already awarded
    IF v_current_milestone IS NULL OR v_milestone.milestone_name != v_current_milestone THEN
      -- Award tokens
      UPDATE profiles
      SET token_balance = token_balance + v_milestone.reward_tokens,
          total_tokens = COALESCE(total_tokens, 0) + v_milestone.reward_tokens
      WHERE id = p_user_id;

      -- Update stats
      UPDATE referral_stats
      SET highest_milestone = v_milestone.milestone_name
      WHERE user_id = p_user_id;

      -- Create notification
      PERFORM create_notification_from_template(
        p_user_id,
        'token_received',
        jsonb_build_object(
          'tokens', v_milestone.reward_tokens,
          'source', 'milestone: ' || v_milestone.milestone_name
        )
      );

      -- Log activity
      INSERT INTO user_activity_log (user_id, activity_type, activity_data)
      VALUES (
        p_user_id,
        'milestone_reached',
        jsonb_build_object(
          'milestone', v_milestone.milestone_name,
          'tokens', v_milestone.reward_tokens,
          'badge', v_milestone.reward_badge
        )
      );
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get referral leaderboard
CREATE OR REPLACE FUNCTION get_referral_leaderboard(
  p_limit INTEGER DEFAULT 100,
  p_period TEXT DEFAULT 'all_time'
)
RETURNS TABLE(
  rank BIGINT,
  user_id UUID,
  username TEXT,
  avatar_url TEXT,
  total_referrals INTEGER,
  active_referrals INTEGER,
  total_earnings INTEGER,
  highest_milestone TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ROW_NUMBER() OVER (ORDER BY rs.total_earnings DESC, rs.total_referrals DESC) as rank,
    p.id as user_id,
    p.username,
    p.avatar_url,
    rs.total_referrals,
    rs.active_referrals,
    rs.total_earnings,
    rs.highest_milestone
  FROM referral_stats rs
  JOIN profiles p ON p.id = rs.user_id
  WHERE rs.total_referrals > 0
  ORDER BY rs.total_earnings DESC, rs.total_referrals DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to award referral earnings on token gains
CREATE OR REPLACE FUNCTION trigger_referral_earnings()
RETURNS TRIGGER AS $$
BEGIN
  -- Award referral commission when referee earns tokens
  IF NEW.token_balance > OLD.token_balance THEN
    PERFORM award_referral_earnings(
      NEW.id,
      NEW.token_balance - OLD.token_balance,
      'activity',
      'Token earnings activity'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS referral_earnings_trigger ON profiles;
CREATE TRIGGER referral_earnings_trigger
  AFTER UPDATE OF token_balance ON profiles
  FOR EACH ROW
  WHEN (NEW.token_balance > OLD.token_balance)
  EXECUTE FUNCTION trigger_referral_earnings();

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_referral_earnings_referrer ON referral_earnings(referrer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_referral_earnings_referee ON referral_earnings(referee_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_referral_stats_earnings ON referral_stats(total_earnings DESC);
CREATE INDEX IF NOT EXISTS idx_referrals_active ON referrals(referrer_id, is_active) WHERE is_active = TRUE;

COMMENT ON TABLE referral_earnings IS 'Track all referral commission earnings with multi-tier support';
COMMENT ON TABLE referral_milestones IS 'Achievement milestones for referral counts';
COMMENT ON TABLE referral_stats IS 'Aggregated referral statistics per user for leaderboard';
COMMENT ON FUNCTION award_referral_earnings IS 'Award commission to referrer when referee earns tokens';
COMMENT ON FUNCTION get_referral_leaderboard IS 'Get top referrers ranked by earnings and referral count';

