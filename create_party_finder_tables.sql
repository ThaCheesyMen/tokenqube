-- Party Finder Database Tables
-- Run this in Supabase SQL Editor

-- Create parties table
CREATE TABLE IF NOT EXISTS parties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  leader_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  game_name TEXT NOT NULL,
  game_id TEXT,
  platform TEXT NOT NULL,
  party_size INTEGER DEFAULT 4,
  current_size INTEGER DEFAULT 1,
  description TEXT,
  voice_chat_enabled BOOLEAN DEFAULT true,
  min_level INTEGER,
  language TEXT,
  status TEXT DEFAULT 'open', -- open, full, closed, in-session
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- Create party_members table
CREATE TABLE IF NOT EXISTS party_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  party_id UUID REFERENCES parties(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  role TEXT DEFAULT 'member', -- leader, member
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(party_id, user_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_parties_status ON parties(status);
CREATE INDEX IF NOT EXISTS idx_parties_leader ON parties(leader_id);
CREATE INDEX IF NOT EXISTS idx_parties_platform ON parties(platform);
CREATE INDEX IF NOT EXISTS idx_party_members_party ON party_members(party_id);
CREATE INDEX IF NOT EXISTS idx_party_members_user ON party_members(user_id);

-- Enable RLS
ALTER TABLE parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE party_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies for parties
CREATE POLICY "Anyone can view open parties"
  ON parties FOR SELECT
  TO authenticated
  USING (status IN ('open', 'full'));

CREATE POLICY "Users can create parties"
  ON parties FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = leader_id);

CREATE POLICY "Party leader can update their party"
  ON parties FOR UPDATE
  TO authenticated
  USING (auth.uid() = leader_id);

CREATE POLICY "Party leader can delete their party"
  ON parties FOR DELETE
  TO authenticated
  USING (auth.uid() = leader_id);

-- RLS Policies for party_members
CREATE POLICY "Users can view party members"
  ON party_members FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can join parties"
  ON party_members FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave parties"
  ON party_members FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Function to update party current_size
CREATE OR REPLACE FUNCTION update_party_size()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE parties 
    SET current_size = current_size + 1,
        status = CASE 
          WHEN current_size + 1 >= party_size THEN 'full'
          ELSE 'open'
        END
    WHERE id = NEW.party_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE parties 
    SET current_size = current_size - 1,
        status = CASE 
          WHEN current_size - 1 > 0 THEN 'open'
          ELSE 'closed'
        END
    WHERE id = OLD.party_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Triggers to auto-update party size
CREATE TRIGGER trigger_party_size_insert
  AFTER INSERT ON party_members
  FOR EACH ROW
  EXECUTE FUNCTION update_party_size();

CREATE TRIGGER trigger_party_size_delete
  AFTER DELETE ON party_members
  FOR EACH ROW
  EXECUTE FUNCTION update_party_size();

-- Verify tables were created
SELECT 'Party Finder tables created successfully!' as status;
