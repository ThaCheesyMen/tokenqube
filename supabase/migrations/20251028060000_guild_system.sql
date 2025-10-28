-- Guild/Clan System
-- Create guilds, chat, wars, competitions, perks

-- Create guilds table
CREATE TABLE IF NOT EXISTS guilds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL CHECK (length(name) >= 3 AND length(name) <= 32),
  tag TEXT UNIQUE CHECK (length(tag) >= 2 AND length(tag) <= 6),
  description TEXT,
  icon_url TEXT,
  banner_url TEXT,
  owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  level INTEGER DEFAULT 1,
  experience INTEGER DEFAULT 0,
  member_count INTEGER DEFAULT 1,
  max_members INTEGER DEFAULT 50,
  is_public BOOLEAN DEFAULT TRUE,
  is_recruiting BOOLEAN DEFAULT TRUE,
  requirements JSONB DEFAULT '{"min_level": 1, "min_tokens": 0}'::jsonb,
  perks JSONB DEFAULT '{"xp_boost": 0, "token_boost": 0}'::jsonb,
  settings JSONB DEFAULT '{"allow_invites": true, "auto_accept": false}'::jsonb,
  total_tokens INTEGER DEFAULT 0,
  total_playtime INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create guild members table
CREATE TABLE IF NOT EXISTS guild_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id UUID REFERENCES guilds(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'officer', 'member')),
  contribution_tokens INTEGER DEFAULT 0,
  contribution_playtime INTEGER DEFAULT 0,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  last_active TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(guild_id, user_id)
);

-- Create guild invites table
CREATE TABLE IF NOT EXISTS guild_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id UUID REFERENCES guilds(id) ON DELETE CASCADE NOT NULL,
  inviter_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  invitee_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  message TEXT,
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ
);

-- Create guild chat table
CREATE TABLE IF NOT EXISTS guild_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id UUID REFERENCES guilds(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  message TEXT NOT NULL CHECK (length(message) > 0 AND length(message) <= 2000),
  reply_to_message_id UUID,
  is_pinned BOOLEAN DEFAULT FALSE,
  edited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create guild events table
CREATE TABLE IF NOT EXISTS guild_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id UUID REFERENCES guilds(id) ON DELETE CASCADE NOT NULL,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('raid', 'tournament', 'meeting', 'party', 'custom')),
  title TEXT NOT NULL,
  description TEXT,
  scheduled_time TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  max_participants INTEGER,
  participant_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'ongoing', 'completed', 'cancelled')),
  rewards JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create guild wars table
CREATE TABLE IF NOT EXISTS guild_wars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenger_guild_id UUID REFERENCES guilds(id) ON DELETE CASCADE NOT NULL,
  defender_guild_id UUID REFERENCES guilds(id) ON DELETE CASCADE NOT NULL,
  war_type TEXT DEFAULT 'tokens' CHECK (war_type IN ('tokens', 'achievements', 'playtime', 'mixed')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'ongoing', 'completed', 'declined')),
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  winner_guild_id UUID REFERENCES guilds(id),
  challenger_score INTEGER DEFAULT 0,
  defender_score INTEGER DEFAULT 0,
  wager_amount INTEGER DEFAULT 0,
  prize_pool INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create guild treasury table
CREATE TABLE IF NOT EXISTS guild_treasury (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id UUID REFERENCES guilds(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('deposit', 'withdrawal', 'reward', 'expense', 'war_wager', 'war_prize')),
  amount INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE guilds ENABLE ROW LEVEL SECURITY;
ALTER TABLE guild_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE guild_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE guild_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE guild_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE guild_wars ENABLE ROW LEVEL SECURITY;
ALTER TABLE guild_treasury ENABLE ROW LEVEL SECURITY;

-- RLS Policies for guilds
CREATE POLICY "guilds_select_public" ON guilds FOR SELECT USING (is_public OR EXISTS (
  SELECT 1 FROM guild_members WHERE guild_id = guilds.id AND user_id = auth.uid()
));
CREATE POLICY "guilds_insert" ON guilds FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "guilds_update" ON guilds FOR UPDATE USING (
  owner_id = auth.uid() OR EXISTS (
    SELECT 1 FROM guild_members WHERE guild_id = guilds.id AND user_id = auth.uid() AND role = 'officer'
  )
);
CREATE POLICY "guilds_delete" ON guilds FOR DELETE USING (owner_id = auth.uid());

-- RLS Policies for guild_members
CREATE POLICY "guild_members_select" ON guild_members FOR SELECT USING (
  EXISTS (SELECT 1 FROM guilds WHERE id = guild_members.guild_id AND is_public) OR
  user_id = auth.uid() OR
  EXISTS (SELECT 1 FROM guild_members gm WHERE gm.guild_id = guild_members.guild_id AND gm.user_id = auth.uid())
);
CREATE POLICY "guild_members_insert" ON guild_members FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "guild_members_update" ON guild_members FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM guild_members gm 
    WHERE gm.guild_id = guild_members.guild_id 
    AND gm.user_id = auth.uid() 
    AND gm.role IN ('owner', 'officer')
  )
);
CREATE POLICY "guild_members_delete" ON guild_members FOR DELETE USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM guild_members gm 
    WHERE gm.guild_id = guild_members.guild_id 
    AND gm.user_id = auth.uid() 
    AND gm.role IN ('owner', 'officer')
  )
);

-- RLS Policies for guild_invites
CREATE POLICY "guild_invites_select" ON guild_invites FOR SELECT USING (
  inviter_id = auth.uid() OR invitee_id = auth.uid()
);
CREATE POLICY "guild_invites_insert" ON guild_invites FOR INSERT WITH CHECK (inviter_id = auth.uid());
CREATE POLICY "guild_invites_update" ON guild_invites FOR UPDATE USING (invitee_id = auth.uid());

