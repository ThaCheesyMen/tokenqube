-- Real-Time Notifications System
-- Comprehensive notification infrastructure

-- Add notification preferences if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_preferences' 
    AND column_name = 'notification_settings'
  ) THEN
    ALTER TABLE user_preferences ADD COLUMN notification_settings JSONB DEFAULT '{
      "achievement_unlocked": {"push": true, "sound": true, "toast": true},
      "friend_request": {"push": true, "sound": true, "toast": true},
      "friend_accepted": {"push": true, "sound": true, "toast": true},
      "message_received": {"push": true, "sound": true, "toast": true},
      "party_invite": {"push": true, "sound": true, "toast": true},
      "guild_invite": {"push": true, "sound": true, "toast": false},
      "token_received": {"push": true, "sound": false, "toast": true},
      "level_up": {"push": true, "sound": true, "toast": true},
      "quest_completed": {"push": true, "sound": true, "toast": true}
    }'::jsonb;
  END IF;
END $$;

-- Update notifications table structure
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent'));
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'general' CHECK (category IN ('social', 'achievement', 'economy', 'system', 'general'));
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS action_url TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS sound TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- Create notification templates table
CREATE TABLE IF NOT EXISTS notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL,
  priority TEXT DEFAULT 'normal',
  title_template TEXT NOT NULL,
  body_template TEXT NOT NULL,
  action_url_template TEXT,
  sound TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert notification templates
INSERT INTO notification_templates (template_key, category, priority, title_template, body_template, action_url_template, sound) VALUES
  ('achievement_unlocked', 'achievement', 'high', 'Achievement Unlocked!', 'You unlocked "{{achievement_name}}" and earned {{tokens}} tokens!', '/profile?tab=achievements', 'achievement'),
  ('friend_request', 'social', 'normal', 'Friend Request', '{{username}} sent you a friend request', '/friends', 'notification'),
  ('friend_accepted', 'social', 'normal', 'Friend Request Accepted', '{{username}} accepted your friend request', '/friends', 'notification'),
  ('message_received', 'social', 'normal', 'New Message', '{{username}}: {{preview}}', '/chat', 'message'),
  ('party_invite', 'social', 'high', 'Party Invite', '{{username}} invited you to join their party', '/partyfinder', 'call_join'),
  ('guild_invite', 'social', 'normal', 'Guild Invite', 'You have been invited to join {{guild_name}}', '/guilds', 'notification'),
  ('token_received', 'economy', 'normal', 'Tokens Received', 'You received {{tokens}} tokens from {{source}}', '/rewards', NULL),
  ('level_up', 'achievement', 'high', 'Level Up!', 'Congratulations! You reached level {{level}}', '/profile', 'level_up'),
  ('quest_completed', 'achievement', 'normal', 'Quest Completed', 'You completed "{{quest_name}}" and earned {{tokens}} tokens!', '/rewards', 'achievement'),
  ('call_incoming', 'social', 'urgent', 'Incoming Call', '{{username}} is calling you', '/chat', 'call_incoming'),
  ('tournament_starting', 'system', 'high', 'Tournament Starting', '{{tournament_name}} starts in 5 minutes!', '/events', 'notification'),
  ('stream_live', 'social', 'normal', 'Friend Streaming', '{{username}} is now live streaming {{game}}!', '/livestudio', NULL);

-- Create notification queue for batch processing
CREATE TABLE IF NOT EXISTS notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  template_key TEXT NOT NULL,
  template_data JSONB DEFAULT '{}'::jsonb,
  scheduled_for TIMESTAMPTZ DEFAULT NOW(),
  processed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notification_templates (read-only for all users)
CREATE POLICY "notification_templates_select" ON notification_templates FOR SELECT USING (true);

-- RLS Policies for notification_queue
CREATE POLICY "notification_queue_select" ON notification_queue FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "notification_queue_insert" ON notification_queue FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Function to create notification from template
CREATE OR REPLACE FUNCTION create_notification_from_template(
  p_user_id UUID,
  p_template_key TEXT,
  p_data JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
  v_template RECORD;
  v_title TEXT;
  v_body TEXT;
  v_action_url TEXT;
  v_notification_id UUID;
  v_key TEXT;
  v_keys TEXT[];
  v_i INTEGER;
BEGIN
  -- Get template
  SELECT * INTO v_template
  FROM notification_templates
  WHERE template_key = p_template_key;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Template not found: %', p_template_key;
  END IF;

  -- Replace template variables
  v_title := v_template.title_template;
  v_body := v_template.body_template;
  v_action_url := v_template.action_url_template;

  -- Simple template replacement ({{key}} -> value)
  v_keys := ARRAY(SELECT jsonb_object_keys(p_data));
  FOR v_i IN 1..array_length(v_keys, 1)
  LOOP
    v_key := v_keys[v_i];
    v_title := REPLACE(v_title, '{{' || v_key || '}}', p_data->>v_key);
    v_body := REPLACE(v_body, '{{' || v_key || '}}', p_data->>v_key);
    IF v_action_url IS NOT NULL THEN
      v_action_url := REPLACE(v_action_url, '{{' || v_key || '}}', p_data->>v_key);
    END IF;
  END LOOP;

  -- Create notification
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    priority,
    category,
    action_url,
    sound,
    read
  ) VALUES (
    p_user_id,
    p_template_key,
    v_title,
    v_body,
    v_template.priority,
    v_template.category,
    v_action_url,
    v_template.sound,
    false
  ) RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to send batch notifications
CREATE OR REPLACE FUNCTION process_notification_queue()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER := 0;
  v_notification RECORD;
BEGIN
  FOR v_notification IN 
    SELECT * FROM notification_queue 
    WHERE NOT processed 
    AND scheduled_for <= NOW()
    LIMIT 100
  LOOP
    PERFORM create_notification_from_template(
      v_notification.user_id,
      v_notification.template_key,
      v_notification.template_data
    );
    
    UPDATE notification_queue 
    SET processed = true 
    WHERE id = v_notification.id;
    
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up old notifications
DROP FUNCTION IF EXISTS cleanup_old_notifications();
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Delete read notifications older than 30 days
  DELETE FROM notifications
  WHERE read = true
  AND created_at < NOW() - INTERVAL '30 days';
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  
  -- Delete expired notifications
  DELETE FROM notifications
  WHERE expires_at IS NOT NULL
  AND expires_at < NOW();
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, read) WHERE read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_queue_scheduled ON notification_queue(scheduled_for) WHERE NOT processed;

-- Enable realtime for notifications - if not already added
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

COMMENT ON TABLE notification_templates IS 'Reusable notification templates with variable substitution';
COMMENT ON TABLE notification_queue IS 'Queue for batch notification processing';
COMMENT ON FUNCTION create_notification_from_template IS 'Create notification from template with data substitution';

