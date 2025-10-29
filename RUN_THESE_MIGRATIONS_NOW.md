# 🗄️ DATABASE MIGRATIONS - RUN THESE NOW!

**Time Required:** 15 minutes  
**Importance:** ⚠️ CRITICAL - Required for marketplace, auctions, and trades to work!

---

## 📋 STEP-BY-STEP GUIDE:

### Step 1: Go to Supabase Dashboard
1. Open https://supabase.com/dashboard
2. Select your project: **TokenQuest**
3. Click **SQL Editor** in the left sidebar

---

### Step 2: Run Migration #1 - Storage Bucket

**File:** `supabase/migrations/20251029050000_create_storage_bucket.sql`

**Copy and paste this SQL:**

```sql
-- =====================================================
-- SUPABASE STORAGE FOR MARKETPLACE IMAGES
-- =====================================================

-- Create marketplace-images bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'marketplace-images',
  'marketplace-images',
  true,
  5242880, -- 5MB
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Note: RLS is already enabled on storage.objects by default in Supabase
-- We just need to create the policies

-- Drop existing policies if they exist (to allow re-running)
DROP POLICY IF EXISTS "Anyone can view marketplace images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload marketplace images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own marketplace images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own marketplace images" ON storage.objects;

-- Policy: Anyone can view marketplace images (public bucket)
CREATE POLICY "Anyone can view marketplace images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'marketplace-images');

-- Policy: Authenticated users can upload marketplace images
CREATE POLICY "Authenticated users can upload marketplace images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'marketplace-images' AND
    auth.uid() IS NOT NULL
  );

-- Policy: Users can update their own images
CREATE POLICY "Users can update their own marketplace images"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'marketplace-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Policy: Users can delete their own images
CREATE POLICY "Users can delete their own marketplace images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'marketplace-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Done!
SELECT 'Marketplace storage bucket created successfully!' AS message;
```

**Click "Run"** ✅

**Expected Output:** "Marketplace storage bucket created successfully!"

---

### Step 3: Run Migration #2 - Trade System & Helpers

**File:** `supabase/migrations/20251029060000_trade_system_and_helpers.sql`

**Copy and paste this SQL:**

