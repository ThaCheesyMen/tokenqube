-- Role-Based Access Control System
-- Adds user roles and admin controls

-- Add role column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user' 
  CHECK (role IN ('user', 'vip', 'moderator', 'support', 'developer', 'admin', 'super_admin'));

-- Add admin-related columns
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ban_reason TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS banned_until TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS banned_by UUID REFERENCES profiles(id);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{}'::jsonb;

-- Create index for role-based queries
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role) WHERE role != 'user';

-- Admin action logs
CREATE TABLE IF NOT EXISTS admin_action_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID NOT NULL REFERENCES profiles(id),
  action_type TEXT NOT NULL,
  target_user_id UUID REFERENCES profiles(id),
  target_entity TEXT, -- 'user', 'post', 'transaction', etc.
  target_id TEXT,
  action_details JSONB DEFAULT '{}',
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_admin_action_logs_admin ON admin_action_logs(admin_id, created_at DESC);
CREATE INDEX idx_admin_action_logs_target ON admin_action_logs(target_user_id, created_at DESC);

-- RLS for admin action logs
ALTER TABLE admin_action_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view admin logs" ON admin_action_logs;
CREATE POLICY "Admins can view admin logs"
  ON admin_action_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin', 'developer')
    )
  );

DROP POLICY IF EXISTS "Admins can insert admin logs" ON admin_action_logs;
CREATE POLICY "Admins can insert admin logs"
  ON admin_action_logs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin', 'developer', 'moderator', 'support')
    )
  );

-- Platform settings table (for admin configuration)
CREATE TABLE IF NOT EXISTS platform_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'general',
  is_public BOOLEAN DEFAULT FALSE,
  updated_by UUID REFERENCES profiles(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for platform settings
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public settings viewable by all" ON platform_settings;
CREATE POLICY "Public settings viewable by all"
  ON platform_settings FOR SELECT
  USING (is_public = TRUE);

DROP POLICY IF EXISTS "Admins can view all settings" ON platform_settings;
CREATE POLICY "Admins can view all settings"
  ON platform_settings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin', 'developer')
    )
  );

DROP POLICY IF EXISTS "Admins can update settings" ON platform_settings;
CREATE POLICY "Admins can update settings"
  ON platform_settings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

-- Insert default platform settings
INSERT INTO platform_settings (key, value, description, category, is_public)
VALUES 
  ('maintenance_mode', 'false', 'Enable maintenance mode', 'system', TRUE),
  ('registration_enabled', 'true', 'Allow new user registrations', 'system', TRUE),
  ('marketplace_enabled', 'true', 'Enable marketplace features', 'features', TRUE),
  ('withdrawal_enabled', 'true', 'Allow token withdrawals', 'economy', FALSE),
  ('min_withdrawal', '10000', 'Minimum withdrawal amount in tokens', 'economy', FALSE),
  ('withdrawal_fee', '0.02', 'Withdrawal fee percentage', 'economy', FALSE),
  ('marketplace_fee', '0.05', 'Marketplace fee percentage', 'economy', FALSE),
  ('max_daily_tokens', '100000', 'Maximum tokens earnable per day', 'economy', FALSE),
  ('token_to_usd_rate', '0.001', 'Token to USD conversion rate', 'economy', FALSE)
ON CONFLICT (key) DO NOTHING;

