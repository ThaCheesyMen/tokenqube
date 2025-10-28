# 🚨 URGENT FIX STEPS - Streak & Transactions Still Broken

## Current Issues:
1. ❌ Streak still shows 0
2. ❌ Daily login still shows `-10` tokens

## 🔍 Step 1: Run Diagnostic SQL

**Copy and paste this into Supabase SQL Editor:**
```sql
-- Check if columns exist
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name IN ('login_streak', 'last_daily_login');
```

**Expected Result:**
```
login_streak
last_daily_login
```

**If you DON'T see both columns** → Run `DIAGNOSE_AND_FIX_NOW.sql`

---

## 🔧 Step 2: Run the Complete Fix

**In Supabase SQL Editor:**
1. Open `DIAGNOSE_AND_FIX_NOW.sql`
2. **Copy the ENTIRE file**
3. Paste into SQL Editor
4. Click **"Run"**
5. Watch for messages in the "Results" panel

**You MUST see:**
```
✅ ALL FIXES APPLIED SUCCESSFULLY!
✅ 1. Columns added to profiles table
✅ 2. add_tokens function fixed
✅ 3. check_daily_login function fixed
✅ 4. gaming_activity RLS policies fixed
```

**If you see errors** → Screenshot and share them

---

## 🧪 Step 3: Test Manually

**In Supabase SQL Editor, run:**
```sql
-- Replace with YOUR user ID
SELECT check_daily_login('4c4ef0a4-6689-46df-b215-37a9d2bcc089'::UUID);
```

**Expected Result:**
```json
{
  "success": true,
  "message": "Daily login claimed!",
  "streak": 1,
  "tokens": 50
}
```

**Then check your transactions:**
```sql
SELECT created_at, amount, type, category, description
FROM token_transactions
WHERE user_id = '4c4ef0a4-6689-46df-b215-37a9d2bcc089'
ORDER BY created_at DESC
LIMIT 5;
```

**You should see:**
- amount: `50` (or higher)
- type: `earn`
- category: `reward`
- description: "Daily login reward (streak: 1)"

---

## 🧹 Step 4: Clear Browser Cache

**CRITICAL!** The old function might be cached.

### Option A: Clear All Data (RECOMMENDED)
1. Press `F12` (open DevTools)
2. Right-click the refresh button
3. Select "Empty Cache and Hard Reload"

### Option B: Clear Storage
1. Press `F12`
2. Go to "Application" tab
3. Click "Clear site data"
4. Refresh page

### Option C: Nuclear Option
1. Press `Ctrl + Shift + Delete`
2. Select "All time"
3. Check "Cached images and files"
4. Clear data
5. Close and reopen browser

---

## 🔍 Step 5: Check Browser Console

After clearing cache and reloading:

1. Press `F12` → Console tab
2. Look for this log:
   ```
   📊 Dashboard: Login streak from DB: 1 {login_streak: 1, ...}
   ```

**If you see `login_streak: 0`** or **error about column not existing**:
- The SQL didn't run properly
- Go back to Step 2

**If you see `login_streak: null`**:
- Column exists but not set
- Claim daily login reward
- Should set it to 1

---

## 🐛 Step 6: Debug Transaction Issue

If daily login STILL shows `-10`:

**Run this in Supabase SQL Editor:**
```sql
-- Check the actual function definition
SELECT pg_get_functiondef(oid) 
FROM pg_proc 
WHERE proname = 'check_daily_login';
```

**Search for this in the output:**
```sql
PERFORM add_tokens(
  p_user_id,
  v_tokens_reward,
  'daily_login',
```

**If you DON'T see `PERFORM add_tokens`**:
- The function wasn't updated
- Run `DIAGNOSE_AND_FIX_NOW.sql` again
- Make sure you see "✅ check_daily_login function recreated"

---

## 🎯 Quick Manual Fix (If SQL Keeps Failing)

If the SQL scripts keep failing, manually set your streak:

