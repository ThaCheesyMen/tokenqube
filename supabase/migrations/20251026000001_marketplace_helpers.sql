-- Helper functions for marketplace

-- Increment item views
CREATE OR REPLACE FUNCTION increment_item_views(item_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE marketplace_items
  SET views = views + 1
  WHERE id = item_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get user's favorite items
CREATE OR REPLACE FUNCTION get_user_favorites(p_user_id uuid)
RETURNS TABLE (
  item_id uuid,
  item_name text,
  price_tokens integer,
  game_name text,
  images text[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    mi.id,
    mi.item_name,
    mi.price_tokens,
    mi.game_name,
    mi.images
  FROM marketplace_items mi
  INNER JOIN marketplace_favorites mf ON mi.id = mf.item_id
  WHERE mf.user_id = p_user_id
    AND mi.status = 'active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get seller stats
CREATE OR REPLACE FUNCTION get_seller_stats(p_seller_id uuid)
RETURNS json AS $$
DECLARE
  v_stats json;
BEGIN
  SELECT json_build_object(
    'total_sales', COALESCE(COUNT(*), 0),
    'total_earned', COALESCE(SUM(seller_receives), 0),
    'active_listings', (
      SELECT COUNT(*) FROM marketplace_items 
      WHERE seller_id = p_seller_id AND status = 'active'
    ),
    'average_rating', COALESCE(AVG(mr.rating), 0)
  )
  INTO v_stats
  FROM marketplace_transactions mt
  LEFT JOIN marketplace_reviews mr ON mt.id = mr.transaction_id
  WHERE mt.seller_id = p_seller_id
    AND mt.transaction_status = 'completed';
    
  RETURN v_stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Search marketplace items
CREATE OR REPLACE FUNCTION search_marketplace_items(
  p_search_query text DEFAULT NULL,
  p_game_name text DEFAULT NULL,
  p_item_type text DEFAULT NULL,
  p_min_price integer DEFAULT 0,
  p_max_price integer DEFAULT 999999,
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  seller_id uuid,
  game_name text,
  item_name text,
  item_description text,
  item_type text,
  price_tokens integer,
  images text[],
  views integer,
  favorites integer,
  seller_username text,
  created_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    mi.id,
    mi.seller_id,
    mi.game_name,
    mi.item_name,
    mi.item_description,
    mi.item_type,
    mi.price_tokens,
    mi.images,
    mi.views,
    mi.favorites,
    p.username as seller_username,
    mi.created_at
  FROM marketplace_items mi
  INNER JOIN profiles p ON mi.seller_id = p.id
  WHERE mi.status = 'active'
    AND (p_search_query IS NULL OR 
         mi.item_name ILIKE '%' || p_search_query || '%' OR
         mi.item_description ILIKE '%' || p_search_query || '%')
    AND (p_game_name IS NULL OR mi.game_name = p_game_name)
    AND (p_item_type IS NULL OR mi.item_type = p_item_type)
    AND mi.price_tokens BETWEEN p_min_price AND p_max_price
  ORDER BY mi.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

