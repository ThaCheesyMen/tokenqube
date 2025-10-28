# 🔧 Database Migration Guide - Fixing Critical Errors

## Overview
This guide will help you fix the 404 and 406 errors you're experiencing by applying the necessary database migrations.

## 🚨 Current Issues
Based on your console errors:

1. **404 Errors (Missing RPC Functions):**
   - `update_user_heartbeat`
   - `check_daily_login`
   - `set_user_offline`
   - `get_platform_stats`

2. **400 Error (Database Schema Issue):**
   - `check_daily_login` - ambiguous column reference

3. **406 Error (Permission/RLS Issue):**
   - `gaming_activity` queries being rejected

4. **ERR_INSUFFICIENT_RESOURCES (Fixed in code):**
   - AdminPanel infinite loop (already fixed)

---

## ✅ Step-by-Step Fix

### Step 1: Apply Database Migrations

You need to push all the migration files to your Supabase database. Run this command in your terminal:

```bash
npx supabase db push
```

This will apply all migrations in the `supabase/migrations/` directory, including:
- `20251028110000_feature_expansion_part1.sql` - Social & Economy features
- `20251028120000_feature_expansion_part2.sql` - Gaming & Competitive features
- `20251028130000_crypto_economy_system.sql` - Token packages & withdrawals
- `20251028140000_role_based_access_control.sql` - RBAC system
- `20251028150000_missing_rpc_functions.sql` - **Critical RPC functions (NEW)**

**Expected output:**
```
Applying migration 20251028110000_feature_expansion_part1.sql...
Applying migration 20251028120000_feature_expansion_part2.sql...
Applying migration 20251028130000_crypto_economy_system.sql...
Applying migration 20251028140000_role_based_access_control.sql...
Applying migration 20251028150000_missing_rpc_functions.sql...
Finished supabase db push.
```

### Step 2: Set Your User Role to Admin

After the migrations are applied, you need to set your account to admin:

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Go to **Table Editor** → **profiles**
4. Find your user row (search by username or email)
5. Edit the row and set the `role` column to `'admin'`
6. Save the changes

**OR** run this SQL query in the Supabase SQL Editor:

```sql
-- Replace 'your-email@example.com' with your actual email
UPDATE profiles
SET role = 'admin'
WHERE email = 'your-email@example.com';
```

### Step 3: Verify the Database Functions

Run this query in the Supabase SQL Editor to verify all functions were created:

```sql
SELECT 
  p.proname as function_name,
  pg_catalog.pg_get_function_arguments(p.oid) as arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN (
    'update_user_heartbeat',
    'set_user_offline',
    'check_daily_login',
    'get_platform_stats',
    'ban_user',
    'unban_user',
    'update_user_role'
  )
ORDER BY p.proname;
```

**Expected output:** 7 rows showing all the functions.

### Step 4: Verify RLS Policies

Check that the `gaming_activity` table has proper RLS policies:

```sql
SELECT 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd
FROM pg_policies
WHERE tablename = 'gaming_activity';
```

### Step 5: Restart Your Development Server

After applying migrations, restart your Vite dev server:

```bash
# Press Ctrl+C to stop the current server
# Then start it again:
npm run dev
```

### Step 6: Clear Browser Cache & Reload

1. Open DevTools (F12)
2. Right-click the refresh button
3. Select "Empty Cache and Hard Reload"

---

## 🔍 Troubleshooting

### If migrations fail:

1. **Check for existing functions:**
   ```sql
   -- Drop conflicting functions if needed
   DROP FUNCTION IF EXISTS update_user_heartbeat(UUID) CASCADE;
   DROP FUNCTION IF EXISTS set_user_offline(UUID) CASCADE;
   DROP FUNCTION IF EXISTS check_daily_login(UUID) CASCADE;
   DROP FUNCTION IF EXISTS get_platform_stats() CASCADE;
   ```

2. **Then retry:**
   ```bash
   npx supabase db push
   ```

### If you still see 404 errors:

1. Verify the function exists:
   ```sql
   SELECT proname FROM pg_proc WHERE proname = 'update_user_heartbeat';
   ```

