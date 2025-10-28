-- Theme Customization System
-- Multiple color themes, patterns, custom accents

-- Add theme settings to user_preferences
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_preferences' 
    AND column_name = 'theme_settings'
  ) THEN
    ALTER TABLE user_preferences ADD COLUMN theme_settings JSONB DEFAULT '{
      "theme": "purple",
      "accent_color": "#8B5CF6",
      "background_pattern": "none",
      "layout_density": "comfortable",
      "font_size": "medium",
      "animations_enabled": true,
      "sidebar_position": "left"
    }'::jsonb;
  END IF;
END $$;

-- Create themes table
CREATE TABLE IF NOT EXISTS themes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  theme_name TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  primary_color TEXT NOT NULL,
  secondary_color TEXT NOT NULL,
  accent_color TEXT NOT NULL,
  background_color TEXT NOT NULL,
  surface_color TEXT NOT NULL,
  text_color TEXT NOT NULL,
  is_premium BOOLEAN DEFAULT FALSE,
  is_seasonal BOOLEAN DEFAULT FALSE,
  available_from TIMESTAMPTZ,
  available_until TIMESTAMPTZ,
  preview_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default themes
INSERT INTO themes (theme_name, display_name, primary_color, secondary_color, accent_color, background_color, surface_color, text_color, is_premium) VALUES
  ('purple', 'TokenQube Purple', '#8B5CF6', '#7C3AED', '#A78BFA', '#0f0f0f', '#1a1a1a', '#ffffff', false),
  ('blue', 'Ocean Blue', '#3B82F6', '#2563EB', '#60A5FA', '#0f1419', '#1a2332', '#ffffff', false),
  ('green', 'Forest Green', '#10B981', '#059669', '#34D399', '#0f1914', '#1a2e23', '#ffffff', false),
  ('pink', 'Sakura Pink', '#EC4899', '#DB2777', '#F472B6', '#190f14', '#2e1a23', '#ffffff', false),
  ('orange', 'Sunset Orange', '#F59E0B', '#D97706', '#FBBF24', '#19140f', '#2e271a', '#ffffff', false),
  ('red', 'Crimson Red', '#EF4444', '#DC2626', '#F87171', '#190f0f', '#2e1a1a', '#ffffff', false),
  ('teal', 'Teal Wave', '#14B8A6', '#0D9488', '#2DD4BF', '#0f1919', '#1a2e2e', '#ffffff', false),
  ('indigo', 'Deep Indigo', '#6366F1', '#4F46E5', '#818CF8', '#0f0f19', '#1a1a2e', '#ffffff', false),
  ('dark', 'Pure Dark', '#374151', '#1F2937', '#6B7280', '#000000', '#111111', '#ffffff', false),
  ('midnight', 'Midnight Purple', '#7C3AED', '#6D28D9', '#8B5CF6', '#0a0a0f', '#15151f', '#ffffff', true),
  ('gold', 'Royal Gold', '#F59E0B', '#B45309', '#FBBF24', '#19160f', '#2e2a1a', '#ffffff', true),
  ('cyberpunk', 'Cyberpunk', '#FF006E', '#8338EC', '#3A86FF', '#0a0014', '#1a0a2e', '#00F5FF', true);

-- Create background patterns table
CREATE TABLE IF NOT EXISTS background_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_name TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  pattern_type TEXT NOT NULL CHECK (pattern_type IN ('gradient', 'texture', 'animated', 'none')),
  pattern_data JSONB,
  is_premium BOOLEAN DEFAULT FALSE,
  preview_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert background patterns
INSERT INTO background_patterns (pattern_name, display_name, pattern_type, pattern_data, is_premium) VALUES
  ('none', 'Solid Color', 'none', '{}'::jsonb, false),
  ('dots', 'Subtle Dots', 'texture', '{"pattern": "radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px)", "size": "20px 20px"}'::jsonb, false),
  ('lines', 'Diagonal Lines', 'texture', '{"pattern": "repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.05) 10px, rgba(255,255,255,0.05) 20px)"}'::jsonb, false),
  ('grid', 'Grid', 'texture', '{"pattern": "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)", "size": "50px 50px"}'::jsonb, false),
  ('waves', 'Animated Waves', 'animated', '{"animation": "wave", "colors": ["primary", "secondary"]}'::jsonb, true),
  ('particles', 'Floating Particles', 'animated', '{"animation": "particles", "count": 50}'::jsonb, true),
  ('gradient', 'Gradient Flow', 'gradient', '{"colors": ["primary", "secondary", "accent"], "direction": "45deg"}'::jsonb, true);

-- Create user owned themes table
CREATE TABLE IF NOT EXISTS user_owned_themes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  theme_id UUID REFERENCES themes(id) ON DELETE CASCADE NOT NULL,
  pattern_id UUID REFERENCES background_patterns(id) ON DELETE CASCADE,
  purchased_at TIMESTAMPTZ DEFAULT NOW(),
  price_paid INTEGER DEFAULT 0,
  UNIQUE(user_id, theme_id)
);

-- Enable RLS
ALTER TABLE themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE background_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_owned_themes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "themes_select" ON themes FOR SELECT USING (
  NOT is_premium OR 
  EXISTS (
    SELECT 1 FROM user_owned_themes 
    WHERE user_id = auth.uid() AND theme_id = themes.id
  )
);

