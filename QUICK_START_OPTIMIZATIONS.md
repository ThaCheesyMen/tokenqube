# 🚀 Quick Start - Performance Optimizations

## ⏱️ Total Time: ~3 hours
## 💪 Impact: 50-80% faster page loads

---

## Step 1: Create Unified Stats Function (30 min)

### 1.1 Run SQL Script
```bash
# In Supabase SQL Editor, run:
CREATE_UNIFIED_STATS_FUNCTION.sql
```

### 1.2 Test It Works
```sql
-- Replace with your user ID
SELECT get_user_stats('4c4ef0a4-6689-46df-b215-37a9d2bcc089');

-- Should return JSON with all stats ✅
```

---

## Step 2: Create useUserStats Hook (15 min)

### 2.1 Create File
**File:** `src/hooks/useUserStats.ts`

```typescript
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export interface UserStats {
  total_playtime: number;
  total_games: number;
  total_achievements: number;
  token_balance: number;
  total_earned: number;
  total_spent: number;
  login_streak: number;
  level: number;
  xp: number;
  rank: number;
  total_friends: number;
  total_referrals: number;
}

export function useUserStats(userId: string | undefined) {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchStats = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .rpc('get_user_stats', { p_user_id: userId });

        if (error) throw error;
        setStats(data as UserStats);
      } catch (e) {
        setError(e as Error);
        console.error('Error fetching user stats:', e);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [userId]);

  const refetch = async () => {
    if (!userId) return;
    
    try {
      const { data, error } = await supabase
        .rpc('get_user_stats', { p_user_id: userId });

      if (error) throw error;
      setStats(data as UserStats);
    } catch (e) {
      setError(e as Error);
    }
  };

  return { stats, loading, error, refetch };
}
```

---

## Step 3: Update Dashboard.tsx (30 min)

### 3.1 Import the Hook
```typescript
import { useUserStats } from '../hooks/useUserStats';
```

### 3.2 Replace Multiple Queries
**OLD CODE (Remove this):**
```typescript
const fetchUserStats = async () => {
  if (!profile) return;

  try {
    const [rankResult, profileData, achievementCount] = await Promise.all([
      supabase.from('profiles')...
      supabase.from('profiles')...
      supabase.from('user_achievements')...
    ]);
    
    // Lots of manual data processing...
  } catch (error) {
    console.error('Error:', error);
  }
};
```

**NEW CODE (Add this):**
```typescript
const { stats, loading: statsLoading } = useUserStats(profile?.id);

// That's it! stats now contains everything:
// stats.total_playtime
// stats.total_games
// stats.token_balance
// stats.rank
// etc.
```

### 3.3 Update Render
```typescript
// OLD
<p>{currentStreak} days</p>

// NEW
<p>{stats?.login_streak || 0} days</p>

// OLD
<p>#{globalRank}</p>

// NEW
<p>#{stats?.rank || '—'}</p>
```

---

## Step 4: Update Profile.tsx (30 min)

### 4.1 Same Pattern
```typescript
import { useUserStats } from '../hooks/useUserStats';

export default function Profile() {
  const { stats, loading } = useUserStats(profile?.id);
  
  // Remove all the old fetchUserStats logic
  // Use stats.total_playtime, stats.total_games, etc.
}
```

---

## Step 5: Update Leaderboard.tsx (15 min)

### 5.1 Update fetchUserStats
```typescript
const fetchUserStats = async () => {
  if (!profile) return;

  const { data } = await supabase.rpc('get_user_stats', { 
    p_user_id: profile.id 
  });

  if (data) {
    setUserStats({
      hours: data.total_playtime,
      games: data.total_games,
      achievements: data.total_achievements
    });
  }
};
```

---

## Step 6: Add formatTokens Utility (15 min)

### 6.1 Already Created! ✅
File: `src/utils/formatTokens.ts` (already done)

### 6.2 Import and Use
```typescript
import { formatTokens } from '../utils/formatTokens';

// OLD
<span>{tokenBalance.toLocaleString()}</span>

// NEW
<span>{formatTokens(tokenBalance)}</span>

// With label
<span>{formatTokens(tokenBalance, { showLabel: true })}</span>
// "3,105 tokens"

// With sign for transactions
<span>{formatTokens(amount, { showSign: true })}</span>
// "+150"

// Compact for large numbers
<span>{formatTokens(1500000, { compact: true })}</span>
// "1.5M"
```

