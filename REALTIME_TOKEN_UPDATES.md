# 🔄 Real-Time Token Updates Implementation

## 🎯 Goal
Make token balance update instantly across all components when tokens are earned or spent, without needing to refresh the page.

## 🛠️ Implementation

### Step 1: Create Real-time Hook
**File:** `src/hooks/useRealtimeTokenBalance.ts`

```typescript
import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export function useRealtimeTokenBalance(onUpdate?: (newBalance: number) => void) {
  const { profile, refreshProfile } = useAuth();

  useEffect(() => {
    if (!profile?.id) return;

    // Subscribe to profile changes for this user
    const channel = supabase
      .channel(`profile-${profile.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${profile.id}`
        },
        (payload) => {
          console.log('💰 Token balance updated:', payload.new.token_balance);
          
          // Call callback if provided
          if (onUpdate && payload.new.token_balance !== undefined) {
            onUpdate(payload.new.token_balance);
          }
          
          // Refresh profile in context
          refreshProfile();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id, onUpdate, refreshProfile]);
}
```

### Step 2: Use in Components

#### Dashboard.tsx
```typescript
import { useRealtimeTokenBalance } from '../hooks/useRealtimeTokenBalance';

export default function Dashboard({ onNavigate }: DashboardProps) {
  const { profile } = useAuth();
  const { stats: userStats, refetch } = useUserStats(profile?.id);
  
  // Real-time updates
  useRealtimeTokenBalance(() => {
    refetch(); // Refetch all stats when balance changes
  });
  
  // ... rest of component
}
```

#### DiscordSidebar.tsx
```typescript
import { useRealtimeTokenBalance } from '../hooks/useRealtimeTokenBalance';

export default function DiscordSidebar({ currentPage, onNavigate }: DiscordSidebarProps) {
  const { profile, refreshProfile } = useAuth();
  
  // Real-time updates (refreshProfile is already called in the hook)
  useRealtimeTokenBalance();
  
  // ... rest of component
}
```

#### TokenEconomyWidget.tsx
```typescript
import { useRealtimeTokenBalance } from '../hooks/useRealtimeTokenBalance';

export default function TokenEconomyWidget() {
  const { profile } = useAuth();
  const { stats: userStats, refetch } = useUserStats(profile?.id);
  
  // Real-time updates
  useRealtimeTokenBalance(() => {
    refetch();
  });
  
  // ... rest of component
}
```

---

## ✨ What This Does

When you earn or spend tokens:
1. **Database updates** via RPC call (`add_tokens`, etc.)
2. **Supabase broadcasts** the change to all connected clients
3. **Hook detects** the change in real-time
4. **Components update** automatically
5. **No page refresh needed!** ⚡

---

## 🎬 Demo Scenario

```
User opens Dashboard → sees 3,105 tokens
  ↓
Plays a game for 1 hour → earns 50 tokens
  ↓
INSTANTLY sees: 3,155 tokens (without refresh!)
  ↓
Sidebar updates: 3,155
TokenEconomyWidget updates: 3,155
Profile updates: 3,155
```

**All in real-time!** 🎉

---

## 📊 Benefits

- ✅ **Instant feedback** - Users see tokens change immediately
- ✅ **Better UX** - No manual refreshing needed
- ✅ **Multi-tab sync** - Open multiple tabs, they all update
- ✅ **Feels modern** - Like a real-time app (Discord, Slack, etc.)
- ✅ **Low overhead** - Only listens to your profile changes

---

## 🔧 Implementation Steps

1. Create `useRealtimeTokenBalance.ts` hook
2. Add to Dashboard
3. Add to Sidebar
4. Add to TokenEconomyWidget
5. Add to Profile (optional)
6. Test by earning tokens!

---

**Ready to implement this?** 🚀

