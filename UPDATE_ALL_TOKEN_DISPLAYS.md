# 🎨 Update All Token Displays - Batch Replace

## 📊 Files Still Using `.toLocaleString()` (26 files)

### High Priority (Dashboard/Frequent)
1. ✅ `src/pages/Dashboard.tsx` - DONE
2. ✅ `src/components/DiscordSidebar.tsx` - DONE
3. ✅ `src/pages/Profile.tsx` - DONE
4. ⏳ `src/pages/Leaderboard.tsx` - In progress
5. ⏳ `src/components/TokenEconomyWidget.tsx` - In progress
6. ⏳ `src/pages/AdminPanel.tsx` - TODO
7. ⏳ `src/components/TournamentsWidget.tsx` - TODO

### Medium Priority (Features)
8. `src/pages/Rewards.tsx`
9. `src/pages/TokenEconomy.tsx`
10. `src/pages/Marketplace.tsx`
11. `src/pages/BuyTokens.tsx`
12. `src/pages/Tournaments.tsx`
13. `src/components/BuySellTokensWidget.tsx`
14. `src/components/TokenStakingWidget.tsx`
15. `src/components/TransactionHistoryWidget.tsx`

### Low Priority (Less Frequent)
16. `src/pages/AdminRevenue.tsx`
17. `src/pages/TransactionHistory.tsx`
18. `src/components/ProfileViewModal.tsx`
19. `src/components/NotificationsWidget.tsx`
20. `src/components/FriendGifting.tsx`
21. `src/components/GamingSessionsHistory.tsx`
22. `src/components/TournamentStatsWidget.tsx`
23. `src/components/TournamentLeaderboard.tsx`
24. `src/components/TournamentHistory.tsx`
25. `src/components/EnhancedMessage.tsx`
26. `src/components/Navbar.tsx`
27. `src/components/DiscordMessage.tsx`
28. `src/components/AchievementShowcase.tsx`
29. `src/utils/messageUtils.ts`

---

## 🔧 Find & Replace Pattern

### Step 1: Add Import
Add to top of each file:
```typescript
import { formatTokens } from '../utils/formatTokens';
```

### Step 2: Replace Usage
Find: `{variable.toLocaleString()}`
Replace: `{formatTokens(variable)}`

Or for more complex:
Find: `{(variable || 0).toLocaleString()}`
Replace: `{formatTokens(variable || 0)}`

---

## ⚡ Quick Batch Replace (VS Code)

1. **Open Search & Replace:**
   - Press `Ctrl + H` (Windows/Linux) or `Cmd + H` (Mac)

2. **Enable Regex:**
   - Click the `.*` button in search box

3. **Find Pattern:**
```regex
(\{[^}]*?)(\.toLocaleString\(\))(\s*\})
```

4. **Replace With:**
```
$1$3
```
Then manually add `formatTokens()` wrapper

---

## 📝 Manual Update for Each File

For each file:
1. Add import: `import { formatTokens } from '../utils/formatTokens';`
2. Find all `.toLocaleString()`
3. Replace with `formatTokens(value)`
4. Test the page

---

## ✅ Already Completed (3/29)

- ✅ Dashboard.tsx
- ✅ DiscordSidebar.tsx
- ✅ Profile.tsx

**Progress:** 10% complete

---

## 🎯 Next Session Goals

If user wants to continue:
1. Update Leaderboard.tsx (3 instances)
2. Update TokenEconomyWidget.tsx (6 instances)
3. Update AdminPanel.tsx (10+ instances)
4. Update TournamentsWidget.tsx (2 instances)

**Estimated Time:** 30-45 minutes for all high priority files

---

*This is a gradual rollout - the app works fine with mixed usage, but consistency is better!*

