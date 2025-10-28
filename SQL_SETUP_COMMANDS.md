# 🗄️ SQL Setup Commands - Complete Guide

## Step 1: Run Migrations

### Option A: Using Supabase CLI (Recommended)
```bash
cd C:\Users\ronan\Desktop\tokenquest

# Push all migrations
supabase db push
```

### Option B: Manual SQL Execution
Run these files in order in your Supabase SQL Editor:

1. `supabase/migrations/20251026000000_gaming_rewards_marketplace.sql`
2. `supabase/migrations/20251026000001_marketplace_helpers.sql`

---

## Step 2: Verify Installation

```sql
-- Check all tables were created
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'game_tiers',
  'playtime_rewards',
  'playtime_milestones',
  'user_milestones',
  'achievement_multipliers',
  'competitive_matches',
  'marketplace_items',
  'marketplace_transactions',
  'marketplace_favorites',
  'marketplace_reviews',
  'user_marketplace_stats'
)
ORDER BY table_name;

-- Should return 11 rows
```

---

## Step 3: View Initial Data

### Game Tiers (Token Rates)
```sql
SELECT game_name, tier, tokens_per_hour 
FROM game_tiers 
ORDER BY tokens_per_hour DESC, game_name;
```

**Expected Output:**
```
game_name              | tier | tokens_per_hour
-----------------------|------|----------------
Apex Legends           | 1    | 5
Call of Duty: Warzone  | 1    | 5
Counter-Strike 2       | 1    | 5
CS:GO                  | 1    | 5
Dota 2                 | 1    | 5
Fortnite               | 1    | 5
League of Legends      | 1    | 5
Valorant               | 1    | 5
Destiny 2              | 2    | 3
Minecraft              | 2    | 3
Overwatch 2            | 2    | 3
Rainbow Six Siege      | 2    | 3
Roblox                 | 2    | 3
Rocket League          | 2    | 3
Warframe               | 2    | 3
Other                  | 3    | 2
```

### Playtime Milestones
```sql
SELECT milestone_name, hours_required, bonus_tokens, badge_icon 
FROM playtime_milestones 
ORDER BY hours_required;
```

**Expected Output:**
```
milestone_name    | hours_required | bonus_tokens | badge_icon
------------------|----------------|--------------|------------
Casual Player     | 10             | 50           | 🎮
Dedicated Gamer   | 50             | 300          | 🎯
Hardcore Player   | 100            | 750          | 🔥
Gaming Legend     | 500            | 5000         | 👑
Master Gamer      | 1000           | 15000        | 💎
```

### Achievement Multipliers
```sql
SELECT rarity, base_tokens, description 
FROM achievement_multipliers 
ORDER BY base_tokens;
```

**Expected Output:**
```
rarity     | base_tokens | description
-----------|-------------|------------------------------------------
common     | 10          | Common achievements (>50% unlock rate)
uncommon   | 25          | Uncommon achievements (25-50% unlock rate)
rare       | 50          | Rare achievements (10-25% unlock rate)
epic       | 100         | Epic achievements (5-10% unlock rate)
legendary  | 250         | Legendary achievements (<5% unlock rate)
```

---

## Step 4: Test Functions

### Test 1: Award Playtime Tokens

```sql
-- Get a test user and gaming account
SELECT id as user_id FROM profiles LIMIT 1;
SELECT id as gaming_account_id FROM gaming_accounts LIMIT 1;

-- Award tokens for 2 hours of Fortnite (Tier 1 = 5 tokens/hour)
SELECT award_playtime_tokens(
  'YOUR_USER_ID'::uuid,
  'YOUR_GAMING_ACCOUNT_ID'::uuid,
  'Fortnite',
  2.0,  -- hours played
  5     -- tokens per hour
);

-- Expected result: {"success": true, "tokens_earned": 10}

-- Verify the reward was recorded
SELECT * FROM playtime_rewards 
WHERE user_id = 'YOUR_USER_ID'::uuid 
ORDER BY created_at DESC 
LIMIT 1;

-- Verify tokens were added
SELECT token_balance, total_earned 
FROM profiles 
WHERE id = 'YOUR_USER_ID'::uuid;
```

### Test 2: Check Milestones

```sql
-- Check if user reached 10-hour milestone
SELECT check_playtime_milestones(
  'YOUR_USER_ID'::uuid,
  'Fortnite',
  12.0  -- total hours played
);

-- Expected result: {"success": true, "milestones_achieved": 1, "tokens_awarded": 50}

-- Verify milestone was recorded
SELECT * FROM user_milestones 
WHERE user_id = 'YOUR_USER_ID'::uuid;
```