```sql
-- =====================================================
-- TRADE SYSTEM & HELPER FUNCTIONS
-- =====================================================

-- Trade Offers Table
CREATE TABLE IF NOT EXISTS trade_offers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  to_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  from_items TEXT[] DEFAULT '{}',
  to_items TEXT[] DEFAULT '{}',
  from_tokens INTEGER DEFAULT 0,
  to_tokens INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'declined', 'cancelled')),
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trade Transactions (history)
CREATE TABLE IF NOT EXISTS trade_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trade_id UUID REFERENCES trade_offers(id) ON DELETE SET NULL,
  from_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  to_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  from_items TEXT[] DEFAULT '{}',
  to_items TEXT[] DEFAULT '{}',
  from_tokens INTEGER DEFAULT 0,
  to_tokens INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_trade_offers_from_user ON trade_offers(from_user_id, status);
CREATE INDEX IF NOT EXISTS idx_trade_offers_to_user ON trade_offers(to_user_id, status);
CREATE INDEX IF NOT EXISTS idx_trade_transactions_from ON trade_transactions(from_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trade_transactions_to ON trade_transactions(to_user_id, created_at DESC);

-- RLS Policies
ALTER TABLE trade_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their trades" ON trade_offers;
CREATE POLICY "Users can view their trades"
  ON trade_offers FOR SELECT
  USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

DROP POLICY IF EXISTS "Users can create trade offers" ON trade_offers;
CREATE POLICY "Users can create trade offers"
  ON trade_offers FOR INSERT
  WITH CHECK (auth.uid() = from_user_id);

DROP POLICY IF EXISTS "Users can update their trades" ON trade_offers;
CREATE POLICY "Users can update their trades"
  ON trade_offers FOR UPDATE
  USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

DROP POLICY IF EXISTS "Users can view their trade history" ON trade_transactions;
CREATE POLICY "Users can view their trade history"
  ON trade_transactions FOR SELECT
  USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

-- Helper Function: Transfer Tokens
CREATE OR REPLACE FUNCTION transfer_tokens(
  from_user UUID,
  to_user UUID,
  amount INTEGER
) RETURNS VOID AS $$
BEGIN
  -- Deduct from sender
  UPDATE profiles
  SET token_balance = token_balance - amount
  WHERE id = from_user AND token_balance >= amount;
  
  -- Add to receiver
  UPDATE profiles
  SET token_balance = token_balance + amount
  WHERE id = to_user;
  
  -- Log transaction
  INSERT INTO token_transactions (user_id, amount, type, source, description)
  VALUES 
    (from_user, -amount, 'spend', 'trade', 'Trade transfer'),
    (to_user, amount, 'earn', 'trade', 'Trade received');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper Function: Add Tokens (if not exists)
CREATE OR REPLACE FUNCTION add_tokens(user_id UUID, amount INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE profiles
  SET token_balance = token_balance + amount,
      total_earned = total_earned + amount
  WHERE id = user_id;
  
  INSERT INTO token_transactions (user_id, amount, type, source)
  VALUES (user_id, amount, 'earn', 'marketplace');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Price History Table (for marketplace analytics)
CREATE TABLE IF NOT EXISTS marketplace_price_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id UUID REFERENCES marketplace_items(id) ON DELETE CASCADE,
  game_name TEXT NOT NULL,
  item_name TEXT NOT NULL,
  item_type TEXT,
  price_tokens INTEGER NOT NULL,
  transaction_type TEXT CHECK (transaction_type IN ('sale', 'listing', 'auction')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_price_history_item ON marketplace_price_history(item_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_price_history_game ON marketplace_price_history(game_name, created_at DESC);

ALTER TABLE marketplace_price_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view price history" ON marketplace_price_history;
CREATE POLICY "Anyone can view price history"
  ON marketplace_price_history FOR SELECT
  USING (true);

-- Function: Get Price History for an Item
CREATE OR REPLACE FUNCTION get_price_history(p_item_name TEXT, p_game_name TEXT, days INTEGER DEFAULT 30)
RETURNS TABLE (
  date DATE,
  avg_price DECIMAL,
  min_price INTEGER,
  max_price INTEGER,
  sales_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    DATE(created_at) as date,
    AVG(price_tokens)::DECIMAL as avg_price,
    MIN(price_tokens) as min_price,
    MAX(price_tokens) as max_price,
    COUNT(*) as sales_count
  FROM marketplace_price_history
  WHERE item_name ILIKE p_item_name
    AND game_name ILIKE p_game_name
    AND created_at >= NOW() - (days || ' days')::INTERVAL
  GROUP BY DATE(created_at)
  ORDER BY date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Log Price History on Sale
CREATE OR REPLACE FUNCTION log_price_history()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.transaction_status = 'completed' THEN
    INSERT INTO marketplace_price_history (
      item_id, game_name, item_name, item_type, price_tokens, transaction_type
    )
    SELECT 
      mi.id, mi.game_name, mi.item_name, mi.item_type, NEW.price_tokens, 'sale'
    FROM marketplace_items mi
    WHERE mi.id = NEW.item_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_log_price_history ON marketplace_transactions;
CREATE TRIGGER trigger_log_price_history
  AFTER UPDATE ON marketplace_transactions
  FOR EACH ROW
  EXECUTE FUNCTION log_price_history();

-- Done!
SELECT 'Trade system and helper functions created successfully!' AS message;
```

**Click "Run"** ✅

**Expected Output:** "Trade system and helper functions created successfully!"

---

## ✅ VERIFICATION:

After running both migrations, verify they worked:

### Check Storage:
1. Go to **Storage** in Supabase sidebar
2. You should see `marketplace-images` bucket
3. Click it - should be empty (ready for uploads!)

### Check Tables:
1. Go to **Table Editor** in Supabase sidebar
2. You should see these NEW tables:
   - `trade_offers`
   - `trade_transactions`
   - `marketplace_price_history`

### Check Functions:
1. Go to **Database** → **Functions**
2. You should see:
   - `transfer_tokens`
   - `add_tokens`
   - `get_price_history`
   - `log_price_history`

---

## 🎉 SUCCESS INDICATORS:

✅ Storage bucket created  
✅ Trade tables created  
✅ Price history table created  
✅ Helper functions created  
✅ RLS policies active  
✅ Triggers enabled  

---

## 🚨 IF YOU GET ERRORS:

### Error: "relation already exists"
**Solution:** Tables already exist! You're good to go. ✅

### Error: "permission denied"
**Solution:** Make sure you're the project owner or have admin access.

### Error: "function already exists"
**Solution:** Functions already created! ✅

### Error: "bucket already exists"
**Solution:** Bucket already created! ✅

---

## 🎯 WHAT HAPPENS NEXT:

Once migrations are complete:
1. **Marketplace image uploads** will work
2. **Trade system** will function
3. **Price tracking** will log automatically
4. **Auctions** will have all data structures

---

## 📞 NEED HELP?

If you encounter ANY issues:
1. Take a screenshot of the error
2. Copy the error message
3. Let me know - I'll help debug!

---

**Ready? Run the migrations now, then we'll build the Analytics Dashboard, Clips System, and Stripe Integration!** 🚀

