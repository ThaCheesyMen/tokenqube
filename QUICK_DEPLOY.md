# ⚡ Quick Deploy Commands

## 🚀 Deploy Everything (Run These Commands)

### 1. Deploy Edge Functions

```bash
cd C:\Users\ronan\Desktop\tokenquest

# Deploy both functions
supabase functions deploy sync-playtime
supabase functions deploy sync-achievements
```

### 2. Test Functions

```powershell
# Test sync-playtime
$headers = @{
    "Authorization" = "Bearer YOUR_ANON_KEY"
}
Invoke-RestMethod -Uri "https://YOUR_PROJECT_REF.supabase.co/functions/v1/sync-playtime" -Method Post -Headers $headers

# Test sync-achievements
Invoke-RestMethod -Uri "https://YOUR_PROJECT_REF.supabase.co/functions/v1/sync-achievements" -Method Post -Headers $headers
```

### 3. Schedule Automated Runs

Run this SQL in your Supabase SQL Editor:

```sql
-- Enable pg_cron
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule sync-playtime (every 30 minutes)
SELECT cron.schedule(
  'sync-playtime-job',
  '*/30 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/sync-playtime',
    headers := '{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
  );
  $$
);

-- Schedule sync-achievements (every 15 minutes)
SELECT cron.schedule(
  'sync-achievements-job',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/sync-achievements',
    headers := '{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
  );
  $$
);
```

### 4. Verify Cron Jobs

```sql
-- View scheduled jobs
SELECT * FROM cron.job;

-- View recent job runs
SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
```

---

## 🔑 Where to Find Your Keys

### Project Ref
- Go to: https://supabase.com/dashboard
- Your URL will be: `https://supabase.com/dashboard/project/YOUR_PROJECT_REF`
- Copy the part after `/project/`

### Anon Key
- Supabase Dashboard → Settings → API
- Copy "anon public" key

### Service Role Key
- Supabase Dashboard → Settings → API
- Copy "service_role" key
- ⚠️ **Keep this secret!** Never expose in client code

---

## 📊 Quick Status Check

```sql
-- Check if functions are working
SELECT 
  'Playtime Rewards' as type,
  COUNT(*) as count,
  MAX(created_at) as last_created
FROM playtime_rewards
WHERE created_at > NOW() - INTERVAL '1 hour'

UNION ALL

SELECT 
  'Achievements' as type,
  COUNT(*) as count,
  MAX(created_at) as last_created
FROM gaming_achievements
WHERE created_at > NOW() - INTERVAL '1 hour';
```

---

## 🐛 Quick Fixes

### Functions not deploying?
```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase functions deploy sync-playtime --no-verify-jwt
```

### Cron not working?
```sql
-- Check pg_cron is enabled
SELECT * FROM pg_extension WHERE extname = 'pg_cron';

-- If not, enable it
CREATE EXTENSION pg_cron;
```

### No tokens being awarded?
```sql
-- Check gaming accounts exist and are verified
SELECT * FROM gaming_accounts WHERE is_verified = true;

-- Check game tiers exist
SELECT * FROM game_tiers WHERE is_active = true;

-- Manually trigger sync
SELECT net.http_post(
  url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/sync-playtime',
  headers := '{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
);
```

---

## ✅ Success Indicators

You'll know it's working when:

1. ✅ Functions deploy without errors
2. ✅ Test calls return `{"success": true}`
3. ✅ Cron jobs appear in `cron.job` table
4. ✅ New rows appear in `playtime_rewards` table
5. ✅ User `token_balance` increases
6. ✅ Transactions show `playtime_reward` type

---

## 🎯 Next Steps After Deployment

1. **Add test data:**
   ```sql
   -- Add a test game to a user
   INSERT INTO user_games (user_id, gaming_account_id, game_name, hours_played, platform)
   VALUES (
     (SELECT id FROM profiles LIMIT 1),
     (SELECT id FROM gaming_accounts LIMIT 1),
     'Fortnite',
     5.0,
     'Steam'
   );
   ```

2. **Manually trigger sync:**
   ```sql
   SELECT net.http_post(
     url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/sync-playtime',
     headers := '{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
   );
   ```

3. **Check results:**
   ```sql
   SELECT * FROM playtime_rewards ORDER BY created_at DESC LIMIT 5;
   SELECT * FROM transactions WHERE type = 'playtime_reward' ORDER BY created_at DESC LIMIT 5;
   ```

---

## 📱 Monitor in Real-Time

```bash
# Watch function logs live
supabase functions logs sync-playtime --follow

# In another terminal
supabase functions logs sync-achievements --follow
```

---

## 🎉 That's It!

Your gaming rewards system is now fully automated!

- ✅ Edge Functions deployed
- ✅ Cron jobs scheduled
- ✅ Tokens awarded automatically
- ✅ Users earn while playing

No more manual token distribution! 🚀