### Test 3: Create Marketplace Item

```sql
-- Create a test listing
INSERT INTO marketplace_items (
  seller_id,
  game_name,
  item_name,
  item_description,
  item_type,
  price_tokens,
  platform,
  images,
  condition
) VALUES (
  'YOUR_USER_ID'::uuid,
  'CS:GO',
  'AWP Dragon Lore (Field-Tested)',
  'Rare AWP skin in excellent condition. One of the most sought-after skins in CS:GO.',
  'weapon',
  5000,
  'Steam',
  ARRAY['https://example.com/awp-dragon-lore.jpg'],
  'like_new'
) RETURNING *;
```

### Test 4: Purchase Item

```sql
-- Get item ID from previous insert
SELECT id FROM marketplace_items WHERE item_name LIKE '%Dragon Lore%' LIMIT 1;

-- Purchase the item (use a different user as buyer)
SELECT purchase_marketplace_item(
  'ITEM_ID'::uuid,
  'BUYER_USER_ID'::uuid
);

-- Expected result: {"success": true, "transaction_id": "..."}

-- Verify the transaction
SELECT 
  mt.*,
  buyer.username as buyer_name,
  seller.username as seller_name,
  mi.item_name
FROM marketplace_transactions mt
JOIN profiles buyer ON mt.buyer_id = buyer.id
JOIN profiles seller ON mt.seller_id = seller.id
JOIN marketplace_items mi ON mt.item_id = mi.id
ORDER BY mt.created_at DESC
LIMIT 1;
```

---

## Step 5: Add More Game Tiers (Optional)

If you want to add more games:

```sql
INSERT INTO game_tiers (game_name, tier, tokens_per_hour) VALUES
  ('Grand Theft Auto V', 1, 5),
  ('World of Warcraft', 1, 5),
  ('Final Fantasy XIV', 1, 5),
  ('Lost Ark', 2, 3),
  ('Path of Exile', 2, 3),
  ('Genshin Impact', 2, 3),
  ('Terraria', 3, 2),
  ('Stardew Valley', 3, 2),
  ('Among Us', 3, 2)
ON CONFLICT (game_name) DO NOTHING;
```

---

## Step 6: Create Sample Marketplace Items

For testing the marketplace:

```sql
-- Sample items for different games
INSERT INTO marketplace_items (seller_id, game_name, item_name, item_description, item_type, price_tokens, platform, images) VALUES
  (
    (SELECT id FROM profiles LIMIT 1),
    'Fortnite',
    '1000 V-Bucks',
    'Fortnite in-game currency. Delivered via gift code.',
    'currency',
    950,
    'Epic Games',
    ARRAY['https://example.com/vbucks.jpg']
  ),
  (
    (SELECT id FROM profiles LIMIT 1),
    'Valorant',
    'Reaver Vandal Skin',
    'Legendary weapon skin with custom animations and sound effects.',
    'skin',
    2500,
    'Riot Games',
    ARRAY['https://example.com/reaver-vandal.jpg']
  ),
  (
    (SELECT id FROM profiles LIMIT 1),
    'Minecraft',
    'Premium Account',
    'Full Minecraft Java Edition account with username change available.',
    'account',
    3000,
    'Mojang',
    ARRAY['https://example.com/minecraft-account.jpg']
  ),
  (
    (SELECT id FROM profiles LIMIT 1),
    'Roblox',
    '800 Robux',
    'Roblox currency delivered instantly via gift card code.',
    'currency',
    750,
    'Roblox',
    ARRAY['https://example.com/robux.jpg']
  ),
  (
    (SELECT id FROM profiles LIMIT 1),
    'CS:GO',
    'Karambit Fade',
    'Factory New condition. Beautiful fade pattern.',
    'weapon',
    15000,
    'Steam',
    ARRAY['https://example.com/karambit-fade.jpg']
  )
ON CONFLICT DO NOTHING;
```

---

## Step 7: Create Sample Achievements

For testing achievement rewards:

