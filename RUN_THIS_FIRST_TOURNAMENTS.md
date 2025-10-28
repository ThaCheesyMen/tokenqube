# 🏆 **Fix Tournaments Schema - Run This First!**

## ❌ **The Error You're Seeing:**

```
ERROR: 42703: column "tournament_name" of relation "tournaments" does not exist
```

**Why:** Your tournaments table uses old column names (`name`, `format`, etc.) but the new official tournaments system expects new names (`tournament_name`, `tournament_type`, etc.).

---

## ✅ **The Fix - 2 Steps:**

### **Step 1: Fix the Schema** ⚠️ **RUN THIS FIRST!**

**File:** `FIX_TOURNAMENTS_SCHEMA.sql`

1. Open **Supabase Dashboard**
2. Go to **SQL Editor**
3. Copy and paste the ENTIRE contents of `FIX_TOURNAMENTS_SCHEMA.sql`
4. Click **Run**
5. You should see: `✅ Tournaments table schema updated successfully!`

**What it does:**
- Renames `name` → `tournament_name`
- Renames `format` → `tournament_type`
- Renames `entry_fee_tokens` → `entry_fee`
- Renames `prize_pool_tokens` → `prize_pool`
- Renames `start_date` → `tournament_start`
- Renames `registration_deadline` → `registration_end`
- Renames `created_by` → `organizer_id`
- Adds `is_official` column
- Adds `platform` column
- Adds `registration_start` column
- Converts `rules` from JSONB to TEXT (if needed)
- Creates indexes for performance

---

### **Step 2: Create Official Tournaments**

**File:** `CREATE_OFFICIAL_TOURNAMENTS.sql`

1. After Step 1 succeeds, go back to **SQL Editor**
2. Copy and paste the ENTIRE contents of `CREATE_OFFICIAL_TOURNAMENTS.sql`
3. Click **Run**
4. You should see 3 official tournaments created!

**What it does:**
- Creates `create_next_official_tournament()` function
- Creates `maintain_official_tournaments()` function
- Creates `update_tournament_status()` function
- Creates `get_official_tournaments()` RPC function
- Initializes 3 official tournaments:
  - **Fortnite Championship** (100 players, 5,000 tokens)
  - **Battlefield 6 Championship** (64 players, 3,000 tokens)
  - **CS:GO Championship** (32 players, 10,000 tokens)

---

## 🎯 **Verification**

After running both scripts, verify it worked:

```sql
-- Check tournaments table columns
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'tournaments'
ORDER BY column_name;

-- Check official tournaments
SELECT 
  tournament_name,
  game_name,
  max_participants,
  prize_pool,
  tournament_start,
  status,
  is_official
FROM tournaments 
WHERE is_official = TRUE;
```

You should see:
- ✅ All the new column names in the first query
- ✅ 3 official tournaments in the second query

---

## 🚀 **Frontend Testing**

After running the SQL scripts:

1. **Clear browser cache:**
   - Press `Ctrl + Shift + Delete`
   - Select "Cached images and files"
   - Click "Clear data"

2. **Hard refresh:**
   - Press `Ctrl + F5`

3. **Go to Tournaments page**

You should see:

✅ **Official TokenQube Tournaments section** at the top  
✅ **3 tournament cards** with yellow borders and "OFFICIAL" badges  
✅ **Live countdowns** showing time until tournament starts  
✅ **Prize pools** displayed in yellow  
✅ **Player counts** (e.g., "45/100")  
✅ **Register buttons** (yellow background)  

Then below:

✅ **Community Tournaments** section  
✅ **Filter tabs** (All, Upcoming, In Progress, Completed)  
✅ **User-created tournaments** (if any)  

---

## 🎨 **Create Tournament Testing**

Test the new Game Selector:

1. Click **"Create Tournament"** button
2. In the **"Game"** field, you should see a dropdown
3. Type "Fort" and watch it filter to Fortnite
4. Click on Fortnite's game card
5. The field should populate with "Fortnite"

**Features:**
- ✅ Game cards with cover images
- ✅ Platform badges (PC, Console, Mobile)
- ✅ Search/autocomplete
- ✅ Hover animations
- ✅ Click outside to close

---

## 🔧 **Troubleshooting**

### **Issue: "Column already exists" error**
**Solution:** That's fine! The script checks before adding columns. The script will skip columns that already exist.

### **Issue: "Tournaments not showing"**
**Solution:** 
1. Check browser console for errors
2. Make sure you ran `FIX_TOURNAMENTS_SCHEMA.sql` FIRST
3. Clear cache and hard refresh (Ctrl + F5)

### **Issue: "Countdown not updating"**
**Solution:**
1. Hard refresh (Ctrl + F5)
2. Check if tournament_start is in the future
3. Look in browser console for errors

### **Issue: "Game Selector not showing images"**
**Solution:** This is normal - some games use placeholder images. The selector still works!

---

## 📊 **How It Works**

### **Tournament Schedule:**
```
Every 6 Hours:
├── 00:00 - Tournament Starts
├── 06:00 - Tournament Starts
├── 12:00 - Tournament Starts
└── 18:00 - Tournament Starts
```

### **Auto-Maintenance:**
- System checks for upcoming official tournaments
- If none exist for a game, creates next 6-hour tournament
- Updates tournament statuses automatically
- Creates new tournaments when old ones complete

### **Tournament Lifecycle:**
```
upcoming → in_progress → completed
   ↓            ↓            ↓
Created    Starts now   6hrs later
```

---

## 🎉 **Expected Result**

After completing both steps, you'll have:

✅ **Fixed tournaments table schema**  
✅ **3 official tournaments running**  
✅ **Tournaments every 6 hours**  
✅ **Live countdown timers**  
✅ **Beautiful game selector**  
✅ **Auto-maintenance system**  
✅ **Premium UI with purple/yellow styling**  

---

## 🚨 **IMPORTANT: Run in Order!**

```
1️⃣ FIX_TOURNAMENTS_SCHEMA.sql  ← RUN THIS FIRST!
        ↓
2️⃣ CREATE_OFFICIAL_TOURNAMENTS.sql  ← THEN THIS!
        ↓
3️⃣ Clear cache & refresh browser
```

**DO NOT run them in reverse order!**

---

## 📝 **Summary**

**Files created:**
- `FIX_TOURNAMENTS_SCHEMA.sql` - Fixes column names
- `CREATE_OFFICIAL_TOURNAMENTS.sql` - Creates tournament system
- `src/components/GameSelector.tsx` - Game selection dropdown
- `src/components/TournamentCountdown.tsx` - Live countdown timer
- `src/pages/Tournaments.tsx` - Updated tournaments page
- `OFFICIAL_TOURNAMENTS_SYSTEM.md` - Full documentation

**What to do:**
1. Run `FIX_TOURNAMENTS_SCHEMA.sql` in Supabase
2. Run `CREATE_OFFICIAL_TOURNAMENTS.sql` in Supabase
3. Clear cache, refresh browser
4. Enjoy your official tournaments! 🏆

---

## 💬 **Need Help?**

If you see any errors:
1. Read the error message carefully
2. Check which step failed (Step 1 or Step 2)
3. Make sure you ran Step 1 before Step 2
4. Try running the verification queries above
5. Check browser console for frontend errors

**Common mistakes:**
- ❌ Running Step 2 before Step 1
- ❌ Not clearing browser cache
- ❌ Not doing a hard refresh (Ctrl + F5)

---

🎯 **You're all set! Run those SQL scripts and your tournament system will be live!**

