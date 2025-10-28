# 🏆 Ranked Leaderboard System Explained

## 📊 Overview

Your leaderboard is a **dynamic ranking system** that tracks users across **4 competitive categories**:

1. **Most Playtime** - Total hours played across all games
2. **Most Games** - Total games owned/added to library
3. **Most Achievements** - Total achievements unlocked
4. **Most Tokens Earned** - Lifetime token earnings (NOT current balance)

---

## 🎯 How Ranking Works

### Real-Time Calculation
- Rankings are calculated **dynamically** when you view the leaderboard
- Uses SQL `ROW_NUMBER()` to assign ranks based on descending order
- **No stored ranks** - always reflects current data
- Updates immediately when any user's stats change

### Rank Assignment
```sql
ROW_NUMBER() OVER (ORDER BY total_value DESC)
```

This means:
- **#1** - Highest value in category
- **#2** - Second highest
- **#3** - Third highest
- And so on...

### Tie Handling
- If two users have the same value, the one who achieved it first gets the higher rank
- Uses database ordering for consistency

---

## 🔢 The 4 Categories Explained

### 1. 🕐 Most Playtime (Hours)
**What it tracks:** Total hours played across ALL connected gaming accounts

**How it's calculated:**
```sql
SELECT SUM(total_playtime_hours) 
FROM gaming_accounts 
WHERE user_id = YOUR_ID
```

**Example:**
- Steam account: 150 hours
- Epic Games: 75 hours
- Battle.net: 25 hours
- **Total: 250 hours** → Your leaderboard value

**Where hours come from:**
- ✅ Auto-tracked playtime (when app detects games running)
- ✅ Manual gaming sessions logged
- ✅ Imported from connected accounts (Steam, Epic, etc.)

---

### 2. 🎮 Most Games (Games Owned)
**What it tracks:** Total unique games in your library

**How it's calculated:**
```sql
SELECT COUNT(*) 
FROM user_games 
WHERE user_id = YOUR_ID
```

**Example:**
- You own Fortnite, CS:GO, Valorant, Apex, Overwatch
- **Total: 5 games** → Your leaderboard value

**Where games come from:**
- ✅ Connected gaming accounts (auto-imported)
- ✅ Manually added games
- ✅ Games tracked through playtime

---

### 3. 🎯 Most Achievements (Unlocked)
**What it tracks:** Total achievements you've unlocked

**How it's calculated:**
```sql
SELECT COUNT(*) 
FROM user_achievements 
WHERE user_id = YOUR_ID 
AND unlocked = true
```

**Example:**
- 5 Bronze achievements unlocked
- 3 Silver achievements unlocked
- 1 Gold achievement unlocked
- **Total: 9 achievements** → Your leaderboard value

**Where achievements come from:**
- ✅ Gaming milestones (play X hours, etc.)
- ✅ Social achievements (friend referrals, etc.)
- ✅ Platform achievements (daily login streaks, etc.)
- ✅ Tournament achievements

---

### 4. 💰 Most Tokens Earned (Lifetime)
**What it tracks:** Total tokens earned throughout your entire time on the platform

**How it's calculated:**
```sql
SELECT total_earned 
FROM profiles 
WHERE id = YOUR_ID
```

**Example:**
- Current balance: 3,105 tokens
- **Lifetime earned: 2,705 tokens** → Your leaderboard value
- Total spent: 300 tokens
- Bonuses/rewards: 700 tokens

**Important:** This tracks **lifetime earnings**, NOT current balance!
- If you earned 10,000 tokens but spent 9,000, your leaderboard shows **10,000**
- This prevents people from gaming the system by not spending

**Where earnings come from:**
- ✅ Gaming sessions (automatic token rewards)
- ✅ Daily login rewards
- ✅ Quest completion
- ✅ Achievement unlocks
- ✅ Tournament prizes
- ✅ Referral bonuses

---

## 🎨 Visual Features

### Top 3 Special Treatment
The top 3 ranks get special styling:

**🥇 Rank 1 (Gold)**
- Gold trophy icon
- Yellow/gold gradient background
- Yellow border
- Most prominent

**🥈 Rank 2 (Silver)**
- Silver medal icon
- Gray/silver gradient background
- Silver border

**🥉 Rank 3 (Bronze)**
- Bronze award icon
- Orange/bronze gradient background
- Orange border

**Ranks 4+**
- Just a number
- Standard dark background
- No special border

---

## 📍 Your Rank Display

At the top of the leaderboard, you see **"Your Rank"**:

```
┌─────────────────────────────────┐
│ 🏆 Your Rank                    │
│ #1                              │
│ 2,705 tokens                    │
└─────────────────────────────────┘
```

