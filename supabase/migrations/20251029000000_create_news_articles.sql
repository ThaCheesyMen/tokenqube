-- Create news_articles table
CREATE TABLE IF NOT EXISTS news_articles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('announcement', 'patch_notes', 'community', 'esports', 'streamer_live', 'update', 'event')),
  game_name TEXT,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  banner_url TEXT,
  link_url TEXT,
  is_pinned BOOLEAN DEFAULT false,
  is_published BOOLEAN DEFAULT true,
  views INTEGER DEFAULT 0,
  author_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_news_articles_published ON news_articles(is_published, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_articles_pinned ON news_articles(is_pinned, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_articles_category ON news_articles(category);

-- Enable RLS
ALTER TABLE news_articles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Everyone can view published articles
CREATE POLICY "Anyone can view published news articles"
  ON news_articles FOR SELECT
  USING (is_published = true);

-- Admins can do everything
CREATE POLICY "Admins can manage news articles"
  ON news_articles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin', 'developer', 'moderator')
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_news_articles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS news_articles_updated_at ON news_articles;
CREATE TRIGGER news_articles_updated_at
  BEFORE UPDATE ON news_articles
  FOR EACH ROW
  EXECUTE FUNCTION update_news_articles_updated_at();

-- Insert sample news article
INSERT INTO news_articles (title, content, category, game_name, is_pinned, views)
VALUES 
  ('Battlefield 6 Season 1 Starts October 28th', 
   'Get ready for Season 1: Tactical Warfare! New maps, weapons, specialists, and exclusive battle pass rewards. Mark your calendars for October 28th!',
   'announcement',
   'Battlefield 6',
   false,
   0),
  ('Welcome to QuestCord!', 
   'Start earning tokens by playing your favorite games. Connect your gaming accounts, complete quests, and climb the leaderboards!',
   'announcement',
   null,
   true,
   0)
ON CONFLICT DO NOTHING;

-- Verification
DO $$
BEGIN
  RAISE NOTICE '✅ News articles table created successfully!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '  ✓ Table: news_articles';
  RAISE NOTICE '  ✓ RLS policies enabled';
  RAISE NOTICE '  ✓ Sample articles added';
  RAISE NOTICE '========================================';
END $$;

