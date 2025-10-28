# 📘 Manual Deployment Guide

Since CLI login is having issues, you can deploy the Edge Function through the Supabase Dashboard.

## Option 1: Use Supabase Dashboard (Easiest)

### Step 1: Open Supabase Dashboard
1. Go to: https://supabase.com/dashboard
2. Login and select your project

### Step 2: Navigate to Edge Functions
1. Click **"Edge Functions"** in the left sidebar
2. Click **"Create a new function"**

### Step 3: Copy Function Code
1. Open `supabase/functions/sync-steam-games/index.ts`
2. Copy **ALL** the code
3. Paste it into the Supabase Editor

### Step 4: Set Environment Variables
1. In the function editor, look for **"Environment Variables"** or **"Secrets"**
2. Add a new secret:
   - **Key**: `STEAM_API_KEY`
   - **Value**: Your Steam API key

### Step 5: Deploy
1. Click **"Deploy"** button
2. Wait for deployment to complete

### Step 6: Get Your Steam API Key
If you don't have one:
1. Visit: https://steamcommunity.com/dev/apikey
2. Login with Steam
3. Click "Register for a New Steam Web API Key"
4. Enter your domain (can be `localhost` for testing)
5. Copy the generated key

## Option 2: Use Database Webhook (Alternative)

If Edge Functions are too complex, you can also:
1. Manually add games to the database
2. Update playtime manually
3. Use SQL scripts (like we have in other files)

## Quick SQL Alternative

Instead of Edge Functions, you can run SQL to manually insert games:

```sql
-- Example: Add a Steam game manually
INSERT INTO user_games (
  user_id,
  gaming_account_id,
  game_name,
  game_id,
  platform,
  hours_played,
  is_owned,
  last_sync
) VALUES (
  'your-user-id',
  'your-gaming-account-id',
  'Counter-Strike 2',
  '730',
  'steam',
  150.5,
  true,
  NOW()
);
```

## Need Help?

1. **Edge Functions not working?** Use manual SQL inserts for now
2. **Missing Steam API key?** Get one from https://steamcommunity.com/dev/apikey
3. **Database issues?** Check the SQL migration files we created earlier

The app will work fine with manually inserted games while you set up API automation!
