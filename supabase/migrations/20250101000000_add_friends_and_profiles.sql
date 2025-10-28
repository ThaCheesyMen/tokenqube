-- Add friends functionality
-- Create friends table
CREATE TABLE IF NOT EXISTS friends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'blocked')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, friend_id),
  CHECK (user_id != friend_id)
);

-- Create friend_requests table for better tracking
CREATE TABLE IF NOT EXISTS friend_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(from_user_id, to_user_id),
  CHECK (from_user_id != to_user_id)
);

-- Add status field to profiles if it doesn't exist
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'offline';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ DEFAULT NOW();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_friends_user_id ON friends(user_id);
CREATE INDEX IF NOT EXISTS idx_friends_friend_id ON friends(friend_id);
CREATE INDEX IF NOT EXISTS idx_friends_status ON friends(status);
CREATE INDEX IF NOT EXISTS idx_friend_requests_from ON friend_requests(from_user_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_to ON friend_requests(to_user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON profiles(status);

-- Create function to update last_seen
CREATE OR REPLACE FUNCTION update_last_seen()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles
  SET last_seen = NOW(), status = 'online'
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update last_seen on chat messages
DROP TRIGGER IF EXISTS trigger_update_last_seen ON chat_messages;
CREATE TRIGGER trigger_update_last_seen
  AFTER INSERT ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_last_seen();

-- Enable RLS on friends table
ALTER TABLE friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE friend_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for friends table
DROP POLICY IF EXISTS "Users can view their own friends" ON friends;
CREATE POLICY "Users can view their own friends"
  ON friends FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

DROP POLICY IF EXISTS "Users can insert their own friend requests" ON friends;
CREATE POLICY "Users can insert their own friend requests"
  ON friends FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own friend status" ON friends;
CREATE POLICY "Users can update their own friend status"
  ON friends FOR UPDATE
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

DROP POLICY IF EXISTS "Users can delete their own friendships" ON friends;
CREATE POLICY "Users can delete their own friendships"
  ON friends FOR DELETE
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- RLS Policies for friend_requests table
DROP POLICY IF EXISTS "Users can view their own friend requests" ON friend_requests;
CREATE POLICY "Users can view their own friend requests"
  ON friend_requests FOR SELECT
  USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

DROP POLICY IF EXISTS "Users can send friend requests" ON friend_requests;
CREATE POLICY "Users can send friend requests"
  ON friend_requests FOR INSERT
  WITH CHECK (auth.uid() = from_user_id);

DROP POLICY IF EXISTS "Users can update received friend requests" ON friend_requests;
CREATE POLICY "Users can update received friend requests"
  ON friend_requests FOR UPDATE
  USING (auth.uid() = to_user_id);

DROP POLICY IF EXISTS "Users can cancel sent friend requests" ON friend_requests;
CREATE POLICY "Users can cancel sent friend requests"
  ON friend_requests FOR DELETE
  USING (auth.uid() = from_user_id);

-- Create function to handle friend request acceptance
CREATE OR REPLACE FUNCTION accept_friend_request(request_id UUID)
RETURNS void AS $$
DECLARE
  v_from_user UUID;
  v_to_user UUID;
BEGIN
  -- Get the request details
  SELECT from_user_id, to_user_id INTO v_from_user, v_to_user
  FROM friend_requests
  WHERE id = request_id AND status = 'pending' AND to_user_id = auth.uid();
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Friend request not found or already processed';
  END IF;
  
  -- Update the request status
  UPDATE friend_requests
  SET status = 'accepted', updated_at = NOW()
  WHERE id = request_id;
  
  -- Insert into friends table (both directions)
  INSERT INTO friends (user_id, friend_id, status)
  VALUES (v_from_user, v_to_user, 'accepted'),
         (v_to_user, v_from_user, 'accepted')
  ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON friends TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON friend_requests TO authenticated;
GRANT EXECUTE ON FUNCTION accept_friend_request TO authenticated;
