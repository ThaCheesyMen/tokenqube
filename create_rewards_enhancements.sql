-- =====================================================
-- QUESTCORD REWARDS SYSTEM ENHANCEMENTS
-- Database tables for staking, buying/selling, and quest tracking
-- =====================================================

-- =====================================================
-- 1. TOKEN STAKING SYSTEM
-- =====================================================

-- Drop existing table if needed (CAREFUL: This will delete existing staking data!)
-- DROP TABLE IF EXISTS public.token_staking CASCADE;

-- Token staking table
CREATE TABLE IF NOT EXISTS public.token_staking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL CHECK (amount > 0),
    staked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    unlock_date TIMESTAMP WITH TIME ZONE NOT NULL,
    reward_rate NUMERIC(10, 4) NOT NULL DEFAULT 0, -- Daily reward rate
    accumulated_rewards INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add columns if they don't exist (for existing tables)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'token_staking' AND column_name = 'unlock_date') THEN
        ALTER TABLE public.token_staking ADD COLUMN unlock_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'token_staking' AND column_name = 'reward_rate') THEN
        ALTER TABLE public.token_staking ADD COLUMN reward_rate NUMERIC(10, 4) NOT NULL DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'token_staking' AND column_name = 'accumulated_rewards') THEN
        ALTER TABLE public.token_staking ADD COLUMN accumulated_rewards INTEGER NOT NULL DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'token_staking' AND column_name = 'staked_at') THEN
        ALTER TABLE public.token_staking ADD COLUMN staked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW();
    END IF;
END $$;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_token_staking_user_id ON public.token_staking(user_id);
CREATE INDEX IF NOT EXISTS idx_token_staking_is_active ON public.token_staking(is_active);
CREATE INDEX IF NOT EXISTS idx_token_staking_unlock_date ON public.token_staking(unlock_date);

-- RLS Policies for token staking
ALTER TABLE public.token_staking ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own stakes" ON public.token_staking;
CREATE POLICY "Users can view their own stakes" 
    ON public.token_staking FOR SELECT 
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own stakes" ON public.token_staking;
CREATE POLICY "Users can create their own stakes" 
    ON public.token_staking FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own stakes" ON public.token_staking;
CREATE POLICY "Users can update their own stakes" 
    ON public.token_staking FOR UPDATE 
    USING (auth.uid() = user_id);

-- =====================================================
-- 2. TOKEN PURCHASES (BUY TOKENS)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.token_purchases (
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

CREATE INDEX IF NOT EXISTS idx_token_purchases_user_id ON public.token_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_token_purchases_status ON public.token_purchases(status);

ALTER TABLE public.token_purchases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own purchases" ON public.token_purchases;
CREATE POLICY "Users can view their own purchases" 
    ON public.token_purchases FOR SELECT 
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own purchases" ON public.token_purchases;
CREATE POLICY "Users can create their own purchases" 
    ON public.token_purchases FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- 3. TOKEN WITHDRAWALS (SELL TOKENS)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.token_withdrawals (
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

CREATE INDEX IF NOT EXISTS idx_token_withdrawals_user_id ON public.token_withdrawals(user_id);
CREATE INDEX IF NOT EXISTS idx_token_withdrawals_status ON public.token_withdrawals(status);

ALTER TABLE public.token_withdrawals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own withdrawals" ON public.token_withdrawals;
CREATE POLICY "Users can view their own withdrawals" 
    ON public.token_withdrawals FOR SELECT 
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own withdrawals" ON public.token_withdrawals;
CREATE POLICY "Users can create their own withdrawals" 
    ON public.token_withdrawals FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- 4. QUEST SYSTEM ENHANCEMENTS
-- =====================================================

-- Quests table (if doesn't exist)
CREATE TABLE IF NOT EXISTS public.quests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    quest_type TEXT NOT NULL DEFAULT 'daily' CHECK (quest_type IN ('daily', 'weekly', 'special', 'seasonal')),
    difficulty TEXT NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard', 'extreme')),
    requirements JSONB NOT NULL DEFAULT '{}'::jsonb,
    token_reward INTEGER NOT NULL DEFAULT 100 CHECK (token_reward > 0),
    xp_reward INTEGER NOT NULL DEFAULT 50 CHECK (xp_reward > 0),
    cooldown_hours INTEGER NOT NULL DEFAULT 24,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User quests table (tracking active quests)
CREATE TABLE IF NOT EXISTS public.user_quests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    quest_id UUID NOT NULL REFERENCES public.quests(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'expired', 'abandoned')),
    progress JSONB NOT NULL DEFAULT '{}'::jsonb,
    assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, quest_id, status) -- Prevent duplicate active quests
);

CREATE INDEX IF NOT EXISTS idx_user_quests_user_id ON public.user_quests(user_id);
CREATE INDEX IF NOT EXISTS idx_user_quests_quest_id ON public.user_quests(quest_id);
CREATE INDEX IF NOT EXISTS idx_user_quests_status ON public.user_quests(status);
CREATE INDEX IF NOT EXISTS idx_user_quests_expires_at ON public.user_quests(expires_at);

