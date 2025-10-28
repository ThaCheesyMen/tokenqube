-- =============================================
-- UPGRADE ADMIN SYSTEM - Enhanced Stats & Role Management
-- Run this in Supabase SQL Editor
-- =============================================

-- Step 1: Update get_platform_stats to return accurate token circulation
DROP FUNCTION IF EXISTS get_platform_stats() CASCADE;

CREATE FUNCTION get_platform_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_stats JSONB;
  v_total_in_circulation BIGINT;
  v_total_earned BIGINT;
  v_total_spent BIGINT;
  v_total_balance BIGINT;
BEGIN
  -- Calculate accurate token circulation
  SELECT 
    COALESCE(SUM(token_balance), 0),
    COALESCE(SUM(total_earned), 0),
    COALESCE(SUM(total_spent), 0)
  INTO 
    v_total_balance,
    v_total_earned,
    v_total_spent
  FROM profiles
  WHERE deleted_at IS NULL;

  -- Build comprehensive stats
  SELECT jsonb_build_object(
    'total_users', COUNT(DISTINCT p.id),
    'active_users_today', COUNT(DISTINCT p.id) FILTER (WHERE p.last_active_at >= NOW() - INTERVAL '24 hours'),
    'total_tokens_earned', v_total_earned,
    'total_tokens_spent', v_total_spent,
    'total_tokens_in_circulation', v_total_balance,
    'marketplace_transactions', (SELECT COUNT(*) FROM marketplace_transactions WHERE transaction_status = 'completed'),
    'pending_withdrawals', (SELECT COUNT(*) FROM token_withdrawals WHERE status = 'pending'),
    'total_revenue', COALESCE((SELECT SUM(gross_revenue) FROM platform_revenue), 0),
    'users_by_role', (
      SELECT jsonb_object_agg(
        COALESCE(role, 'user'),
        count
      )
      FROM (
        SELECT role, COUNT(*) as count
        FROM profiles
        WHERE deleted_at IS NULL
        GROUP BY role
      ) role_counts
    )
  )
  INTO v_stats
  FROM profiles p
  WHERE p.deleted_at IS NULL;

  RETURN v_stats;
END;
$$;

-- Step 2: Create function to update user role (admin only)
DROP FUNCTION IF EXISTS update_user_role(UUID, TEXT) CASCADE;

CREATE FUNCTION update_user_role(
  p_target_user_id UUID,
  p_new_role TEXT
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin_id UUID;
  v_admin_role TEXT;
  v_old_role TEXT;
BEGIN
  -- Get current user
  v_admin_id := auth.uid();
  
  -- Check if current user is admin
  SELECT role INTO v_admin_role
  FROM profiles
  WHERE id = v_admin_id;
  
  IF v_admin_role NOT IN ('admin', 'super_admin') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Access denied: Admin privileges required'
    );
  END IF;
  
  -- Validate new role
  IF p_new_role NOT IN ('user', 'vip', 'moderator', 'support', 'developer', 'admin', 'super_admin') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid role specified'
    );
  END IF;
  
  -- Prevent regular admin from creating super_admin
  IF p_new_role = 'super_admin' AND v_admin_role != 'super_admin' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Only super admins can create super admins'
    );
  END IF;
  
  -- Get old role
  SELECT role INTO v_old_role
  FROM profiles
  WHERE id = p_target_user_id;
  
  -- Update role
  UPDATE profiles
  SET role = p_new_role
  WHERE id = p_target_user_id;
  
  -- Log the action
  INSERT INTO admin_action_logs (
    admin_id,
    action_type,
    target_user_id,
    action_details
  ) VALUES (
    v_admin_id,
    'role_change',
    p_target_user_id,
    jsonb_build_object(
      'old_role', v_old_role,
      'new_role', p_new_role
    )
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'old_role', v_old_role,
    'new_role', p_new_role
  );
END;
$$;

-- Step 3: Create function to get user management data
DROP FUNCTION IF EXISTS get_users_for_admin(TEXT, INT, INT) CASCADE;

CREATE FUNCTION get_users_for_admin(
  p_search TEXT DEFAULT '',
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  username TEXT,
  email TEXT,
  role TEXT,
  token_balance BIGINT,
  total_earned BIGINT,
  total_spent BIGINT,
  is_banned BOOLEAN,
  is_online BOOLEAN,
  ban_reason TEXT,
  created_at TIMESTAMPTZ,
  last_active_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.username,
    p.email,
    COALESCE(p.role, 'user') as role,
    COALESCE(p.token_balance, 0) as token_balance,
    COALESCE(p.total_earned, 0) as total_earned,
    COALESCE(p.total_spent, 0) as total_spent,
    COALESCE(p.is_banned, false) as is_banned,
    COALESCE(p.is_online, false) as is_online,
    p.ban_reason,
    p.created_at,
    p.last_active_at
  FROM profiles p
  WHERE 
    p.deleted_at IS NULL
    AND (
      p_search = ''
      OR p.username ILIKE '%' || p_search || '%'
      OR p.email ILIKE '%' || p_search || '%'
      OR p.id::text = p_search
    )
  ORDER BY p.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Step 4: Grant permissions
GRANT EXECUTE ON FUNCTION get_platform_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_role(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_users_for_admin(TEXT, INT, INT) TO authenticated;

-- Step 5: Success message
DO $$
BEGIN
  RAISE NOTICE '==========================================';
  RAISE NOTICE '✅ ADMIN SYSTEM UPGRADED!';
  RAISE NOTICE '✅ Enhanced platform stats with token circulation';
  RAISE NOTICE '✅ Role management system created';
  RAISE NOTICE '✅ User management functions added';
  RAISE NOTICE '==========================================';
END $$;

