-- Fix gaming account deletion with RPC function
-- This creates a secure function that can delete gaming accounts

DROP FUNCTION IF EXISTS delete_gaming_account(uuid);

CREATE OR REPLACE FUNCTION delete_gaming_account(p_account_id uuid)
RETURNS json AS $$
DECLARE
  v_user_id uuid;
  v_count integer;
BEGIN
  v_user_id := auth.uid();
  
  -- Check if the account belongs to the current user
  SELECT COUNT(*) INTO v_count
  FROM gaming_accounts
  WHERE id = p_account_id AND user_id = v_user_id;
  
  IF v_count = 0 THEN
    RETURN json_build_object('success', false, 'error', 'Gaming account not found or access denied');
  END IF;
  
  -- Delete all associated games
  DELETE FROM user_games WHERE gaming_account_id = p_account_id;
  
  -- Delete the gaming account
  DELETE FROM gaming_accounts WHERE id = p_account_id;
  
  RETURN json_build_object('success', true, 'message', 'Gaming account deleted successfully');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION delete_gaming_account(uuid) TO authenticated;
