-- Live Streaming System Migration
-- Adds tables and RLS for livestreaming functionality

-- Create live_streams table
CREATE TABLE IF NOT EXISTS live_streams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  streamer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  is_live BOOLEAN DEFAULT true,
  viewer_count INTEGER DEFAULT 0,
  quality TEXT CHECK (quality IN ('720p', '1080p', '4k')) DEFAULT '1080p',
  fps INTEGER CHECK (fps IN (30, 60)) DEFAULT 60,
  bitrate INTEGER DEFAULT 6000,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create stream_viewers table for tracking who's watching
CREATE TABLE IF NOT EXISTS stream_viewers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id UUID NOT NULL REFERENCES live_streams(id) ON DELETE CASCADE,
  viewer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(stream_id, viewer_id)
);

-- Create stream_chat_messages table
CREATE TABLE IF NOT EXISTS stream_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id UUID NOT NULL REFERENCES live_streams(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_live_streams_streamer ON live_streams(streamer_id);
CREATE INDEX IF NOT EXISTS idx_live_streams_is_live ON live_streams(is_live);
CREATE INDEX IF NOT EXISTS idx_stream_viewers_stream ON stream_viewers(stream_id);
CREATE INDEX IF NOT EXISTS idx_stream_chat_stream ON stream_chat_messages(stream_id);

-- Enable RLS
ALTER TABLE live_streams ENABLE ROW LEVEL SECURITY;
ALTER TABLE stream_viewers ENABLE ROW LEVEL SECURITY;
ALTER TABLE stream_chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for live_streams
CREATE POLICY "Anyone can view live streams"
ON live_streams
FOR SELECT
USING (true);

CREATE POLICY "Streamers can create their own streams"
ON live_streams
FOR INSERT
WITH CHECK (auth.uid() = streamer_id);

CREATE POLICY "Streamers can update their own streams"
ON live_streams
FOR UPDATE
USING (auth.uid() = streamer_id);

CREATE POLICY "Streamers can delete their own streams"
ON live_streams
FOR DELETE
USING (auth.uid() = streamer_id);

-- RLS Policies for stream_viewers
CREATE POLICY "Anyone can view stream viewers"
ON stream_viewers
FOR SELECT
USING (true);

CREATE POLICY "Users can join streams"
ON stream_viewers
FOR INSERT
WITH CHECK (auth.uid() = viewer_id);

CREATE POLICY "Users can leave streams"
ON stream_viewers
FOR DELETE
USING (auth.uid() = viewer_id);

-- RLS Policies for stream_chat_messages
CREATE POLICY "Anyone can view stream chat"
ON stream_chat_messages
FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can send messages"
ON stream_chat_messages
FOR INSERT
WITH CHECK (auth.uid() = sender_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE live_streams;
ALTER PUBLICATION supabase_realtime ADD TABLE stream_viewers;
ALTER PUBLICATION supabase_realtime ADD TABLE stream_chat_messages;

-- Function to update viewer count
CREATE OR REPLACE FUNCTION update_stream_viewer_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE live_streams 
    SET viewer_count = viewer_count + 1
    WHERE id = NEW.stream_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE live_streams 
    SET viewer_count = GREATEST(viewer_count - 1, 0)
    WHERE id = OLD.stream_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger for viewer count
DROP TRIGGER IF EXISTS stream_viewer_count_trigger ON stream_viewers;
CREATE TRIGGER stream_viewer_count_trigger
AFTER INSERT OR DELETE ON stream_viewers
FOR EACH ROW
EXECUTE FUNCTION update_stream_viewer_count();

-- Function to auto-end streams after 6 hours
CREATE OR REPLACE FUNCTION auto_end_old_streams()
RETURNS void AS $$
BEGIN
  UPDATE live_streams
  SET is_live = false,
      ended_at = NOW()
  WHERE is_live = true
    AND started_at < NOW() - INTERVAL '6 hours';
END;
$$ LANGUAGE plpgsql;

