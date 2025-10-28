# 🚀 TokenQuest - Quick Start Guide

## ✅ **What's Been Implemented**

Your Rewards page now has **4 organized tabs**:

1. **Earn Tokens** ✅ - Shows gaming/playtime rewards (FULLY FUNCTIONAL)
2. **Achievements** ✅ - Platform achievements system (PLACEHOLDER - Needs DB Migration)
3. **Quests** ✅ - Daily/weekly quest system (PLACEHOLDER - Needs DB Migration)
4. **Spend Tokens** ✅ - Token spending options (PLACEHOLDER - Coming Soon)

---

## 🎯 **Current Status**

### Working Now:
- ✅ **Earn Tokens Tab** - Fully functional with:
  - Today's earnings stats
  - Total hours played
  - Recent playtime rewards
  - Recent gaming achievements  
  - Milestones achieved
  - Token rates by game tier

### Needs Database Setup:
- ⏳ **Achievements Tab** - Shows placeholder, needs migration
- ⏳ **Quests Tab** - Shows placeholder, needs migration
- ⏳ **Spend Tokens Tab** - Shows placeholder, coming soon

---

## 📦 **To Make Everything Work**

### Step 1: Run the Database Migration

You need to run this migration file in your Supabase dashboard:
```
supabase/migrations/20251027000000_comprehensive_features.sql
```

**How to run it:**
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Create a new query
4. Copy the entire contents of `20251027000000_comprehensive_features.sql`
5. Paste and click **Run**

This will create:
- `platform_achievements` table with 7 seeded achievements
- `user_achievements` table for progress tracking
- `quest_templates` table with 6 seeded quests
- `user_quests` table for active quests
- All necessary functions and triggers

### Step 2: Verify the Migration

After running the migration, check that these tables exist:
```sql
SELECT * FROM platform_achievements;
SELECT * FROM quest_templates;
```

You should see 7 achievements and 6 quests!

### Step 3: Test the Rewards Page

1. Navigate to **Rewards** in the sidebar
2. Click each tab:
   - **Earn Tokens** - Should show your gaming data
   - **Achievements** - Should now show real achievements!
   - **Quests** - Should now show available quests!
   - **Spend Tokens** - Placeholder for now

---

## 🎮 **How to Use**

### Achievements Tab:
- View all 7 platform achievements
- Filter by tier (Bronze → Diamond)
- Filter by status (All, Completed, In Progress, Locked)
- Track your progress on each achievement
- See token & XP rewards

### Quests Tab:
- See available daily/weekly quests
- Accept quests by clicking "Accept"
- View progress on active quests
- Claim rewards when complete
- Filter by quest type

### Earn Tokens Tab:
- Already working!
- Shows your gaming rewards
- Displays playtime, achievements, and milestones

### Spend Tokens Tab:
- Coming soon!
- Will have boosts, customizations, and social features

---

## 📝 **What Happens After Migration**

### Achievements You'll See:
1. **First Steps** (Bronze) - Complete your first task - +100 tokens
2. **Social Butterfly** (Silver) - Add 10 friends - +500 tokens
3. **Token Collector** (Gold) - Earn 10,000 tokens - +1,000 tokens
4. **Party Animal** (Gold) - Join 50 parties - +750 tokens
5. **Marketplace Mogul** (Platinum) - Complete 100 trades - +5,000 tokens
6. **Gaming Legend** (Platinum) - Play 1,000 hours - +10,000 tokens
7. **Achievement Hunter** (Diamond) - Unlock 100 gaming achievements - +20,000 tokens

### Quests You'll See:
1. **Daily Grind** (Easy) - Play 2 hours - +100 tokens
2. **Competitive Spirit** (Medium) - Win 3 matches - +150 tokens
3. **Social Hour** (Easy) - Chat with 5 friends - +80 tokens
4. **Token Master** (Weekly, Medium) - Earn 1,000 tokens - +500 tokens
5. **Party Leader** (Weekly, Hard) - Create 5 parties - +750 tokens
6. **Trader** (Weekly, Hard) - Complete 10 trades - +1,000 tokens

---

## 🔧 **Troubleshooting**

### "Achievements tab is empty"
- **Solution**: Run the database migration (`20251027000000_comprehensive_features.sql`)

### "Quests tab is empty"
- **Solution**: Run the database migration

### "Functions not found" errors
- **Solution**: Make sure the entire migration file was executed successfully

### Achievements aren't unlocking
- The unlocking happens server-side via triggers
- Make sure your `profiles` table has the required columns (level, xp, etc.)

---

## 🎨 **Design**

All tabs use the Discord dark theme:
- Background: `#36393f`
- Cards: `#2f3136`
- Borders: `#202225`
- Primary: `#5865F2`
- Text: White & gray shades

---

## 📊 **Files Modified**

1. **src/pages/Rewards.tsx** ✅
   - Added 3 new tab sections
   - Added achievement/quest logic
   - Integrated all reward types

2. **src/components/DiscordSidebar.tsx** ✅
   - Removed separate Achievement/Quest links
   - Clean unified navigation

3. **src/App.tsx** ✅
   - Removed standalone routes
   - Streamlined routing

---

## 🚀 **Next Steps**

1. ✅ Run the migration (most important!)
2. ✅ Test the Achievements tab
3. ✅ Test the Quests tab
4. ✅ Accept a quest and track progress
5. ⏳ Build out the Spend Tokens tab (future)

---

## 💡 **Tips**

- **Achievements unlock automatically** based on your actions
- **Quests expire** after their cooldown period
- **Progress tracking** updates in real-time
- **Token rewards** are awarded immediately upon completion

---

**Everything is ready to go! Just run that migration and you're set! 🎉**

---

**Need Help?**
- Check `IMPLEMENTATION_PROGRESS.md` for full technical details
- See `REWARDS_INTEGRATION_COMPLETE.md` for integration overview
- All migrations are in `supabase/migrations/`

