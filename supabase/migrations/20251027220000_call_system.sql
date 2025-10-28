-- Call Signals Table for WebRTC signaling
CREATE TABLE IF NOT EXISTS call_signals (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  room_id TEXT NOT NULL,
  sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  signal_type TEXT NOT NULL CHECK (signal_type IN ('offer', 'answer', 'ice-candidate')),
  signal_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Add indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_call_signals_room_id ON call_signals(room_id);
CREATE INDEX IF NOT EXISTS idx_call_signals_sender_id ON call_signals(sender_id);
CREATE INDEX IF NOT EXISTS idx_call_signals_created_at ON call_signals(created_at DESC);

-- Enable RLS
ALTER TABLE call_signals ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read call signals for their rooms" ON call_signals;
DROP POLICY IF EXISTS "Users can send call signals" ON call_signals;
DROP POLICY IF EXISTS "Users can delete their own call signals" ON call_signals;

-- RLS Policies
CREATE POLICY "Users can read call signals for their rooms"
  ON call_signals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM dm_rooms
      WHERE (
        (dm_rooms.user1_id = auth.uid() OR dm_rooms.user2_id = auth.uid())
        AND dm_rooms.id::text = call_signals.room_id
      )
    )
    OR call_signals.room_id LIKE 'party_%'
  );

CREATE POLICY "Users can send call signals"
  ON call_signals FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can delete their own call signals"
  ON call_signals FOR DELETE
  USING (auth.uid() = sender_id OR room_id IN (
    SELECT id::text FROM dm_rooms 
    WHERE user1_id = auth.uid() OR user2_id = auth.uid()
  ));

-- Call Sessions Table
CREATE TABLE IF NOT EXISTS call_sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  room_id TEXT NOT NULL,
  caller_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  receiver_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  call_type TEXT NOT NULL CHECK (call_type IN ('voice', 'video')),
  status TEXT NOT NULL DEFAULT 'ringing' CHECK (status IN ('ringing', 'active', 'ended', 'missed', 'declined')),
  started_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  answered_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER DEFAULT 0,
  CONSTRAINT different_users CHECK (caller_id != receiver_id)
);

-- Add indexes for call sessions
CREATE INDEX IF NOT EXISTS idx_call_sessions_room_id ON call_sessions(room_id);
CREATE INDEX IF NOT EXISTS idx_call_sessions_caller_id ON call_sessions(caller_id);
CREATE INDEX IF NOT EXISTS idx_call_sessions_receiver_id ON call_sessions(receiver_id);
CREATE INDEX IF NOT EXISTS idx_call_sessions_status ON call_sessions(status);
CREATE INDEX IF NOT EXISTS idx_call_sessions_started_at ON call_sessions(started_at DESC);

-- Enable RLS
ALTER TABLE call_sessions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own call sessions" ON call_sessions;
DROP POLICY IF EXISTS "Users can create call sessions" ON call_sessions;
DROP POLICY IF EXISTS "Users can update their own call sessions" ON call_sessions;

-- RLS Policies for call_sessions
CREATE POLICY "Users can view their own call sessions"
  ON call_sessions FOR SELECT
  USING (auth.uid() = caller_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can create call sessions"
  ON call_sessions FOR INSERT
  WITH CHECK (auth.uid() = caller_id);

CREATE POLICY "Users can update their own call sessions"
  ON call_sessions FOR UPDATE
  USING (auth.uid() = caller_id OR auth.uid() = receiver_id)
  WITH CHECK (auth.uid() = caller_id OR auth.uid() = receiver_id);

-- Function to auto-calculate call duration
CREATE OR REPLACE FUNCTION update_call_duration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.ended_at IS NOT NULL AND NEW.answered_at IS NOT NULL THEN
    NEW.duration_seconds = EXTRACT(EPOCH FROM (NEW.ended_at - NEW.answered_at))::INTEGER;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update call duration
DROP TRIGGER IF EXISTS update_call_sessions_duration ON call_sessions;
CREATE TRIGGER update_call_sessions_duration
  BEFORE UPDATE ON call_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_call_duration();

-- Function to cleanup old call signals (older than 1 hour)
CREATE OR REPLACE FUNCTION cleanup_old_call_signals()
RETURNS void AS $$
BEGIN
  DELETE FROM call_signals
  WHERE created_at < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql;

-- Enable realtime for both tables
ALTER PUBLICATION supabase_realtime ADD TABLE call_signals;
ALTER PUBLICATION supabase_realtime ADD TABLE call_sessions;

