# ⚡ **Quick Start - Official Tournaments**

## 🚨 **You Got This Error:**
```
ERROR: column "tournament_name" does not exist
```

## ✅ **The Fix (2 Steps):**

### **Step 1: Fix Schema** ⭐
```
1. Open Supabase SQL Editor
2. Copy ALL of FIX_TOURNAMENTS_SCHEMA.sql
3. Paste in SQL Editor
4. Click Run
5. See: ✅ Tournaments table schema updated!
```

### **Step 2: Create Tournaments** ⭐
```
1. Still in SQL Editor
2. Copy ALL of CREATE_OFFICIAL_TOURNAMENTS.sql
3. Paste in SQL Editor
4. Click Run
5. See: 3 tournaments created!
```

### **Step 3: Test** ⭐
```
1. Clear cache: Ctrl + Shift + Delete
2. Hard refresh: Ctrl + F5
3. Go to Tournaments page
4. See: Official tournaments with countdowns!
```

---

## 📁 **Files to Run (In Order!):**

```
1️⃣ FIX_TOURNAMENTS_SCHEMA.sql      ← First!
        ↓
2️⃣ CREATE_OFFICIAL_TOURNAMENTS.sql ← Second!
        ↓
3️⃣ Clear cache & refresh           ← Third!
```

**⚠️ DO NOT SKIP STEP 1!**

---

## ✅ **Verify It Worked:**

### **In Supabase SQL Editor:**
```sql
-- Should show 3 tournaments
SELECT tournament_name, game_name, prize_pool, tournament_start 
FROM tournaments 
WHERE is_official = TRUE;
```

### **In Your App:**
- ✅ See "Official TokenQube Tournaments" section
- ✅ See 3 cards: Fortnite, Battlefield 6, CS:GO
- ✅ See yellow "OFFICIAL" badges
- ✅ See live countdowns (updating every second)
- ✅ See prize pools (5,000 | 3,000 | 10,000 tokens)
- ✅ See "Register" buttons

---

## 🐛 **Still Not Working?**

### **Problem: "Column does not exist"**
→ Run `FIX_TOURNAMENTS_SCHEMA.sql` first!

### **Problem: "Tournaments not showing"**
→ Clear cache (Ctrl+Shift+Del) and hard refresh (Ctrl+F5)

### **Problem: "Countdown not updating"**
→ Hard refresh (Ctrl+F5)

### **Problem: "Function does not exist"**
→ Run `CREATE_OFFICIAL_TOURNAMENTS.sql`

---

## 📖 **Read More:**

- `RUN_THIS_FIRST_TOURNAMENTS.md` - Detailed instructions
- `OFFICIAL_TOURNAMENTS_SYSTEM.md` - Full documentation
- `TOURNAMENTS_COMPLETE_SUMMARY.md` - Complete overview

---

## 🎯 **That's It!**

Run the 2 SQL scripts, clear cache, and you're done! 🏆

**Total time:** ~2 minutes

