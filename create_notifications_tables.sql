-- ============================================================================
-- Notifications System - Database Setup
-- ============================================================================
-- This script creates the tables and functions needed for the notifications
-- system. Run this in your Supabase SQL Editor.
--
-- What this creates:
--   - notifications table: Stores user notifications
--   - RLS policies: Users can only see their own notifications
--   - Triggers: Auto-updates read status and timestamps
--   - Indexes: For performance on queries
-- ============================================================================

-- Create Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  link text,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT NOW(),
  data jsonb DEFAULT '{}'::jsonb
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can insert their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
DROP POLICY IF EXISTS "System can insert notifications for any user" ON notifications;

-- RLS Policies
CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Allow system to create notifications for any user (for friend requests, etc.)
CREATE POLICY "System can insert notifications for any user"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Enable Realtime for notifications
DO $$ 
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
EXCEPTION 
  WHEN duplicate_object THEN NULL;
END $$;

-- Function to create notification (can be called via RPC)
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id uuid,
  p_type text,
  p_title text,
  p_message text,
  p_link text DEFAULT NULL,
  p_data jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_notification_id uuid;
BEGIN
  INSERT INTO notifications (user_id, type, title, message, link, data)
  VALUES (p_user_id, p_type, p_title, p_message, p_link, p_data)
  RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$;

-- Trigger to create notification when friend request is received
CREATE OR REPLACE FUNCTION notify_friend_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Create notification for the user receiving the request
  INSERT INTO notifications (user_id, type, title, message, link, data)
  SELECT 
    NEW.to_user_id,
    'friend_request',
    'New Friend Request',
    (SELECT username FROM profiles WHERE id = NEW.from_user_id) || ' wants to be your friend',
    '/friends',
    jsonb_build_object(
      'from_user_id', NEW.from_user_id,
      'request_id', NEW.id
    );
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER friend_request_notification
  AFTER INSERT ON friend_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_friend_request();

-- Trigger to create notification when friend request is accepted
CREATE OR REPLACE FUNCTION notify_friend_accepted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only notify if request was just accepted
  IF NEW.status = 'accepted' AND OLD.status != 'accepted' THEN
    -- Notify the person who sent the request
    INSERT INTO notifications (user_id, type, title, message, link, data)
    SELECT 
      NEW.from_user_id,
      'friend_accepted',
      'Friend Request Accepted',
      (SELECT username FROM profiles WHERE id = NEW.to_user_id) || ' accepted your friend request',
      '/friends',
      jsonb_build_object('user_id', NEW.to_user_id);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Need to update friend_requests to add this trigger
-- Note: We'll modify the existing friend_requests trigger if it exists
DROP TRIGGER IF EXISTS friend_accepted_notification ON friend_requests;

CREATE TRIGGER friend_accepted_notification
  AFTER UPDATE ON friend_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_friend_accepted();

-- Function to mark all notifications as read
CREATE OR REPLACE FUNCTION mark_all_notifications_read(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE notifications
  SET read = true
  WHERE user_id = p_user_id AND read = false;
END;
$$;

-- Function to delete old read notifications (cleanup)
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM notifications
  WHERE read = true
  AND created_at < NOW() - INTERVAL '30 days';
END;
$$;

COMMENT ON TABLE notifications IS 'User notifications for various events';
COMMENT ON FUNCTION create_notification IS 'Helper function to create a notification';
COMMENT ON FUNCTION mark_all_notifications_read IS 'Marks all notifications as read for a user';
COMMENT ON FUNCTION cleanup_old_notifications IS 'Removes read notifications older than 30 days';
