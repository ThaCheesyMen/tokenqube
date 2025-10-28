  -- =============================================
  -- FEATURE EXPANSION - PART 1: Social & Economy
  -- =============================================

  -- Daily Login Rewards
  CREATE TABLE IF NOT EXISTS daily_login_rewards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    login_date DATE NOT NULL,
    streak_count INTEGER DEFAULT 1,
    tokens_earned INTEGER DEFAULT 0,
    bonus_applied BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, login_date)
  );

  CREATE INDEX idx_daily_login_user_date ON daily_login_rewards(user_id, login_date DESC);

  -- Friend Activity Feed
  CREATE TABLE IF NOT EXISTS friend_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    activity_type TEXT NOT NULL, -- 'achievement', 'game_start', 'level_up', 'purchase', 'milestone'
    activity_data JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE INDEX idx_friend_activities_user ON friend_activities(user_id, created_at DESC);
  CREATE INDEX idx_friend_activities_type ON friend_activities(activity_type);

  -- Token Transaction History (enhance existing table)
  DO $$
  BEGIN
    -- Table already exists from previous migration, just add missing columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'token_transactions' AND column_name = 'source') THEN
      ALTER TABLE token_transactions ADD COLUMN source TEXT;
      RAISE NOTICE 'Added source column to token_transactions';
    END IF;
    
    -- Ensure metadata column exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'token_transactions' AND column_name = 'metadata') THEN
      ALTER TABLE token_transactions ADD COLUMN metadata JSONB DEFAULT '{}';
      RAISE NOTICE 'Added metadata column to token_transactions';
    END IF;
  END $$;

  DROP INDEX IF EXISTS idx_token_transactions_user;
  CREATE INDEX idx_token_transactions_user ON token_transactions(user_id, created_at DESC);

  DROP INDEX IF EXISTS idx_token_transactions_type;
  CREATE INDEX idx_token_transactions_type ON token_transactions(type);

  -- Quest Chains
  CREATE TABLE IF NOT EXISTS quest_chains (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    quest_order INTEGER[], -- Array of quest IDs in order
    total_steps INTEGER DEFAULT 0,
    token_reward INTEGER DEFAULT 0,
    xp_reward INTEGER DEFAULT 0,
    special_reward_id UUID, -- Reference to special items
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS user_quest_chains (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    chain_id UUID REFERENCES quest_chains(id) ON DELETE CASCADE NOT NULL,
    current_step INTEGER DEFAULT 0,
    completed_steps INTEGER[] DEFAULT '{}',
    is_completed BOOLEAN DEFAULT FALSE,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    UNIQUE(user_id, chain_id)
  );

  CREATE INDEX idx_user_quest_chains ON user_quest_chains(user_id, is_completed);

  -- Party Templates
  CREATE TABLE IF NOT EXISTS party_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    template_name TEXT NOT NULL,
    game_name TEXT NOT NULL,
    platform TEXT NOT NULL,
    party_size INTEGER NOT NULL,
    description TEXT,
    voice_chat_enabled BOOLEAN DEFAULT TRUE,
    min_level INTEGER,
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE INDEX idx_party_templates_user ON party_templates(user_id);

  -- Party Ratings
  CREATE TABLE IF NOT EXISTS party_ratings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    party_id UUID REFERENCES parties(id) ON DELETE CASCADE NOT NULL,
    rater_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    rated_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    rating INTEGER CHECK (rating BETWEEN 1 AND 5),
    review_text TEXT,
    tags TEXT[] DEFAULT '{}', -- 'friendly', 'skilled', 'toxic', 'reliable'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(party_id, rater_id, rated_user_id)
  );

  CREATE INDEX idx_party_ratings_rated_user ON party_ratings(rated_user_id);
  CREATE INDEX idx_party_ratings_party ON party_ratings(party_id);

  -- User Reputation (aggregated from ratings)
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS reputation_score NUMERIC(3,2) DEFAULT 0.0;
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_ratings INTEGER DEFAULT 0;
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS reputation_tags JSONB DEFAULT '{}';

  -- Party Scheduler
  CREATE TABLE IF NOT EXISTS scheduled_parties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    leader_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    template_id UUID REFERENCES party_templates(id) ON DELETE SET NULL,
    scheduled_time TIMESTAMPTZ NOT NULL,
    game_name TEXT NOT NULL,
    platform TEXT NOT NULL,
    party_size INTEGER NOT NULL,
    description TEXT,
    is_recurring BOOLEAN DEFAULT FALSE,
    recurrence_pattern TEXT, -- 'daily', 'weekly', 'biweekly'
    reminder_sent BOOLEAN DEFAULT FALSE,
    created_party_id UUID REFERENCES parties(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE INDEX idx_scheduled_parties_leader ON scheduled_parties(leader_id, scheduled_time);
  CREATE INDEX idx_scheduled_parties_time ON scheduled_parties(scheduled_time);

  -- Squad Ranks
  CREATE TABLE IF NOT EXISTS squad_rank_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    squad_id UUID REFERENCES squads(id) ON DELETE CASCADE NOT NULL,
    rank_name TEXT NOT NULL, -- 'owner', 'co-owner', 'moderator', 'member', 'recruit'
    rank_level INTEGER NOT NULL, -- Higher = more permissions
    permissions JSONB DEFAULT '{}', -- {invite: true, kick: true, manage_events: false, etc}
    UNIQUE(squad_id, rank_name)
  );

  -- Update squad_members to use rank system
  ALTER TABLE squad_members ADD COLUMN IF NOT EXISTS rank_name TEXT DEFAULT 'member';
  ALTER TABLE squad_members ADD COLUMN IF NOT EXISTS rank_level INTEGER DEFAULT 1;

  -- Squad Events
  CREATE TABLE IF NOT EXISTS squad_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    squad_id UUID REFERENCES squads(id) ON DELETE CASCADE NOT NULL,
    event_name TEXT NOT NULL,
    event_type TEXT NOT NULL, -- 'tournament', 'practice', 'social', 'raid'
    description TEXT,
    scheduled_time TIMESTAMPTZ NOT NULL,
    duration_minutes INTEGER,
    max_participants INTEGER,
    game_name TEXT,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS squad_event_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID REFERENCES squad_events(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    status TEXT DEFAULT 'pending', -- 'pending', 'confirmed', 'declined'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(event_id, user_id)
  );

  CREATE INDEX idx_squad_events_squad ON squad_events(squad_id, scheduled_time);

  -- Squad Treasury
  CREATE TABLE IF NOT EXISTS squad_treasury (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    squad_id UUID REFERENCES squads(id) ON DELETE CASCADE NOT NULL UNIQUE,
    balance INTEGER DEFAULT 0,
    total_contributions INTEGER DEFAULT 0,
    total_spent INTEGER DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS squad_treasury_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    squad_id UUID REFERENCES squads(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    amount INTEGER NOT NULL,
    transaction_type TEXT NOT NULL, -- 'contribution', 'withdrawal', 'purchase'
    description TEXT,
    approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE INDEX idx_squad_treasury_trans ON squad_treasury_transactions(squad_id, created_at DESC);

  -- Token Staking
  CREATE TABLE IF NOT EXISTS token_stakes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    amount INTEGER NOT NULL,
    stake_duration INTEGER NOT NULL, -- in days: 7, 30, 90
    multiplier NUMERIC(3,2) NOT NULL, -- 1.05, 1.20, 1.50
    staked_at TIMESTAMPTZ DEFAULT NOW(),
    unlocks_at TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    claimed BOOLEAN DEFAULT FALSE,
    total_earned INTEGER DEFAULT 0
  );

  CREATE INDEX idx_token_stakes_user ON token_stakes(user_id, is_active);
  CREATE INDEX idx_token_stakes_unlock ON token_stakes(unlocks_at);

  -- Player Investment System
  CREATE TABLE IF NOT EXISTS player_investments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    investor_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    investee_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    amount_invested INTEGER NOT NULL,
    percentage_return NUMERIC(4,2) DEFAULT 5.00, -- 5% of earnings
    total_earned INTEGER DEFAULT 0,
    invested_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE(investor_id, investee_id)
  );

  CREATE INDEX idx_player_investments_investor ON player_investments(investor_id, is_active);
  CREATE INDEX idx_player_investments_investee ON player_investments(investee_id, is_active);

  -- RLS Policies
  ALTER TABLE daily_login_rewards ENABLE ROW LEVEL SECURITY;
  ALTER TABLE friend_activities ENABLE ROW LEVEL SECURITY;
  ALTER TABLE token_transactions ENABLE ROW LEVEL SECURITY;
  ALTER TABLE quest_chains ENABLE ROW LEVEL SECURITY;
  ALTER TABLE user_quest_chains ENABLE ROW LEVEL SECURITY;
  ALTER TABLE party_templates ENABLE ROW LEVEL SECURITY;
  ALTER TABLE party_ratings ENABLE ROW LEVEL SECURITY;
  ALTER TABLE scheduled_parties ENABLE ROW LEVEL SECURITY;
  ALTER TABLE squad_rank_permissions ENABLE ROW LEVEL SECURITY;
  ALTER TABLE squad_events ENABLE ROW LEVEL SECURITY;
  ALTER TABLE squad_event_participants ENABLE ROW LEVEL SECURITY;
  ALTER TABLE squad_treasury ENABLE ROW LEVEL SECURITY;
  ALTER TABLE squad_treasury_transactions ENABLE ROW LEVEL SECURITY;
  ALTER TABLE token_stakes ENABLE ROW LEVEL SECURITY;
  ALTER TABLE player_investments ENABLE ROW LEVEL SECURITY;

  -- Daily Login Rewards Policies
  DROP POLICY IF EXISTS "Users can view own login rewards" ON daily_login_rewards;
  CREATE POLICY "Users can view own login rewards" ON daily_login_rewards FOR SELECT USING (user_id = auth.uid());
  DROP POLICY IF EXISTS "Users can insert own login rewards" ON daily_login_rewards;
  CREATE POLICY "Users can insert own login rewards" ON daily_login_rewards FOR INSERT WITH CHECK (user_id = auth.uid());

  -- Friend Activities Policies
  DROP POLICY IF EXISTS "Users can view friends' activities" ON friend_activities;
  CREATE POLICY "Users can view friends' activities" ON friend_activities FOR SELECT USING (
    user_id IN (
      SELECT friend_id FROM friends WHERE user_id = auth.uid() AND status = 'accepted'
      UNION
      SELECT user_id FROM friends WHERE friend_id = auth.uid() AND status = 'accepted'
    ) OR user_id = auth.uid()
  );
  DROP POLICY IF EXISTS "Users can insert own activities" ON friend_activities;
  CREATE POLICY "Users can insert own activities" ON friend_activities FOR INSERT WITH CHECK (user_id = auth.uid());

  -- Token Transactions Policies
  DROP POLICY IF EXISTS "Users can view own transactions" ON token_transactions;
  CREATE POLICY "Users can view own transactions" ON token_transactions FOR SELECT USING (user_id = auth.uid());
  DROP POLICY IF EXISTS "System can insert transactions" ON token_transactions;
  CREATE POLICY "System can insert transactions" ON token_transactions FOR INSERT WITH CHECK (true);

  -- Quest Chains Policies
  DROP POLICY IF EXISTS "Anyone can view quest chains" ON quest_chains;
  CREATE POLICY "Anyone can view quest chains" ON quest_chains FOR SELECT USING (true);
  DROP POLICY IF EXISTS "Users can view own chain progress" ON user_quest_chains;
  CREATE POLICY "Users can view own chain progress" ON user_quest_chains FOR SELECT USING (user_id = auth.uid());
  DROP POLICY IF EXISTS "Users can update own chain progress" ON user_quest_chains;
  CREATE POLICY "Users can update own chain progress" ON user_quest_chains FOR ALL USING (user_id = auth.uid());

  -- Party Templates Policies
  DROP POLICY IF EXISTS "Users can manage own templates" ON party_templates;
  CREATE POLICY "Users can manage own templates" ON party_templates FOR ALL USING (user_id = auth.uid());

  -- Party Ratings Policies
  DROP POLICY IF EXISTS "Users can view all ratings" ON party_ratings;
  CREATE POLICY "Users can view all ratings" ON party_ratings FOR SELECT USING (true);
  DROP POLICY IF EXISTS "Users can insert ratings" ON party_ratings;
  CREATE POLICY "Users can insert ratings" ON party_ratings FOR INSERT WITH CHECK (rater_id = auth.uid());

  -- Other policies follow similar patterns...
  DROP POLICY IF EXISTS "Users can manage own scheduled parties" ON scheduled_parties;
  CREATE POLICY "Users can manage own scheduled parties" ON scheduled_parties FOR ALL USING (leader_id = auth.uid());

  DROP POLICY IF EXISTS "Squad members can view events" ON squad_events;
  CREATE POLICY "Squad members can view events" ON squad_events FOR SELECT USING (
    EXISTS (SELECT 1 FROM squad_members WHERE squad_id = squad_events.squad_id AND user_id = auth.uid())
  );

  DROP POLICY IF EXISTS "Users can view squad treasury" ON squad_treasury;
  CREATE POLICY "Users can view squad treasury" ON squad_treasury FOR SELECT USING (
    EXISTS (SELECT 1 FROM squad_members WHERE squad_id = squad_treasury.squad_id AND user_id = auth.uid())
  );

  DROP POLICY IF EXISTS "Users can view own stakes" ON token_stakes;
  CREATE POLICY "Users can view own stakes" ON token_stakes FOR ALL USING (user_id = auth.uid());

  DROP POLICY IF EXISTS "Users can view own investments" ON player_investments;
  CREATE POLICY "Users can view own investments" ON player_investments FOR SELECT USING (
    investor_id = auth.uid() OR investee_id = auth.uid()
  );

  -- Functions

  -- Calculate Daily Login Streak
  CREATE OR REPLACE FUNCTION check_daily_login(p_user_id UUID)
  RETURNS TABLE(streak_count INTEGER, tokens_earned INTEGER) AS $$
  DECLARE
    v_last_login DATE;
    v_current_streak INTEGER;
    v_tokens INTEGER;
  BEGIN
    -- Get last login
    SELECT login_date, streak_count INTO v_last_login, v_current_streak
    FROM daily_login_rewards
    WHERE user_id = p_user_id
    ORDER BY login_date DESC
    LIMIT 1;

    -- Check if already logged in today
    IF v_last_login = CURRENT_DATE THEN
      RETURN QUERY SELECT v_current_streak, 0;
      RETURN;
    END IF;

    -- Calculate new streak
    IF v_last_login = CURRENT_DATE - INTERVAL '1 day' THEN
      v_current_streak := COALESCE(v_current_streak, 0) + 1;
    ELSE
      v_current_streak := 1;
    END IF;

    -- Calculate tokens (base 10 + bonus for streaks)
    v_tokens := 10 + LEAST(v_current_streak * 2, 100);

    -- Insert login record
    INSERT INTO daily_login_rewards (user_id, login_date, streak_count, tokens_earned)
    VALUES (p_user_id, CURRENT_DATE, v_current_streak, v_tokens);

    -- Add tokens to profile
    UPDATE profiles SET token_balance = token_balance + v_tokens WHERE id = p_user_id;

    -- Log transaction
    INSERT INTO token_transactions (user_id, amount, type, category, source, description)
    VALUES (p_user_id, v_tokens, 'earn', 'reward', 'daily_login', 'Daily login reward (streak: ' || v_current_streak || ')');

    RETURN QUERY SELECT v_current_streak, v_tokens;
  END;
  $$ LANGUAGE plpgsql SECURITY DEFINER;

  -- Record Friend Activity
  CREATE OR REPLACE FUNCTION log_friend_activity(
    p_user_id UUID,
    p_activity_type TEXT,
    p_activity_data JSONB DEFAULT '{}'
  )
  RETURNS UUID AS $$
  DECLARE
    v_activity_id UUID;
  BEGIN
    INSERT INTO friend_activities (user_id, activity_type, activity_data)
    VALUES (p_user_id, p_activity_type, p_activity_data)
    RETURNING id INTO v_activity_id;
    
    RETURN v_activity_id;
  END;
  $$ LANGUAGE plpgsql SECURITY DEFINER;

  -- Calculate Reputation Score
  CREATE OR REPLACE FUNCTION update_user_reputation(p_user_id UUID)
  RETURNS VOID AS $$
  DECLARE
    v_avg_rating NUMERIC;
    v_total_ratings INTEGER;
    v_tags JSONB;
  BEGIN
    -- Calculate average rating
    SELECT AVG(rating), COUNT(*)
    INTO v_avg_rating, v_total_ratings
    FROM party_ratings
    WHERE rated_user_id = p_user_id;

    -- Aggregate tags
    SELECT jsonb_object_agg(tag, count)
    INTO v_tags
    FROM (
      SELECT unnest(tags) as tag, COUNT(*) as count
      FROM party_ratings
      WHERE rated_user_id = p_user_id
      GROUP BY tag
    ) tag_counts;

    -- Update profile
    UPDATE profiles
    SET 
      reputation_score = COALESCE(v_avg_rating, 0),
      total_ratings = COALESCE(v_total_ratings, 0),
      reputation_tags = COALESCE(v_tags, '{}')
    WHERE id = p_user_id;
  END;
  $$ LANGUAGE plpgsql SECURITY DEFINER;

  GRANT EXECUTE ON FUNCTION check_daily_login TO authenticated;
  GRANT EXECUTE ON FUNCTION log_friend_activity TO authenticated;
  GRANT EXECUTE ON FUNCTION update_user_reputation TO authenticated;