CREATE POLICY "background_patterns_select" ON background_patterns FOR SELECT USING (
  NOT is_premium OR 
  EXISTS (
    SELECT 1 FROM user_owned_themes 
    WHERE user_id = auth.uid() AND pattern_id = background_patterns.id
  )
);

CREATE POLICY "user_owned_themes_select" ON user_owned_themes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "user_owned_themes_insert" ON user_owned_themes FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Function to purchase theme
CREATE OR REPLACE FUNCTION purchase_theme(
  p_user_id UUID,
  p_theme_id UUID,
  p_pattern_id UUID DEFAULT NULL,
  p_price INTEGER DEFAULT 5000
)
RETURNS BOOLEAN AS $$
DECLARE
  v_current_balance INTEGER;
BEGIN
  -- Check if user already owns it
  IF EXISTS (
    SELECT 1 FROM user_owned_themes 
    WHERE user_id = p_user_id AND theme_id = p_theme_id
  ) THEN
    RAISE EXCEPTION 'Theme already owned';
  END IF;

  -- Check balance
  SELECT token_balance INTO v_current_balance
  FROM profiles
  WHERE id = p_user_id;

  IF v_current_balance < p_price THEN
    RAISE EXCEPTION 'Insufficient tokens';
  END IF;

  -- Deduct tokens
  UPDATE profiles
  SET token_balance = token_balance - p_price
  WHERE id = p_user_id;

  -- Add theme to user
  INSERT INTO user_owned_themes (user_id, theme_id, pattern_id, price_paid)
  VALUES (p_user_id, p_theme_id, p_pattern_id, p_price);

  -- Create notification
  PERFORM create_notification_from_template(
    p_user_id,
    'token_received',
    jsonb_build_object(
      'tokens', -p_price,
      'source', 'theme purchase'
    )
  );

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to apply theme
CREATE OR REPLACE FUNCTION apply_theme(
  p_user_id UUID,
  p_theme_name TEXT,
  p_pattern_name TEXT DEFAULT 'none'
)
RETURNS VOID AS $$
DECLARE
  v_theme RECORD;
  v_pattern RECORD;
  v_theme_settings JSONB;
BEGIN
  -- Get theme
  SELECT * INTO v_theme FROM themes WHERE theme_name = p_theme_name;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Theme not found';
  END IF;

  -- Check if user owns premium theme
  IF v_theme.is_premium THEN
    IF NOT EXISTS (
      SELECT 1 FROM user_owned_themes 
      WHERE user_id = p_user_id AND theme_id = v_theme.id
    ) THEN
      RAISE EXCEPTION 'Theme not owned';
    END IF;
  END IF;

  -- Get pattern
  SELECT * INTO v_pattern FROM background_patterns WHERE pattern_name = p_pattern_name;
  
  -- Build theme settings
  SELECT theme_settings INTO v_theme_settings
  FROM user_preferences
  WHERE user_id = p_user_id;

  IF v_theme_settings IS NULL THEN
    v_theme_settings := '{}'::jsonb;
  END IF;

  v_theme_settings := jsonb_set(v_theme_settings, '{theme}', to_jsonb(p_theme_name));
  v_theme_settings := jsonb_set(v_theme_settings, '{accent_color}', to_jsonb(v_theme.accent_color));
  v_theme_settings := jsonb_set(v_theme_settings, '{background_pattern}', to_jsonb(p_pattern_name));

  -- Update user preferences
  UPDATE user_preferences
  SET theme_settings = v_theme_settings
  WHERE user_id = p_user_id;

  -- Create if not exists
  IF NOT FOUND THEN
    INSERT INTO user_preferences (user_id, theme_settings)
    VALUES (p_user_id, v_theme_settings);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get available themes for user
CREATE OR REPLACE FUNCTION get_available_themes(
  p_user_id UUID
)
RETURNS TABLE(
  id UUID,
  theme_name TEXT,
  display_name TEXT,
  primary_color TEXT,
  accent_color TEXT,
  is_premium BOOLEAN,
  is_owned BOOLEAN,
  preview_url TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.theme_name,
    t.display_name,
    t.primary_color,
    t.accent_color,
    t.is_premium,
    EXISTS (
      SELECT 1 FROM user_owned_themes uot 
      WHERE uot.user_id = p_user_id AND uot.theme_id = t.id
    ) as is_owned,
    t.preview_url
  FROM themes t
  WHERE NOT t.is_seasonal 
    OR (t.available_from IS NULL OR t.available_from <= NOW())
    AND (t.available_until IS NULL OR t.available_until >= NOW())
  ORDER BY t.is_premium, t.display_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_themes_premium ON themes(is_premium);
CREATE INDEX IF NOT EXISTS idx_themes_seasonal ON themes(is_seasonal, available_from, available_until);
CREATE INDEX IF NOT EXISTS idx_user_owned_themes_user ON user_owned_themes(user_id);

COMMENT ON TABLE themes IS 'Available color themes for the application';
COMMENT ON TABLE background_patterns IS 'Background patterns and animations';
COMMENT ON TABLE user_owned_themes IS 'Track premium themes purchased by users';
COMMENT ON FUNCTION purchase_theme IS 'Purchase a premium theme with tokens';
COMMENT ON FUNCTION apply_theme IS 'Apply a theme to user preferences';