-- Function to check if user has role
CREATE OR REPLACE FUNCTION has_role(user_id UUID, required_role TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
  role_hierarchy INTEGER;
  required_hierarchy INTEGER;
BEGIN
  SELECT role INTO user_role FROM profiles WHERE id = user_id;
  
  -- Define role hierarchy (higher number = more permissions)
  role_hierarchy := CASE user_role
    WHEN 'super_admin' THEN 100
    WHEN 'admin' THEN 90
    WHEN 'developer' THEN 80
    WHEN 'moderator' THEN 50
    WHEN 'support' THEN 40
    WHEN 'vip' THEN 20
    WHEN 'user' THEN 10
    ELSE 0
  END;
  
  required_hierarchy := CASE required_role
    WHEN 'super_admin' THEN 100
    WHEN 'admin' THEN 90
    WHEN 'developer' THEN 80
    WHEN 'moderator' THEN 50
    WHEN 'support' THEN 40
    WHEN 'vip' THEN 20
    WHEN 'user' THEN 10
    ELSE 0
  END;
  
  RETURN role_hierarchy >= required_hierarchy;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION has_role(UUID, TEXT) TO authenticated;

-- Function to ban user (admin action)
CREATE OR REPLACE FUNCTION ban_user(
  p_user_id UUID,
  p_reason TEXT,
  p_duration_hours INTEGER DEFAULT NULL,
  p_admin_id UUID DEFAULT auth.uid()
)
RETURNS VOID AS $$
BEGIN
  -- Check if executor is admin
  IF NOT has_role(p_admin_id, 'moderator') THEN
    RAISE EXCEPTION 'Insufficient permissions';
  END IF;
  
  -- Update user
  UPDATE profiles
  SET 
    is_banned = TRUE,
    ban_reason = p_reason,
    banned_by = p_admin_id,
    banned_until = CASE 
      WHEN p_duration_hours IS NOT NULL THEN NOW() + (p_duration_hours || ' hours')::INTERVAL
      ELSE NULL
    END
  WHERE id = p_user_id;
  
  -- Log action
  INSERT INTO admin_action_logs (admin_id, action_type, target_user_id, action_details)
  VALUES (p_admin_id, 'ban_user', p_user_id, jsonb_build_object(
    'reason', p_reason,
    'duration_hours', p_duration_hours
  ));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION ban_user(UUID, TEXT, INTEGER, UUID) TO authenticated;

-- Function to unban user
CREATE OR REPLACE FUNCTION unban_user(
  p_user_id UUID,
  p_admin_id UUID DEFAULT auth.uid()
)
RETURNS VOID AS $$
BEGIN
  -- Check if executor is admin
  IF NOT has_role(p_admin_id, 'moderator') THEN
    RAISE EXCEPTION 'Insufficient permissions';
  END IF;
  
  UPDATE profiles
  SET 
    is_banned = FALSE,
    ban_reason = NULL,
    banned_until = NULL
  WHERE id = p_user_id;
  
  -- Log action
  INSERT INTO admin_action_logs (admin_id, action_type, target_user_id)
  VALUES (p_admin_id, 'unban_user', p_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION unban_user(UUID, UUID) TO authenticated;

-- Function to update user role
CREATE OR REPLACE FUNCTION update_user_role(
  p_user_id UUID,
  p_new_role TEXT,
  p_admin_id UUID DEFAULT auth.uid()
)
RETURNS VOID AS $$
BEGIN
  -- Only super_admin can change roles
  IF NOT has_role(p_admin_id, 'super_admin') THEN
    RAISE EXCEPTION 'Only super admins can change user roles';
  END IF;
  
  -- Prevent self-demotion
  IF p_user_id = p_admin_id AND p_new_role != 'super_admin' THEN
    RAISE EXCEPTION 'Cannot demote yourself';
  END IF;
  
  UPDATE profiles SET role = p_new_role WHERE id = p_user_id;
  
  -- Log action
  INSERT INTO admin_action_logs (admin_id, action_type, target_user_id, action_details)
  VALUES (p_admin_id, 'update_role', p_user_id, jsonb_build_object('new_role', p_new_role));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION update_user_role(UUID, TEXT, UUID) TO authenticated;

-- Function to get platform stats (admin only)
CREATE OR REPLACE FUNCTION get_platform_stats()
RETURNS TABLE (
  total_users BIGINT,
  active_users_today BIGINT,
  total_tokens_earned BIGINT,
  total_tokens_spent BIGINT,
  marketplace_transactions BIGINT,
  pending_withdrawals BIGINT,
  total_revenue NUMERIC
) AS $$
BEGIN
  -- Check admin permission
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM profiles)::BIGINT as total_users,
    (SELECT COUNT(*) FROM profiles WHERE last_active_at >= CURRENT_DATE)::BIGINT as active_users_today,
    (SELECT COALESCE(SUM(total_earned), 0) FROM profiles)::BIGINT as total_tokens_earned,
    (SELECT COALESCE(SUM(total_spent), 0) FROM profiles)::BIGINT as total_tokens_spent,
    (SELECT COUNT(*) FROM marketplace_transactions WHERE transaction_status = 'completed')::BIGINT as marketplace_transactions,
    (SELECT COUNT(*) FROM token_withdrawals WHERE status = 'pending')::BIGINT as pending_withdrawals,
    (SELECT COALESCE(SUM(gross_revenue), 0) FROM platform_revenue)::NUMERIC as total_revenue;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_platform_stats() TO authenticated;

-- Update RLS on platform_revenue to allow admin access
DROP POLICY IF EXISTS "Admins can view revenue" ON platform_revenue;
CREATE POLICY "Admins can view revenue"
  ON platform_revenue FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin', 'developer')
    )
  );

-- Set initial super admin (replace with your user ID)
-- UPDATE profiles SET role = 'super_admin' WHERE email = 'your-email@example.com';

-- Verification
DO $$
BEGIN
  RAISE NOTICE '✅ Role-Based Access Control installed successfully!';
  RAISE NOTICE '====================================================';
  RAISE NOTICE '  ✓ User roles: user, vip, moderator, support, developer, admin, super_admin';
  RAISE NOTICE '  ✓ Admin action logging';
  RAISE NOTICE '  ✓ Platform settings management';
  RAISE NOTICE '  ✓ User ban/unban functions';
  RAISE NOTICE '  ✓ Role management functions';
  RAISE NOTICE '  ✓ Platform statistics';
  RAISE NOTICE '====================================================';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '  1. Set your account as super_admin in profiles table';
  RAISE NOTICE '  2. Access admin panel at /admin';
  RAISE NOTICE '  3. Configure platform settings';
END $$;