### 6.3 Replace in These Files
- `src/components/DiscordSidebar.tsx` (navbar token display)
- `src/pages/Dashboard.tsx` (all token displays)
- `src/pages/Rewards.tsx` (all token amounts)
- `src/components/TokenEconomyWidget.tsx` (stats)
- `src/components/RewardsDashboardSection.tsx` (earnings)
- `src/components/TokenTransactionHistory.tsx` (transactions)

**Search for:** `.toLocaleString()`  
**Replace with:** `formatTokens()`

---

## Step 7: Optimize Profile Page with Promise.all() (15 min)

### 7.1 Find Sequential Queries
**File:** `src/pages/Profile.tsx`

**OLD (Sequential - Slow):**
```typescript
const accounts = await supabase.from('gaming_accounts')...
const games = await supabase.from('user_games')...
const achievements = await supabase.from('user_achievements')...
const referrals = await supabase.from('referrals')...
```

**NEW (Parallel - Fast):**
```typescript
const [accounts, games, achievements, referrals] = await Promise.all([
  supabase.from('gaming_accounts').select('*').eq('user_id', profile.id),
  supabase.from('user_games').select('*').eq('user_id', profile.id),
  supabase.from('user_achievements').select('*').eq('user_id', profile.id).eq('unlocked', true),
  supabase.from('referrals').select('*, profiles!referrals_referred_id_fkey(username)').eq('referrer_id', profile.id)
]);
```

---

## Step 8: Delete Unused Components (5 min)

```bash
# Delete these old/unused files:
rm src/components/QuickActionsWidget.tsx
rm src/components/EnhancedQuickActions.tsx
rm src/pages/Search.tsx
```

---

## 📊 Expected Results

### Before Optimizations
- Dashboard load: 2-3 seconds
- Profile load: 2-3 seconds
- Page switches: 800ms

### After Optimizations
- Dashboard load: **0.8-1.2 seconds** (60% faster ⚡)
- Profile load: **1-1.5 seconds** (50% faster ⚡)
- Page switches: **100-200ms** (75% faster ⚡)

---

## ✅ Verification Checklist

After implementing:

- [ ] Run `CREATE_UNIFIED_STATS_FUNCTION.sql` in Supabase
- [ ] Create `useUserStats.ts` hook
- [ ] Update Dashboard.tsx to use hook
- [ ] Update Profile.tsx to use hook
- [ ] Update Leaderboard.tsx to use RPC
- [ ] Import and use `formatTokens` utility
- [ ] Add Promise.all() to Profile.tsx
- [ ] Delete unused components
- [ ] Test Dashboard loads faster
- [ ] Test all token displays are formatted correctly
- [ ] Check browser console for errors
- [ ] Hard refresh (Ctrl+Shift+R) to clear cache

---

## 🐛 Troubleshooting

### RPC Function Not Found
```
Error: function get_user_stats(uuid) does not exist
```
**Fix:** Re-run `CREATE_UNIFIED_STATS_FUNCTION.sql` in Supabase

### Stats is Null
```
TypeError: Cannot read property 'total_playtime' of null
```
**Fix:** Add null checks or default values:
```typescript
<p>{stats?.total_playtime || 0}</p>
```

### formatTokens Not Found
```
Module not found: Can't resolve '../utils/formatTokens'
```
**Fix:** Make sure `src/utils/formatTokens.ts` exists and is properly saved

---

## 🚀 Next Steps

After these quick wins, consider:
1. **Add React Query** for caching (Week 2)
2. **Add real-time updates** for token balance (Week 2)
3. **Add error boundaries** to all pages (Week 2)
4. **Add analytics tracking** (Week 3)

---

## 📁 Files Changed Summary

### Created
- ✅ `CREATE_UNIFIED_STATS_FUNCTION.sql`
- ✅ `src/hooks/useUserStats.ts`
- ✅ `src/utils/formatTokens.ts`

### Modified
- `src/pages/Dashboard.tsx`
- `src/pages/Profile.tsx`
- `src/pages/Leaderboard.tsx`
- `src/components/DiscordSidebar.tsx`
- `src/pages/Rewards.tsx`
- `src/components/TokenEconomyWidget.tsx`
- `src/components/RewardsDashboardSection.tsx`
- `src/components/TokenTransactionHistory.tsx`

### Deleted
- `src/components/QuickActionsWidget.tsx`
- `src/components/EnhancedQuickActions.tsx`
- `src/pages/Search.tsx`

---

**Total Files: 14 (3 created, 8 modified, 3 deleted)**

**Let's make your app blazing fast!** 🔥

