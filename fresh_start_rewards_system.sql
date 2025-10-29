-- =====================================================
-- FRESH START: Rewards System Setup
-- WARNING: This drops ALL existing rewards tables!
-- Only use if you want a clean slate
-- =====================================================

-- Drop all tables (cascades to dependent objects)
DROP TABLE IF EXISTS public.token_staking CASCADE;
DROP TABLE IF EXISTS public.token_purchases CASCADE;
DROP TABLE IF EXISTS public.token_withdrawals CASCADE;
DROP TABLE IF EXISTS public.user_quests CASCADE;
DROP TABLE IF EXISTS public.quest_templates CASCADE;
DROP TABLE IF EXISTS public.quests CASCADE;

-- =====================================================
-- 1. TOKEN STAKING
-- =====================================================

CREATE TABLE public.token_staking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL CHECK (amount > 0),
    staked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    unlock_date TIMESTAMP WITH TIME ZONE NOT NULL,
    reward_rate NUMERIC(10, 4) NOT NULL DEFAULT 0,
    accumulated_rewards INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_token_staking_user_id ON public.token_staking(user_id);
CREATE INDEX idx_token_staking_is_active ON public.token_staking(is_active);
CREATE INDEX idx_token_staking_unlock_date ON public.token_staking(unlock_date);

ALTER TABLE public.token_staking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own stakes" ON public.token_staking FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own stakes" ON public.token_staking FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own stakes" ON public.token_staking FOR UPDATE USING (auth.uid() = user_id);

-- =====================================================
-- 2. TOKEN PURCHASES
-- =====================================================

CREATE TABLE public.token_purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL CHECK (amount > 0),
    price_usd NUMERIC(10, 2) NOT NULL CHECK (price_usd > 0),
    payment_method TEXT NOT NULL DEFAULT 'crypto',
    payment_reference TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_token_purchases_user_id ON public.token_purchases(user_id);
CREATE INDEX idx_token_purchases_status ON public.token_purchases(status);

ALTER TABLE public.token_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own purchases" ON public.token_purchases FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own purchases" ON public.token_purchases FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- 3. TOKEN WITHDRAWALS
-- =====================================================

CREATE TABLE public.token_withdrawals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL CHECK (amount > 0),
    amount_after_fee INTEGER NOT NULL CHECK (amount_after_fee > 0),
    fee_amount INTEGER NOT NULL DEFAULT 0,
    usd_value NUMERIC(10, 2) NOT NULL CHECK (usd_value > 0),
    crypto_address TEXT NOT NULL,
    crypto_currency TEXT NOT NULL DEFAULT 'BTC' CHECK (crypto_currency IN ('BTC', 'ETH', 'USDT')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    tx_hash TEXT
);

CREATE INDEX idx_token_withdrawals_user_id ON public.token_withdrawals(user_id);
CREATE INDEX idx_token_withdrawals_status ON public.token_withdrawals(status);

ALTER TABLE public.token_withdrawals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own withdrawals" ON public.token_withdrawals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own withdrawals" ON public.token_withdrawals FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- 4. QUEST TEMPLATES
-- =====================================================

CREATE TABLE public.quest_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    quest_type TEXT NOT NULL DEFAULT 'daily',
    difficulty TEXT NOT NULL DEFAULT 'medium',
    requirements JSONB NOT NULL DEFAULT '{}'::jsonb,
    token_reward INTEGER NOT NULL DEFAULT 100,
    xp_reward INTEGER NOT NULL DEFAULT 50,
    cooldown_hours INTEGER NOT NULL DEFAULT 24,
    is_active BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_quest_templates_is_active ON public.quest_templates(is_active);
CREATE INDEX idx_quest_templates_sort_order ON public.quest_templates(sort_order);

ALTER TABLE public.quest_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view quest templates" ON public.quest_templates FOR SELECT USING (is_active = true);

-- =====================================================
-- 5. USER QUESTS
-- =====================================================

CREATE TABLE public.user_quests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    quest_id UUID NOT NULL REFERENCES public.quest_templates(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'expired', 'abandoned')),
    progress JSONB NOT NULL DEFAULT '{}'::jsonb,
    assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_user_quests_user_id ON public.user_quests(user_id);
CREATE INDEX idx_user_quests_quest_id ON public.user_quests(quest_id);
CREATE INDEX idx_user_quests_status ON public.user_quests(status);
CREATE INDEX idx_user_quests_expires_at ON public.user_quests(expires_at);

ALTER TABLE public.user_quests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own quests" ON public.user_quests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own quests" ON public.user_quests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own quests" ON public.user_quests FOR UPDATE USING (auth.uid() = user_id);

-- =====================================================
-- 6. QUESTS (Legacy, for backwards compatibility)
-- =====================================================

CREATE TABLE public.quests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    quest_type TEXT NOT NULL DEFAULT 'daily',
    difficulty TEXT NOT NULL DEFAULT 'medium',
    requirements JSONB NOT NULL DEFAULT '{}'::jsonb,
    token_reward INTEGER NOT NULL DEFAULT 100,
    xp_reward INTEGER NOT NULL DEFAULT 50,
    cooldown_hours INTEGER NOT NULL DEFAULT 24,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.quests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active quests" ON public.quests FOR SELECT USING (is_active = true);

