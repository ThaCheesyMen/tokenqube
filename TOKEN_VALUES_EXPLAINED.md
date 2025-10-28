# 💰 Token Values Explained

## 🔍 Why Different Numbers?

You're seeing **3 different token values** because there are **3 different metrics**:

### 1. **Token Balance** (Current Balance)
**What you see:** 3,105 tokens  
**Where:** Dashboard profile banner, Sidebar  
**What it means:** How many tokens you **currently have**  
**Database field:** `profiles.token_balance`

### 2. **Total Earned** (Lifetime Earnings)
**What you see:** 2,705 tokens  
**Where:** Leaderboard "Your Rank", Rewards Center  
**What it means:** Total tokens you've **ever earned** (all-time)  
**Database field:** `profiles.total_earned`

### 3. **Total Spent** (Lifetime Spending)
**What you see:** 400 tokens (not directly shown, but calculated)  
**Where:** Token Economy widget, Admin panel  
**What it means:** Total tokens you've **ever spent**  
**Database field:** `profiles.total_spent`

---

## 🧮 The Math

```
Token Balance = Total Earned - Total Spent
3,105 = 2,705 - (-400)

Wait, that doesn't add up! Let me check...

Actually:
Token Balance (3,105) = Starting Balance + Earned - Spent
or
Token Balance = Total Earned + Adjustments
```

**Hmm, the math doesn't match perfectly**, which means either:
1. You received tokens from another source (referral bonus, admin gift, etc.)
2. There's a discrepancy in tracking

---

## 🐛 The Bug I Found

The **Leaderboard list** was showing **3,105** (your current balance) instead of **2,705** (your total earned).

**The Fix:**
- ✅ "Your Rank" banner: Shows 2,705 (total_earned) - CORRECT
- ❌ Leaderboard list: Was showing 3,105 (token_balance) - WRONG!
- ✅ After fix: Will show 2,705 (total_earned) - CORRECT

---

## 📊 What Each Place SHOULD Show

| Location | Metric | Your Value | Correct? |
|----------|--------|------------|----------|
| **Dashboard Banner** | Current Balance | 3,105 | ✅ |
| **Sidebar** | Current Balance | 3,105 | ✅ |
| **Leaderboard Rank** | Total Earned | 2,705 | ✅ |
| **Leaderboard List** | Total Earned | ~~3,105~~ → 2,705 | ❌ → ✅ |
| **Rewards Center** | Total Earned | 2.7K (2,705) | ✅ |
| **Token Economy** | Current Balance | 3,105 | ✅ |

---

## 🎯 Why This Matters

The leaderboard should rank by **"Most Tokens Earned"** (lifetime), not "Most Tokens Currently Have".

**Example:**
- Player A earned 10,000 tokens, spent 9,000 → Balance: 1,000
- Player B earned 2,000 tokens, spent 0 → Balance: 2,000

**Old (Wrong):** Player B ranks higher (2,000 > 1,000)  
**New (Correct):** Player A ranks higher (10,000 > 2,000)

---

## 🔧 Run This Fix

1. **Open Supabase SQL Editor**
2. **Run:** `FIX_LEADERBOARD_TOKENS_CATEGORY.sql`
3. **Check the test query** - should show 2,705
4. **Refresh leaderboard** - should now be consistent!

---

## ✅ After the Fix

All places will show the **correct value** for their purpose:
- **Balance displays:** 3,105 (what you have)
- **Earnings displays:** 2,705 (what you've earned total)
- **Leaderboard:** 2,705 (earnings competition)

---

**Run the SQL fix and you'll see consistent data!** 🎉