This shows:
- ✅ Your current rank in the selected category
- ✅ Your stat value for that category
- ✅ Updates instantly when you earn more

---

## 🔄 How Ranks Update

### Real-Time Updates
1. **You earn tokens** → Database updates `total_earned`
2. **Leaderboard refreshed** → SQL recalculates all ranks
3. **Your rank updates** → Shows new position

### Example Flow:
```
Initial State:
- You: 2,705 tokens → Rank #2
- Leader: 2,800 tokens → Rank #1

You earn 100 tokens:
- You: 2,805 tokens → Rank #1 ⬆️
- Former Leader: 2,800 tokens → Rank #2 ⬇️
```

### When Ranks Change:
- ✅ You earn/spend tokens (tokens category)
- ✅ You play games (hours category)
- ✅ You add games to library (games category)
- ✅ You unlock achievements (achievements category)
- ✅ Other users gain stats (everyone's rank shifts)

---

## 🎮 Behind The Scenes (Technical)

### Database Function: `get_leaderboard()`
This is the core SQL function that powers the leaderboard:

```sql
get_leaderboard(
  p_category: 'tokens' | 'hours' | 'games' | 'achievements',
  p_limit: 100  -- Number of top users to return
)
```

**What it returns:**
- `user_id` - User's unique ID
- `username` - Display name
- `avatar_url` - Profile picture
- `total_value` - The stat value for ranking
- `rank_position` - Their rank (1, 2, 3, etc.)

### Database Function: `get_user_rank()`
Gets YOUR specific rank:

```sql
get_user_rank(
  p_user_id: YOUR_UUID,
  p_category: 'tokens' | 'hours' | 'games' | 'achievements'
)
```

**Returns:** Your rank as an integer (1, 2, 3, etc.)

---

## 📈 Leaderboard Strategy Tips

### To Rank #1 in Tokens:
1. ✅ Play games daily (auto-earn tokens)
2. ✅ Complete daily login streak (bonus multiplier)
3. ✅ Finish quests (big token rewards)
4. ✅ Win tournaments (prize pools)
5. ✅ Unlock achievements (token rewards)
6. ✅ Refer friends (referral bonuses)

### To Rank #1 in Hours:
1. ✅ Connect all gaming accounts (Steam, Epic, etc.)
2. ✅ Let app track your playtime automatically
3. ✅ Play more games!
4. ✅ Keep the app running while gaming

### To Rank #1 in Games:
1. ✅ Connect Steam/Epic/Battle.net (auto-import library)
2. ✅ Manually add free-to-play games
3. ✅ Add games you play on console/mobile
4. ✅ Build a diverse library

### To Rank #1 in Achievements:
1. ✅ Complete milestones (hours played, etc.)
2. ✅ Unlock gaming achievements
3. ✅ Complete social challenges
4. ✅ Maintain daily login streak
5. ✅ Win tournaments

---

## 🔍 Common Questions

### Q: Why does my rank say #10 but I see only 8 people?
**A:** The leaderboard shows top 100 users. If you're #10, there are 9 users ahead of you, but some might not be visible on your screen.

### Q: My tokens went up but my rank stayed the same?
**A:** Someone ahead of you also earned tokens. Ranks are relative!

### Q: Can I drop in rank even if my stats don't change?
**A:** Yes! If other users gain stats, they can pass you. Leaderboards are competitive!

### Q: Why doesn't "Most Tokens" use my current balance?
**A:** We track **lifetime earnings** to reward active players. If we used current balance, people would never spend tokens!

### Q: Do I need to refresh to see rank changes?
**A:** No! The leaderboard auto-updates. Just switch between categories to force a refresh.

### Q: How often does the leaderboard update?
**A:** Instantly! Every time you view it, ranks are calculated in real-time from current database data.

### Q: Can I see my rank history?
**A:** Not yet, but this could be a future feature! (Currently only shows current rank)

---

## 🎯 Summary

Your leaderboard system:

✅ **4 competitive categories** (Tokens, Hours, Games, Achievements)  
✅ **Real-time ranking** (no stale data)  
✅ **Dynamic calculation** (ranks update instantly)  
✅ **Fair competition** (uses lifetime earnings, not current balance)  
✅ **Special styling** for top 3  
✅ **Shows your rank** prominently at top  
✅ **Motivates engagement** (compete with friends!)

It's designed to:
- 🎮 Reward active players
- 💪 Encourage competition
- 📊 Track meaningful metrics
- 🏆 Celebrate top performers

**Keep playing, earning, and climbing! 🚀**