ALTER TABLE public.user_quests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own quests" ON public.user_quests;
CREATE POLICY "Users can view their own quests" 
    ON public.user_quests FOR SELECT 
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own quests" ON public.user_quests;
CREATE POLICY "Users can create their own quests" 
    ON public.user_quests FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own quests" ON public.user_quests;
CREATE POLICY "Users can update their own quests" 
    ON public.user_quests FOR UPDATE 
    USING (auth.uid() = user_id);

-- Enable public read access to quests table
ALTER TABLE public.quests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active quests" ON public.quests;
CREATE POLICY "Anyone can view active quests" 
    ON public.quests FOR SELECT 
    USING (is_active = true);

-- =====================================================
-- 5. QUEST TEMPLATES TABLE (for consistent quest structure)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.quest_templates (
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

-- Add missing columns if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'quest_templates' AND column_name = 'sort_order') THEN
        ALTER TABLE public.quest_templates ADD COLUMN sort_order INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'quest_templates' AND column_name = 'cooldown_hours') THEN
        ALTER TABLE public.quest_templates ADD COLUMN cooldown_hours INTEGER NOT NULL DEFAULT 24;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_quest_templates_is_active ON public.quest_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_quest_templates_sort_order ON public.quest_templates(sort_order);

ALTER TABLE public.quest_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view quest templates" ON public.quest_templates;
CREATE POLICY "Anyone can view quest templates" 
    ON public.quest_templates FOR SELECT 
    USING (is_active = true);

-- =====================================================
-- 6. INSERT SAMPLE QUEST TEMPLATES
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
    ('Achievement Hunter', 'Unlock 5 achievements', 'weekly', 'medium', '{"achievements": 5}'::jsonb, 1000, 500, 168, 10)
ON CONFLICT DO NOTHING;

-- =====================================================
-- 7. FUNCTION TO UPDATE STAKING REWARDS (Run daily)
-- =====================================================

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

-- =====================================================
-- 8. FUNCTION TO CHECK QUEST COMPLETION
-- =====================================================

CREATE OR REPLACE FUNCTION check_quest_completion(p_user_quest_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_user_quest RECORD;
    v_quest RECORD;
    v_progress JSONB;
    v_requirements JSONB;
    v_is_complete BOOLEAN := true;
    v_key TEXT;
BEGIN
    -- Get user quest and quest details
    SELECT uq.*, q.requirements, q.token_reward, q.xp_reward, q.quest_type
    INTO v_user_quest
    FROM public.user_quests uq
    JOIN public.quest_templates q ON uq.quest_id = q.id
    WHERE uq.id = p_user_quest_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Quest not found');
    END IF;

    -- Check if already completed
    IF v_user_quest.status = 'completed' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Quest already completed');
    END IF;

    v_progress := v_user_quest.progress;
    v_requirements := v_user_quest.requirements;

    -- Check each requirement
    FOR v_key IN SELECT jsonb_object_keys(v_requirements)
    LOOP
        IF (v_progress->>v_key)::INTEGER < (v_requirements->>v_key)::INTEGER THEN
            v_is_complete := false;
            EXIT;
        END IF;
    END LOOP;

    -- If complete, award rewards
    IF v_is_complete THEN
        -- Mark quest as completed
        UPDATE public.user_quests
        SET 
            status = 'completed',
            completed_at = NOW()
        WHERE id = p_user_quest_id;

        -- Award tokens and XP
        UPDATE public.profiles
        SET 
            token_balance = token_balance + v_user_quest.token_reward,
            total_earned = total_earned + v_user_quest.token_reward
        WHERE id = v_user_quest.user_id;

        -- Create transaction record
        INSERT INTO public.transactions (user_id, amount, type, description)
        VALUES (
            v_user_quest.user_id,
            v_user_quest.token_reward,
            'quest_reward',
            'Completed quest'
        );

        RETURN jsonb_build_object(
            'success', true, 
            'completed', true,
            'rewards', jsonb_build_object(
                'tokens', v_user_quest.token_reward,
                'xp', v_user_quest.xp_reward
            )
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'completed', false,
        'progress', v_progress,
        'requirements', v_requirements
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 9. FUNCTION TO AUTO-EXPIRE QUESTS
-- =====================================================

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

-- =====================================================
-- 10. CREATE PERIODIC TASK TRIGGERS (OPTIONAL - use with pg_cron)
-- =====================================================

-- Run this if you have pg_cron enabled:
-- SELECT cron.schedule('update-staking-rewards', '0 0 * * *', 'SELECT update_staking_rewards()');
-- SELECT cron.schedule('expire-quests', '*/30 * * * *', 'SELECT expire_old_quests()');

-- =====================================================
-- COMPLETED! 
-- Run this script in your Supabase SQL editor.
-- =====================================================

-- Verify installation
SELECT 'Token Staking table created' as status WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'token_staking');
SELECT 'Token Purchases table created' as status WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'token_purchases');
SELECT 'Token Withdrawals table created' as status WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'token_withdrawals');
SELECT 'Quests table created' as status WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'quests');
SELECT 'User Quests table created' as status WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_quests');
SELECT 'Quest Templates table created' as status WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'quest_templates');
SELECT 'Functions created successfully' as status;