-- =====================================================
-- 7. INSERT SAMPLE QUEST TEMPLATES
-- =====================================================

INSERT INTO public.quest_templates (name, description, quest_type, difficulty, requirements, token_reward, xp_reward, cooldown_hours, sort_order) VALUES
    ('Daily Login Streak', 'Login for 7 consecutive days to earn rewards', 'daily', 'easy', '{"login_days": 7}'::jsonb, 150, 75, 24, 1),
    ('Win 5 Matches', 'Win 5 games in any title', 'daily', 'medium', '{"wins": 5}'::jsonb, 300, 150, 24, 2),
    ('Play for 2 Hours', 'Play any game for 2 hours', 'daily', 'easy', '{"playtime_hours": 2}'::jsonb, 200, 100, 24, 3),
    ('Triple Kill', 'Get 3 kills without dying in any FPS game', 'daily', 'medium', '{"multi_kills": 3}'::jsonb, 250, 125, 24, 4),
    ('Social Butterfly', 'Send 10 messages in chat', 'daily', 'easy', '{"messages_sent": 10}'::jsonb, 100, 50, 24, 5),
    ('Weekly Champion', 'Win 25 matches this week', 'weekly', 'hard', '{"wins": 25}'::jsonb, 1500, 750, 168, 6),
    ('Grind Master', 'Play for 20 hours this week', 'weekly', 'hard', '{"playtime_hours": 20}'::jsonb, 2000, 1000, 168, 7),
    ('Tournament Victor', 'Win a tournament match', 'special', 'extreme', '{"tournament_wins": 1}'::jsonb, 5000, 2500, 72, 8),
    ('Squad Goals', 'Play 10 games with your squad', 'weekly', 'medium', '{"squad_games": 10}'::jsonb, 800, 400, 168, 9),
    ('Achievement Hunter', 'Unlock 5 achievements', 'weekly', 'medium', '{"achievements": 5}'::jsonb, 1000, 500, 168, 10);

-- =====================================================
-- 8. DATABASE FUNCTIONS
-- =====================================================

-- Update staking rewards
CREATE OR REPLACE FUNCTION update_staking_rewards()
RETURNS void AS $$
BEGIN
    UPDATE public.token_staking
    SET 
        accumulated_rewards = accumulated_rewards + FLOOR(amount * reward_rate),
        updated_at = NOW()
    WHERE 
        is_active = true
        AND unlock_date > NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Expire old quests
CREATE OR REPLACE FUNCTION expire_old_quests()
RETURNS void AS $$
BEGIN
    UPDATE public.user_quests
    SET status = 'expired'
    WHERE 
        status = 'active'
        AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check quest completion
CREATE OR REPLACE FUNCTION check_quest_completion(p_user_quest_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_user_quest RECORD;
    v_progress JSONB;
    v_requirements JSONB;
    v_is_complete BOOLEAN := true;
    v_key TEXT;
BEGIN
    SELECT uq.*, qt.requirements, qt.token_reward, qt.xp_reward
    INTO v_user_quest
    FROM public.user_quests uq
    JOIN public.quest_templates qt ON uq.quest_id = qt.id
    WHERE uq.id = p_user_quest_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Quest not found');
    END IF;

    IF v_user_quest.status = 'completed' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Quest already completed');
    END IF;

    v_progress := v_user_quest.progress;
    v_requirements := v_user_quest.requirements;

    FOR v_key IN SELECT jsonb_object_keys(v_requirements)
    LOOP
        IF (v_progress->>v_key)::INTEGER < (v_requirements->>v_key)::INTEGER THEN
            v_is_complete := false;
            EXIT;
        END IF;
    END LOOP;

    IF v_is_complete THEN
        UPDATE public.user_quests SET status = 'completed', completed_at = NOW() WHERE id = p_user_quest_id;
        UPDATE public.profiles SET token_balance = token_balance + v_user_quest.token_reward WHERE id = v_user_quest.user_id;
        INSERT INTO public.transactions (user_id, amount, type, description) VALUES (v_user_quest.user_id, v_user_quest.token_reward, 'quest_reward', 'Completed quest');

        RETURN jsonb_build_object('success', true, 'completed', true, 'rewards', jsonb_build_object('tokens', v_user_quest.token_reward, 'xp', v_user_quest.xp_reward));
    END IF;

    RETURN jsonb_build_object('success', true, 'completed', false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- VERIFICATION
-- =====================================================

SELECT 'All tables created successfully!' as status;
SELECT 'token_staking: ' || COUNT(*)::TEXT || ' rows' FROM public.token_staking;
SELECT 'token_purchases: ' || COUNT(*)::TEXT || ' rows' FROM public.token_purchases;
SELECT 'token_withdrawals: ' || COUNT(*)::TEXT || ' rows' FROM public.token_withdrawals;
SELECT 'quest_templates: ' || COUNT(*)::TEXT || ' rows (should be 10)' FROM public.quest_templates;
SELECT 'user_quests: ' || COUNT(*)::TEXT || ' rows' FROM public.user_quests;

