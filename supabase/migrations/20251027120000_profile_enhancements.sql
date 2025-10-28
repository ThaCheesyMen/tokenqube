-- Add new profile customization columns
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS custom_status TEXT,
ADD COLUMN IF NOT EXISTS status_emoji TEXT DEFAULT '😎',
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'online',
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS banner_url TEXT,
ADD COLUMN IF NOT EXISTS accent_color TEXT DEFAULT '#5865F2',
ADD COLUMN IF NOT EXISTS profile_theme TEXT DEFAULT 'default',
ADD COLUMN IF NOT EXISTS profile_visibility TEXT DEFAULT 'public',
ADD COLUMN IF NOT EXISTS show_email BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS show_games BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS show_activity BOOLEAN DEFAULT TRUE;

-- Update any NULL status values to 'online' before adding constraint
UPDATE profiles SET status = 'online' WHERE status IS NULL OR status NOT IN ('online', 'idle', 'dnd', 'invisible');
UPDATE profiles SET profile_visibility = 'public' WHERE profile_visibility IS NULL OR profile_visibility NOT IN ('public', 'friends', 'private');
UPDATE profiles SET profile_theme = 'default' WHERE profile_theme IS NULL OR profile_theme NOT IN ('default', 'gradient', 'dark', 'custom');

-- Create storage bucket for profile images
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-images', 'profile-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for profile images
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can view profile images' AND tablename = 'objects'
  ) THEN
    CREATE POLICY "Anyone can view profile images"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'profile-images');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can upload profile images' AND tablename = 'objects'
  ) THEN
    CREATE POLICY "Authenticated users can upload profile images"
    ON storage.objects FOR INSERT
    WITH CHECK (
      bucket_id = 'profile-images' 
      AND auth.role() = 'authenticated'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own profile images' AND tablename = 'objects'
  ) THEN
    CREATE POLICY "Users can update own profile images"
    ON storage.objects FOR UPDATE
    USING (
      bucket_id = 'profile-images' 
      AND auth.uid()::text = (storage.foldername(name))[1]
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete own profile images' AND tablename = 'objects'
  ) THEN
    CREATE POLICY "Users can delete own profile images"
    ON storage.objects FOR DELETE
    USING (
      bucket_id = 'profile-images' 
      AND auth.uid()::text = (storage.foldername(name))[1]
    );
  END IF;
END $$;

-- Add check constraints (only if they don't exist)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'status_valid'
  ) THEN
    ALTER TABLE profiles
    ADD CONSTRAINT status_valid CHECK (status IN ('online', 'idle', 'dnd', 'invisible'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profile_visibility_valid'
  ) THEN
    ALTER TABLE profiles
    ADD CONSTRAINT profile_visibility_valid CHECK (profile_visibility IN ('public', 'friends', 'private'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profile_theme_valid'
  ) THEN
    ALTER TABLE profiles
    ADD CONSTRAINT profile_theme_valid CHECK (profile_theme IN ('default', 'gradient', 'dark', 'custom'));
  END IF;
END $$;

-- Function to update user status
CREATE OR REPLACE FUNCTION update_user_status(
  p_user_id UUID,
  p_status TEXT,
  p_custom_status TEXT DEFAULT NULL,
  p_status_emoji TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE profiles
  SET 
    status = p_status,
    custom_status = COALESCE(p_custom_status, custom_status),
    status_emoji = COALESCE(p_status_emoji, status_emoji),
    updated_at = NOW()
  WHERE id = p_user_id;
END;
$$;

-- Function to get user's visible profile data based on privacy settings
CREATE OR REPLACE FUNCTION get_visible_profile(
  p_profile_id UUID,
  p_viewer_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  username TEXT,
  avatar_url TEXT,
  banner_url TEXT,
  bio TEXT,
  custom_status TEXT,
  status_emoji TEXT,
  status TEXT,
  accent_color TEXT,
  profile_theme TEXT,
  email TEXT,
  total_tokens BIGINT,
  referral_code TEXT,
  level INTEGER,
  xp INTEGER,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_profile_visibility TEXT;
  v_are_friends BOOLEAN := FALSE;
BEGIN
  -- Get profile visibility
  SELECT profile_visibility INTO v_profile_visibility
  FROM profiles
  WHERE profiles.id = p_profile_id;

  -- Check if viewer is friends with profile owner
  IF p_viewer_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM friends
      WHERE (user_id = p_profile_id AND friend_id = p_viewer_id AND status = 'accepted')
         OR (user_id = p_viewer_id AND friend_id = p_profile_id AND status = 'accepted')
    ) INTO v_are_friends;
  END IF;

  -- Return profile data based on visibility rules
  RETURN QUERY
  SELECT 
    p.id,
    p.username,
    p.avatar_url,
    p.banner_url,
    CASE 
      WHEN v_profile_visibility = 'public' OR p_profile_id = p_viewer_id OR v_are_friends THEN p.bio
      ELSE NULL
    END as bio,
    p.custom_status,
    p.status_emoji,
    CASE 
      WHEN p.status = 'invisible' AND p_profile_id != p_viewer_id THEN 'offline'::TEXT
      ELSE p.status
    END as status,
    p.accent_color,
    p.profile_theme,
    CASE 
      WHEN p.show_email AND (v_profile_visibility = 'public' OR p_profile_id = p_viewer_id OR v_are_friends) THEN p.email
      ELSE NULL
    END as email,
    CASE 
      WHEN v_profile_visibility = 'public' OR p_profile_id = p_viewer_id OR v_are_friends THEN p.total_tokens
      ELSE NULL
    END as total_tokens,
    p.referral_code,
    p.level,
    p.xp,
    p.created_at
  FROM profiles p
  WHERE p.id = p_profile_id;
END;
$$;

-- Index for faster status lookups
CREATE INDEX IF NOT EXISTS idx_profiles_status ON profiles(status);
CREATE INDEX IF NOT EXISTS idx_profiles_visibility ON profiles(profile_visibility);

-- Comments
COMMENT ON COLUMN profiles.bio IS 'User bio/about me section (max 190 chars)';
COMMENT ON COLUMN profiles.custom_status IS 'Custom status message';
COMMENT ON COLUMN profiles.status IS 'User status: online, idle, dnd, invisible';
COMMENT ON COLUMN profiles.profile_visibility IS 'Who can view profile: public, friends, private';
COMMENT ON FUNCTION get_visible_profile IS 'Returns profile data respecting privacy settings';

