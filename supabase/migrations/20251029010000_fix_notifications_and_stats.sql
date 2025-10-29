-- =====================================================
-- FIX NOTIFICATIONS DELETION & ADMIN STATS
-- =====================================================
-- Version: 1.2.4
-- Purpose: Fix notification deletion RLS and admin stats showing 0
-- Date: October 29, 2025
-- =====================================================

-- ===================
-- 1. FIX NOTIFICATIONS RLS
-- ===================

-- Ensure users can delete their own notifications
DROP POLICY IF EXISTS "Users can delete own notifications" ON notifications;
CREATE POLICY "Users can delete own notifications"
  ON notifications
  FOR DELETE
  USING (auth.uid() = user_id);

-- Ensure users can update their own notifications (mark as read)
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
CREATE POLICY "Users can update own notifications"
  ON notifications
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Ensure users can view their own notifications
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
CREATE POLICY "Users can view own notifications"
  ON notifications
  FOR SELECT
  USING (auth.uid() = user_id);

-- ===================
-- 2. FIX ADMIN STATS
-- ===================

-- Drop old function
DROP FUNCTION IF EXISTS get_platform_stats() CASCADE;

-- Create robust stats function that handles missing data gracefully
CREATE OR REPLACE FUNCTION get_platform_stats()
RETURNS TABLE (
  total_users BIGINT,
  active_users_today BIGINT,
  total_revenue NUMERIC,
  marketplace_sales BIGINT,
  pending_withdrawals BIGINT,
  total_tokens_in_circulation BIGINT,
  total_tokens_earned BIGINT,
  total_tokens_spent BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    -- Total users
    (SELECT COUNT(*) FROM profiles)::BIGINT,
    
    -- Active users today (online or active in last 24 hours)
    (SELECT COUNT(*) 
     FROM profiles 
     WHERE 
       is_online = true 
       OR last_heartbeat >= NOW() - INTERVAL '24 hours'
       OR last_active_at >= CURRENT_DATE)::BIGINT,
    
    -- Total revenue (from multiple sources)
    (
      COALESCE(
        (SELECT SUM(gross_revenue) FROM platform_revenue), 
        0
      )
    )::NUMERIC,
    
    -- Marketplace sales (completed transactions)
    (
      SELECT COUNT(*) 
      FROM marketplace_transactions 
      WHERE transaction_status = 'completed'
    )::BIGINT,
    
    -- Pending withdrawals
    (
      SELECT COUNT(*) 
      FROM token_withdrawals 
      WHERE status = 'pending'
    )::BIGINT,
    
    -- Total tokens in circulation (all user balances)
    (SELECT COALESCE(SUM(token_balance), 0) FROM profiles)::BIGINT,
    
    -- Total tokens earned
    (SELECT COALESCE(SUM(total_earned), 0) FROM profiles)::BIGINT,
    
    -- Total tokens spent (from transactions)
    (
      SELECT COALESCE(SUM(amount), 0)
      FROM token_transactions
      WHERE type = 'spend'
    )::BIGINT;
END;
$$;

GRANT EXECUTE ON FUNCTION get_platform_stats() TO authenticated;

-- ===================
-- 3. CREATE SAMPLE DATA IF NEEDED
-- ===================

-- This helps admins see non-zero stats immediately
-- Only inserts if tables are empty

-- Add platform revenue entry if none exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM platform_revenue LIMIT 1) THEN
    INSERT INTO platform_revenue (
      date,
      gross_revenue,
      net_revenue
    ) VALUES (
      CURRENT_DATE,
      0.00,
      0.00
    );
    RAISE NOTICE '✓ Created initial platform_revenue entry';
  END IF;
END $$;

-- ===================
-- 4. VERIFY TABLES EXIST
-- ===================

-- Ensure all required tables exist
DO $$
BEGIN
  -- Check if tables exist, create if missing
  -- Note: platform_revenue likely already exists from crypto_economy_system migration
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'platform_revenue') THEN
    CREATE TABLE IF NOT EXISTS platform_revenue (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      date DATE NOT NULL DEFAULT CURRENT_DATE,
      token_sales_revenue NUMERIC DEFAULT 0,
      marketplace_fees NUMERIC DEFAULT 0,
      withdrawal_fees NUMERIC DEFAULT 0,
      subscription_revenue NUMERIC DEFAULT 0,
      ad_revenue NUMERIC DEFAULT 0,
      affiliate_revenue NUMERIC DEFAULT 0,
      sponsored_events_revenue NUMERIC DEFAULT 0,
      token_redemptions NUMERIC DEFAULT 0,
      crypto_withdrawals NUMERIC DEFAULT 0,
      payment_processing_fees NUMERIC DEFAULT 0,
      gross_revenue NUMERIC DEFAULT 0,
      net_revenue NUMERIC DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    
    ALTER TABLE platform_revenue ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "Admins can view revenue" ON platform_revenue
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE id = auth.uid()
          AND role IN ('admin', 'super_admin', 'developer')
        )
      );
    
    RAISE NOTICE '✓ Created platform_revenue table';
  END IF;
  
  -- Note: token_purchases table doesn't exist in current schema
  -- It's managed through token_transactions instead
  
  -- Note: token_withdrawals table already exists from crypto_economy_system migration
  -- Schema:
  -- - amount_tokens, fee_tokens, net_amount_tokens, amount_usd
  -- - crypto_address, crypto_type, status
  -- Different from this migration's schema
END $$;

-- ===================
-- VERIFICATION
-- ===================

DO $$
DECLARE
  v_stats RECORD;
BEGIN
  RAISE NOTICE '======================================';
  RAISE NOTICE 'NOTIFICATIONS & STATS FIX v1.2.4';
  RAISE NOTICE '======================================';
  
  -- Test the stats function
  SELECT * INTO v_stats FROM get_platform_stats();
  
  RAISE NOTICE 'Total Users: %', v_stats.total_users;
  RAISE NOTICE 'Active Today: %', v_stats.active_users_today;
  RAISE NOTICE 'Total Revenue: $%', v_stats.total_revenue;
  RAISE NOTICE 'Marketplace Sales: %', v_stats.marketplace_sales;
  RAISE NOTICE 'Pending Withdrawals: %', v_stats.pending_withdrawals;
  RAISE NOTICE 'Tokens in Circulation: %', v_stats.total_tokens_in_circulation;
  RAISE NOTICE 'Tokens Earned: %', v_stats.total_tokens_earned;
  RAISE NOTICE 'Tokens Spent: %', v_stats.total_tokens_spent;
  RAISE NOTICE '======================================';
  RAISE NOTICE '✅ Fixes applied successfully!';
  RAISE NOTICE '✓ Notifications: DELETE RLS policy fixed';
  RAISE NOTICE '✓ Admin Stats: Robust function created';
  RAISE NOTICE '✓ Missing tables: Created if needed';
  RAISE NOTICE '======================================';
END $$;