```sql
-- 1. Add columns manually
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS login_streak INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_daily_login TIMESTAMPTZ;

-- 2. Set your streak
UPDATE profiles 
SET login_streak = 1, last_daily_login = NOW()
WHERE id = '4c4ef0a4-6689-46df-b215-37a9d2bcc089'; -- YOUR ID

-- 3. Add tokens manually
UPDATE profiles 
SET token_balance = token_balance + 50
WHERE id = '4c4ef0a4-6689-46df-b215-37a9d2bcc089'; -- YOUR ID

-- 4. Create transaction manually
INSERT INTO token_transactions (
  user_id, amount, type, category, source, description
) VALUES (
  '4c4ef0a4-6689-46df-b215-37a9d2bcc089', -- YOUR ID
  50,
  'earn',
  'reward',
  'daily_login',
  'Daily login reward (streak: 1)'
);
```

---

## 📊 Verification Checklist

After all steps:

- [ ] Run `DIAGNOSE_AND_FIX_NOW.sql` - See success messages
- [ ] Columns exist (check with query)
- [ ] Manual test of `check_daily_login` works
- [ ] Browser cache completely cleared
- [ ] Hard refresh (Ctrl + F5)
- [ ] Console shows: `📊 Dashboard: Login streak from DB:`
- [ ] Dashboard shows streak > 0
- [ ] Claim daily login
- [ ] Rewards → History shows `+50` (positive!)
- [ ] Transaction type is "reward"
- [ ] No more `gaming_activity 406` errors

---

## 🚨 If STILL Not Working

**Check these:**

### Console Errors
Look for ANY errors in browser console (F12):
- "column does not exist"
- "function does not exist"
- "permission denied"

### Database Errors
In Supabase SQL Editor results:
- Any RED error messages
- "syntax error"
- "column already exists" (this is OK)

### Screenshots Needed
If still broken, take screenshots of:
1. Supabase SQL Editor after running `DIAGNOSE_AND_FIX_NOW.sql`
2. Browser console (F12)
3. Rewards → History showing the `-10` transaction
4. Result of `CHECK_YOUR_STREAK.sql`

---

## 💡 Common Issues & Fixes

### Issue: "column already exists"
**Fix:** This is fine! It means the column is there. Continue.

### Issue: "function does not exist"
**Fix:** The DROP didn't work. Run:
```sql
DROP FUNCTION IF EXISTS check_daily_login CASCADE;
DROP FUNCTION IF EXISTS add_tokens CASCADE;
```
Then run `DIAGNOSE_AND_FIX_NOW.sql` again.

### Issue: "permission denied"
**Fix:** You need to be the database owner. Make sure you're logged into Supabase with the correct account.

### Issue: Streak shows null instead of 0
**Fix:** 
```sql
UPDATE profiles SET login_streak = 0 WHERE login_streak IS NULL;
```

---

## 📝 What Each File Does

1. **`DIAGNOSE_AND_FIX_NOW.sql`** - Main fix (run this!)
2. **`CHECK_YOUR_STREAK.sql`** - Quick diagnostic queries
3. **`FIX_CRITICAL_ISSUES.sql`** - Alternative fix
4. **This file** - Troubleshooting guide

**Run them in this order:**
1. `DIAGNOSE_AND_FIX_NOW.sql` (fixes everything)
2. Clear cache
3. `CHECK_YOUR_STREAK.sql` (verify it worked)

---

## ✅ Success Indicators

You'll know it's working when:
1. ✅ Supabase shows "ALL FIXES APPLIED SUCCESSFULLY"
2. ✅ Console shows `📊 Dashboard: Login streak from DB: 1`
3. ✅ Dashboard displays "Streak: 1 day" (not 0)
4. ✅ Daily login creates `+50` transaction (not -10)
5. ✅ No more 406 errors in console
6. ✅ Claiming daily login increases streak next day

---

**THE KEY STEPS:**
1. 🔧 Run `DIAGNOSE_AND_FIX_NOW.sql` in Supabase
2. 🧹 Clear ALL browser cache
3. 🔄 Hard refresh (Ctrl + F5)
4. 🧪 Test daily login
5. ✅ Verify in Rewards → History

**Do NOT skip the cache clearing!** This is critical!