```sql
INSERT INTO gaming_achievements (
  user_id,
  gaming_account_id,
  achievement_name,
  achievement_description,
  tokens_awarded,
  platform,
  rarity,
  game_name,
  achievement_id
) VALUES
  (
    (SELECT id FROM profiles LIMIT 1),
    (SELECT id FROM gaming_accounts LIMIT 1),
    'First Victory',
    'Win your first match',
    10,
    'Steam',
    'common',
    'Fortnite',
    'achievement_first_win'
  ),
  (
    (SELECT id FROM profiles LIMIT 1),
    (SELECT id FROM gaming_accounts LIMIT 1),
    'Legendary Warrior',
    'Reach max level in all skill trees',
    250,
    'Steam',
    'legendary',
    'Fortnite',
    'achievement_max_level'
  )
ON CONFLICT DO NOTHING;
```

---

## Step 8: Verify Everything Works

### Check User Balance
```sql
SELECT 
  username,
  token_balance,
  total_earned,
  total_spent
FROM profiles
WHERE id = 'YOUR_USER_ID'::uuid;
```

### Check Recent Transactions
```sql
SELECT 
  type,
  amount,
  description,
  created_at
FROM transactions
WHERE user_id = 'YOUR_USER_ID'::uuid
ORDER BY created_at DESC
LIMIT 10;
```

### Check Marketplace Activity
```sql
-- Active listings
SELECT COUNT(*) as active_listings 
FROM marketplace_items 
WHERE status = 'active';

-- Total transactions
SELECT COUNT(*) as total_transactions 
FROM marketplace_transactions;

-- Top sellers
SELECT 
  p.username,
  COUNT(*) as sales,
  SUM(mt.seller_receives) as total_earned
FROM marketplace_transactions mt
JOIN profiles p ON mt.seller_id = p.id
WHERE mt.transaction_status = 'completed'
GROUP BY p.username
ORDER BY total_earned DESC
LIMIT 10;
```

---

## 🎯 Quick Reference

### Award Tokens Manually
```sql
-- Playtime reward
SELECT award_playtime_tokens(user_id, gaming_account_id, 'Game Name', hours, rate);

-- Achievement reward (insert directly)
INSERT INTO gaming_achievements (user_id, gaming_account_id, achievement_name, achievement_description, tokens_awarded, platform, rarity, game_name)
VALUES (user_id, gaming_account_id, 'Achievement Name', 'Description', tokens, 'Platform', 'rarity', 'Game');

-- Update user balance directly
UPDATE profiles SET token_balance = token_balance + amount WHERE id = user_id;
```

### Check User Stats
```sql
-- Gaming stats
SELECT 
  (SELECT COUNT(*) FROM playtime_rewards WHERE user_id = 'USER_ID') as playtime_rewards,
  (SELECT SUM(hours_played) FROM playtime_rewards WHERE user_id = 'USER_ID') as total_hours,
  (SELECT COUNT(*) FROM gaming_achievements WHERE user_id = 'USER_ID') as achievements,
  (SELECT COUNT(*) FROM user_milestones WHERE user_id = 'USER_ID') as milestones;

-- Marketplace stats
SELECT 
  (SELECT COUNT(*) FROM marketplace_items WHERE seller_id = 'USER_ID') as listings,
  (SELECT COUNT(*) FROM marketplace_transactions WHERE buyer_id = 'USER_ID') as purchases,
  (SELECT COUNT(*) FROM marketplace_transactions WHERE seller_id = 'USER_ID') as sales;
```

---

## ✅ Success Checklist

- [ ] All tables created (11 tables)
- [ ] Game tiers populated (16 games)
- [ ] Milestones created (5 milestones)
- [ ] Achievement multipliers set (5 rarities)
- [ ] Functions working (3 main functions)
- [ ] Sample data added (optional)
- [ ] Test transactions successful
- [ ] No RLS errors
- [ ] Pages loading correctly
- [ ] Navigation updated

---

## 🐛 Common Issues

### Issue: "relation does not exist"
**Solution:** Run the migrations again
```sql
-- Check if table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'game_tiers'
);
```

### Issue: "permission denied"
**Solution:** Use service role key or check RLS policies
```sql
-- Temporarily disable RLS for testing
ALTER TABLE marketplace_items DISABLE ROW LEVEL SECURITY;
```

### Issue: "function does not exist"
**Solution:** Check function was created
```sql
SELECT proname FROM pg_proc WHERE proname LIKE '%playtime%';
```

---

## 🎉 You're Done!

Your database is now fully set up with:
- ✅ Gaming rewards system
- ✅ Marketplace functionality
- ✅ All helper functions
- ✅ Sample data (if added)

Users can now earn tokens by playing games and trade items in the marketplace!

