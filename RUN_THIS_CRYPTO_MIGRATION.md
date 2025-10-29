# 🚨 IMPORTANT: Run This Crypto Migration NOW!

## ⚡ QUICK START (2 minutes):

### **Step 1:** Open Supabase SQL Editor
1. Go to: https://supabase.com/dashboard
2. Select your project: **TokenQuest**
3. Click **SQL Editor** in sidebar
4. Click **"+ New query"**

### **Step 2:** Copy & Paste Migration
```sql
-- Copy the ENTIRE contents of this file:
supabase/migrations/20251029080000_crypto_integration.sql

-- Then click "RUN" (bottom right)
```

### **Step 3:** Verify Success
You should see:
```
Crypto integration features created successfully!
```

---

## 📋 WHAT THIS DOES:

### **Tables Created:**
1. ✅ `crypto_quest_rewards` - $USDT quest rewards
2. ✅ `crypto_staking` - Stake crypto → earn tokens
3. ✅ Marketplace crypto payment columns
4. ✅ Auction crypto escrow columns

### **Functions Created:**
1. ✅ `process_crypto_staking_rewards()` - Auto-pay daily
2. ✅ `claim_crypto_quest_reward()` - Claim $USDT

### **Sample Data:**
1. ✅ 3 crypto quests ($10-$25 USDT rewards)

---

## 🎯 TESTING AFTER MIGRATION:

### Test 1: Unified Payment Modal
1. Go to `/marketplace`
2. Try to buy item without enough tokens
3. ✅ Modal appears with crypto vs card options

### Test 2: Check Database
```sql
-- Verify tables exist:
SELECT * FROM crypto_quest_rewards LIMIT 1;
SELECT * FROM crypto_staking LIMIT 1;

-- Check sample quests:
SELECT name, crypto_reward_usd FROM quest_templates WHERE is_crypto_quest = true;
```

---

## ⚠️ TROUBLESHOOTING:

### Error: "relation already exists"
**Fix:** Some tables already exist, that's OK! Migration is safe to re-run.

### Error: "permission denied"
**Fix:** Make sure you're logged in as project owner.

### Error: "syntax error"
**Fix:** Make sure you copied the ENTIRE file contents.

---

## ✅ AFTER MIGRATION:

You'll have:
- ✅ Crypto payment system active
- ✅ Marketplace integration working
- ✅ Database ready for crypto features
- ✅ Sample crypto quests available

**You're ready to test!** 🚀

---

**Next:** Check `CRYPTO_INTEGRATION_COMPLETE.md` for full details!

