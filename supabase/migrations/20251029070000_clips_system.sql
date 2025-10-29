-- =====================================================
-- CLIPS SYSTEM
-- =====================================================

-- Clips Table
CREATE TABLE IF NOT EXISTS clips (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  game_name TEXT NOT NULL,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  duration INTEGER NOT NULL, -- in seconds
  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT false,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Clip Likes
CREATE TABLE IF NOT EXISTS clip_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clip_id UUID REFERENCES clips(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(clip_id, user_id)
);

-- Clip Bookmarks
CREATE TABLE IF NOT EXISTS clip_bookmarks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clip_id UUID REFERENCES clips(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(clip_id, user_id)
);

-- Clip Comments
CREATE TABLE IF NOT EXISTS clip_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clip_id UUID REFERENCES clips(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  comment_text TEXT NOT NULL,
  likes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_clips_user ON clips(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_clips_game ON clips(game_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_clips_trending ON clips(likes DESC, views DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_clip_likes_user ON clip_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_clip_likes_clip ON clip_likes(clip_id);
CREATE INDEX IF NOT EXISTS idx_clip_comments_clip ON clip_comments(clip_id, created_at DESC);

-- RLS Policies
ALTER TABLE clips ENABLE ROW LEVEL SECURITY;
ALTER TABLE clip_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE clip_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE clip_comments ENABLE ROW LEVEL SECURITY;

-- Clips Policies
DROP POLICY IF EXISTS "Anyone can view clips" ON clips;
CREATE POLICY "Anyone can view clips"
  ON clips FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can create clips" ON clips;
CREATE POLICY "Users can create clips"
  ON clips FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own clips" ON clips;
CREATE POLICY "Users can update their own clips"
  ON clips FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own clips" ON clips;
CREATE POLICY "Users can delete their own clips"
  ON clips FOR DELETE
  USING (auth.uid() = user_id);

-- Clip Likes Policies
DROP POLICY IF EXISTS "Anyone can view likes" ON clip_likes;
CREATE POLICY "Anyone can view likes"
  ON clip_likes FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can like clips" ON clip_likes;
CREATE POLICY "Users can like clips"
  ON clip_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can unlike clips" ON clip_likes;
CREATE POLICY "Users can unlike clips"
  ON clip_likes FOR DELETE
  USING (auth.uid() = user_id);

-- Clip Bookmarks Policies
DROP POLICY IF EXISTS "Users can view their bookmarks" ON clip_bookmarks;
CREATE POLICY "Users can view their bookmarks"
  ON clip_bookmarks FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can bookmark clips" ON clip_bookmarks;
CREATE POLICY "Users can bookmark clips"
  ON clip_bookmarks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can remove bookmarks" ON clip_bookmarks;
CREATE POLICY "Users can remove bookmarks"
  ON clip_bookmarks FOR DELETE
  USING (auth.uid() = user_id);

-- Clip Comments Policies
DROP POLICY IF EXISTS "Anyone can view comments" ON clip_comments;
CREATE POLICY "Anyone can view comments"
  ON clip_comments FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can comment on clips" ON clip_comments;
CREATE POLICY "Users can comment on clips"
  ON clip_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own comments" ON clip_comments;
CREATE POLICY "Users can update their own comments"
  ON clip_comments FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own comments" ON clip_comments;
CREATE POLICY "Users can delete their own comments"
  ON clip_comments FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger: Update clip likes count
CREATE OR REPLACE FUNCTION update_clip_likes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE clips SET likes = likes + 1 WHERE id = NEW.clip_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE clips SET likes = likes - 1 WHERE id = OLD.clip_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_clip_likes ON clip_likes;
CREATE TRIGGER trigger_update_clip_likes
  AFTER INSERT OR DELETE ON clip_likes
  FOR EACH ROW
  EXECUTE FUNCTION update_clip_likes();

-- Trigger: Update clip comments count
CREATE OR REPLACE FUNCTION update_clip_comments_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE clips SET comments_count = comments_count + 1 WHERE id = NEW.clip_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE clips SET comments_count = comments_count - 1 WHERE id = OLD.clip_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_clip_comments_count ON clip_comments;
CREATE TRIGGER trigger_update_clip_comments_count
  AFTER INSERT OR DELETE ON clip_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_clip_comments_count();

-- Done!
SELECT 'Clips system created successfully!' AS message;

