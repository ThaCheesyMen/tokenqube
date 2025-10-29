-- =====================================================
-- SIMPLE FIX: Recreate token_staking table
-- WARNING: This will delete any existing staking data!
-- Only run this if you don't have important staking data yet
-- =====================================================

-- Drop the existing table
DROP TABLE IF EXISTS public.token_staking CASCADE;

-- Recreate with correct schema
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

-- Add indexes
CREATE INDEX idx_token_staking_user_id ON public.token_staking(user_id);
CREATE INDEX idx_token_staking_is_active ON public.token_staking(is_active);
CREATE INDEX idx_token_staking_unlock_date ON public.token_staking(unlock_date);

-- Enable RLS
ALTER TABLE public.token_staking ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
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

SELECT 'token_staking table recreated successfully!' as status;