2. Grant execute permissions manually:
   ```sql
   GRANT EXECUTE ON FUNCTION update_user_heartbeat(UUID) TO authenticated;
   GRANT EXECUTE ON FUNCTION set_user_offline(UUID) TO authenticated;
   GRANT EXECUTE ON FUNCTION check_daily_login(UUID) TO authenticated;
   GRANT EXECUTE ON FUNCTION get_platform_stats() TO authenticated;
   ```

### If you see "ambiguous column" errors:

The new migration file (`20251028150000_missing_rpc_functions.sql`) has already fixed the `check_daily_login` function. Make sure it's applied.

### If AdminPanel still has infinite loop:

This should be fixed now. The issue was in the `useEffect` dependency array using the `isAdmin` function instead of the `role` value. The fix changes:

```typescript
// ❌ BEFORE (causes infinite loop)
}, [isAdmin, roleLoading, activeTab]);

// ✅ AFTER (fixed)
}, [roleLoading, activeTab, role]);
```

---

## 📊 What Each Migration Does

### `20251028110000_feature_expansion_part1.sql`
- ✅ Daily login rewards table
- ✅ Friend activities feed
- ✅ Quest chains
- ✅ Party templates & ratings
- ✅ Token staking
- ✅ Profile themes

### `20251028120000_feature_expansion_part2.sql`
- ✅ Gaming sessions with replay data
- ✅ Game library tracking
- ✅ Game recommendations
- ✅ Battle pass system
- ✅ Marketplace auctions
- ✅ Item crafting
- ✅ Tournament system
- ✅ Ranked system
- ✅ User clips
- ✅ Profile customization
- ✅ Friend gifting
- ✅ User analytics
- ✅ Matchmaking queue

### `20251028130000_crypto_economy_system.sql`
- ✅ Token packages for purchase
- ✅ Token withdrawal system
- ✅ Platform revenue tracking
- ✅ Automated fee collection
- ✅ RPC functions for transfers and fees

### `20251028140000_role_based_access_control.sql`
- ✅ User roles enum (`user`, `admin`, `dev`, `support`, `moderator`)
- ✅ Role column in profiles
- ✅ RLS policies for role management
- ✅ `get_user_role()` function

### `20251028150000_missing_rpc_functions.sql` (NEW)
- ✅ `update_user_heartbeat()` - Heartbeat service
- ✅ `set_user_offline()` - Offline status
- ✅ `check_daily_login()` - Daily rewards (FIXED)
- ✅ `get_platform_stats()` - Admin dashboard stats
- ✅ `ban_user()` - User banning
- ✅ `unban_user()` - User unbanning
- ✅ `update_user_role()` - Role management

---

## 🎯 Next Steps After Migrations

1. **Test the Admin Panel:**
   - Navigate to the Admin Panel (sidebar → Admin Panel button)
   - Verify platform stats load correctly
   - Test user search functionality
   - Test role assignment

2. **Test Token Economy:**
   - Go to Rewards → Buy/Sell Tokens
   - Verify token packages display
   - Test withdrawal request form

3. **Test Daily Login:**
   - Refresh the page
   - You should see a daily login reward modal
   - Claim the reward and verify tokens were added

4. **Monitor Console:**
   - Open DevTools (F12)
   - Check for any remaining errors
   - All 404/406 errors should be gone

---

## 🆘 Still Having Issues?

If you continue to experience errors after following this guide:

1. **Share the full error message** from the console
2. **Check Supabase logs:**
   - Dashboard → Logs → select your database
   - Look for SQL errors or permission issues
3. **Verify all migrations were applied:**
   ```bash
   npx supabase migration list
   ```

---

## ✨ Success Indicators

You'll know everything is working when:
- ✅ No 404 errors in console
- ✅ No 406 errors for `gaming_activity`
- ✅ Admin Panel loads and shows stats
- ✅ Daily login modal appears
- ✅ User search works in Admin Panel
- ✅ Token economy page loads correctly
- ✅ Heartbeat updates without errors

---

**Good luck! 🚀**

