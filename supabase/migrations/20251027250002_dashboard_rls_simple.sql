-- Dashboard Enhancement Features - RLS and Functions (Simple version to avoid deadlocks)

-- =====================================================
-- ENABLE RLS (without dropping existing policies)
-- =====================================================

ALTER TABLE IF EXISTS notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS tournament_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS token_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS game_launches ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS events ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- HELPER FUNCTIONS ONLY (No policy modifications)
-- =====================================================

-- Drop existing functions if they exist (all possible signatures)
DROP FUNCTION IF EXISTS create_notification(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB) CASCADE;
DROP FUNCTION IF EXISTS create_notification(UUID, TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS create_notification CASCADE;
DROP FUNCTION IF EXISTS mark_notification_read(UUID) CASCADE;
DROP FUNCTION IF EXISTS mark_notification_read CASCADE;
DROP FUNCTION IF EXISTS mark_all_notifications_read() CASCADE;
DROP FUNCTION IF EXISTS mark_all_notifications_read CASCADE;
DROP FUNCTION IF EXISTS get_unread_notification_count(UUID) CASCADE;
DROP FUNCTION IF EXISTS get_unread_notification_count CASCADE;

-- Function to create a notification
CREATE FUNCTION create_notification(
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_message TEXT,
  p_icon TEXT DEFAULT NULL,
  p_action_url TEXT DEFAULT NULL,
  p_action_data JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO notifications (user_id, type, title, message, icon, action_url, action_data)
  VALUES (p_user_id, p_type, p_title, p_message, p_icon, p_action_url, p_action_data)
  RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark notification as read
CREATE FUNCTION mark_notification_read(p_notification_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE notifications
  SET read = TRUE
  WHERE id = p_notification_id AND user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark all notifications as read
CREATE FUNCTION mark_all_notifications_read()
RETURNS VOID AS $$
BEGIN
  UPDATE notifications
  SET read = TRUE
  WHERE user_id = auth.uid() AND read = FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get unread notification count
CREATE FUNCTION get_unread_notification_count(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM notifications
  WHERE user_id = p_user_id AND read = FALSE;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable realtime for notifications
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
  END IF;
END $$;

COMMENT ON FUNCTION create_notification IS 'Creates a new notification for a user';
COMMENT ON FUNCTION mark_notification_read IS 'Marks a single notification as read';
COMMENT ON FUNCTION mark_all_notifications_read IS 'Marks all notifications as read for the current user';