-- RLS Policies for guild_chat_messages
CREATE POLICY "guild_chat_select" ON guild_chat_messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM guild_members WHERE guild_id = guild_chat_messages.guild_id AND user_id = auth.uid())
);
CREATE POLICY "guild_chat_insert" ON guild_chat_messages FOR INSERT WITH CHECK (
  user_id = auth.uid() AND
  EXISTS (SELECT 1 FROM guild_members WHERE guild_id = guild_chat_messages.guild_id AND user_id = auth.uid())
);
CREATE POLICY "guild_chat_update" ON guild_chat_messages FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "guild_chat_delete" ON guild_chat_messages FOR DELETE USING (user_id = auth.uid());

-- RLS Policies for guild_events
CREATE POLICY "guild_events_select" ON guild_events FOR SELECT USING (
  EXISTS (SELECT 1 FROM guild_members WHERE guild_id = guild_events.guild_id AND user_id = auth.uid())
);
CREATE POLICY "guild_events_insert" ON guild_events FOR INSERT WITH CHECK (
  created_by = auth.uid() AND
  EXISTS (
    SELECT 1 FROM guild_members 
    WHERE guild_id = guild_events.guild_id 
    AND user_id = auth.uid() 
    AND role IN ('owner', 'officer')
  )
);
CREATE POLICY "guild_events_update" ON guild_events FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM guild_members 
    WHERE guild_id = guild_events.guild_id 
    AND user_id = auth.uid() 
    AND role IN ('owner', 'officer')
  )
);

-- RLS Policies for guild_wars
CREATE POLICY "guild_wars_select" ON guild_wars FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM guild_members 
    WHERE (guild_id = guild_wars.challenger_guild_id OR guild_id = guild_wars.defender_guild_id)
    AND user_id = auth.uid()
  )
);
CREATE POLICY "guild_wars_insert" ON guild_wars FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM guild_members 
    WHERE guild_id = guild_wars.challenger_guild_id 
    AND user_id = auth.uid() 
    AND role IN ('owner', 'officer')
  )
);

-- RLS Policies for guild_treasury
CREATE POLICY "guild_treasury_select" ON guild_treasury FOR SELECT USING (
  EXISTS (SELECT 1 FROM guild_members WHERE guild_id = guild_treasury.guild_id AND user_id = auth.uid())
);
CREATE POLICY "guild_treasury_insert" ON guild_treasury FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM guild_members WHERE guild_id = guild_treasury.guild_id AND user_id = auth.uid())
);

-- Function to create guild
CREATE OR REPLACE FUNCTION create_guild(
  p_name TEXT,
  p_tag TEXT,
  p_description TEXT DEFAULT NULL,
  p_owner_id UUID DEFAULT auth.uid()
)
RETURNS UUID AS $$
DECLARE
  v_guild_id UUID;
BEGIN
  -- Check if user already in a guild
  IF EXISTS (SELECT 1 FROM guild_members WHERE user_id = p_owner_id) THEN
    RAISE EXCEPTION 'Already in a guild';
  END IF;

  -- Create guild
  INSERT INTO guilds (name, tag, description, owner_id)
  VALUES (p_name, p_tag, p_description, p_owner_id)
  RETURNING id INTO v_guild_id;

  -- Add owner as member
  INSERT INTO guild_members (guild_id, user_id, role)
  VALUES (v_guild_id, p_owner_id, 'owner');

  -- Create notification
  PERFORM create_notification_from_template(
    p_owner_id,
    'guild_invite',
    jsonb_build_object(
      'guild_name', p_name
    )
  );

  RETURN v_guild_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update guild member count
CREATE OR REPLACE FUNCTION update_guild_member_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE guilds SET member_count = member_count + 1, updated_at = NOW()
    WHERE id = NEW.guild_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE guilds SET member_count = member_count - 1, updated_at = NOW()
    WHERE id = OLD.guild_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS guild_member_count_trigger ON guild_members;
CREATE TRIGGER guild_member_count_trigger
  AFTER INSERT OR DELETE ON guild_members
  FOR EACH ROW
  EXECUTE FUNCTION update_guild_member_count();

-- Enable realtime for guild chat
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'guild_chat_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE guild_chat_messages;
  END IF;
END $$;

-- Create indexes (drop old ones first to avoid conflicts)
DROP INDEX IF EXISTS idx_guilds_public;
DROP INDEX IF EXISTS idx_guilds_recruiting;
CREATE INDEX idx_guilds_public ON guilds(is_public) WHERE is_public = TRUE;
CREATE INDEX idx_guilds_recruiting ON guilds(is_recruiting) WHERE is_recruiting = TRUE;
CREATE INDEX IF NOT EXISTS idx_guild_members_user ON guild_members(user_id);
CREATE INDEX IF NOT EXISTS idx_guild_members_guild ON guild_members(guild_id, role);
CREATE INDEX IF NOT EXISTS idx_guild_chat_guild ON guild_chat_messages(guild_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_guild_invites_invitee ON guild_invites(invitee_id, status);
CREATE INDEX IF NOT EXISTS idx_guild_events_guild ON guild_events(guild_id, scheduled_time);
CREATE INDEX IF NOT EXISTS idx_guild_wars_guilds ON guild_wars(challenger_guild_id, defender_guild_id, status);

COMMENT ON TABLE guilds IS 'Player guilds/clans with leveling and perks';
COMMENT ON TABLE guild_members IS 'Guild membership and roles';
COMMENT ON TABLE guild_chat_messages IS 'Guild-specific chat system';
COMMENT ON TABLE guild_wars IS 'Guild vs Guild competitions';
COMMENT ON FUNCTION create_guild IS 'Create a new guild and add owner as first member';

