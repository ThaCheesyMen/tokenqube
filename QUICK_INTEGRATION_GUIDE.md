# ⚡ **QUICK INTEGRATION GUIDE**

## 🎯 **Add Tournament Management to Your App**

### **Step 1: Run SQL (2 minutes)**

1. Open **Supabase Dashboard**
2. Go to **SQL Editor**
3. Copy & paste contents of **`TOURNAMENT_MANAGEMENT_SYSTEM.sql`**
4. Click **RUN**
5. Wait for ✅ success message

---

### **Step 2: Add to Tournaments Page (5 minutes)**

Open `src/pages/Tournaments.tsx` and make these changes:

#### **A. Add Imports** (at top of file):

```tsx
import TournamentManagementDashboard from '../components/TournamentManagementDashboard';
import MyActiveMatches from '../components/MyActiveMatches';
import { Settings, Swords } from 'lucide-react'; // Add these icons
```

#### **B. Update State** (find existing activeTab state):

```tsx
// Change this:
const [activeTab, setActiveTab] = useState<'tournaments' | 'stats' | 'leaderboard' | 'history'>('tournaments');

// To this:
const [activeTab, setActiveTab] = useState<'tournaments' | 'stats' | 'leaderboard' | 'history' | 'manage' | 'mymatches'>('tournaments');
```

#### **C. Add New Tabs** (find the tab navigation array):

```tsx
// Find this array:
{[
  { id: 'tournaments', label: 'Tournaments', icon: Trophy },
  { id: 'stats', label: 'My Stats', icon: Trophy },
  { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
  { id: 'history', label: 'History', icon: Calendar }
].map((tab) => ...

// Change to this:
{[
  { id: 'tournaments', label: 'Tournaments', icon: Trophy },
  { id: 'mymatches', label: 'My Matches', icon: Swords },
  { id: 'stats', label: 'My Stats', icon: Trophy },
  { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
  { id: 'history', label: 'History', icon: Calendar },
  { id: 'manage', label: 'Manage', icon: Settings }
].map((tab) => ...
```

#### **D. Add Tab Content** (after the History tab content):

```tsx
{/* History Tab */}
{activeTab === 'history' && profile && (
  <div className="space-y-8">
    <TournamentHistory userId={profile.id} limit={20} />
  </div>
)}

{/* ADD THESE NEW TABS: */}

{/* My Matches Tab */}
{activeTab === 'mymatches' && profile && (
  <div className="space-y-8">
    <MyActiveMatches userId={profile.id} />
  </div>
)}

{/* Management Tab */}
{activeTab === 'manage' && profile && (
  <div className="space-y-8">
    <TournamentManagementDashboard 
      userId={profile.id}
      onViewBracket={setSelectedTournamentForBracket}
    />
  </div>
)}

{/* Create Tournament Modal (this should already exist) */}
```

---

### **Step 3: Test (5 minutes)**

1. **Refresh browser** (Ctrl + F5)
2. **Go to Tournaments page**
3. **You should see 6 tabs now:**
   - Tournaments
   - **My Matches** ⭐ NEW
   - My Stats
   - Leaderboard
   - History
   - **Manage** ⭐ NEW

---

## 🎮 **How to Use**

### **For Players:**

1. Go to **"My Matches"** tab
2. See your active matches
3. Enter scores after playing
4. Click **"Submit Score"**
5. Winner auto-advances!

### **For Admins/Organizers:**

1. Go to **"Manage"** tab
2. See all active tournaments
3. Click **"Start"** to begin tournament
4. Click **"View Bracket"** to monitor progress
5. Prizes auto-distributed when complete!

---

## ✅ **That's It!**

**3 steps. 12 minutes. Complete tournament automation!**

---

## 🚀 **Quick Test**

Want to test immediately? Run this in Supabase SQL Editor:

```sql
-- Create a quick test tournament
INSERT INTO tournaments (
  tournament_name,
  game_name,
  platform,
  tournament_type,
  max_participants,
  entry_fee,
  prize_pool,
  status,
  organizer_id,
  registration_start,
  registration_end,
  tournament_start
) VALUES (
  'Quick Test Tournament',
  'Fortnite',
  'pc',
  'single_elimination',
  4,
  0,
  500,
  'upcoming',
  (SELECT id FROM profiles LIMIT 1), -- Uses first user
  NOW(),
  NOW() + INTERVAL '1 hour',
  NOW() + INTERVAL '2 hours'
) RETURNING id;

-- Register yourself (replace YOUR_USER_ID)
INSERT INTO tournament_participants (tournament_id, user_id)
VALUES (
  (SELECT id FROM tournaments WHERE tournament_name = 'Quick Test Tournament'),
  'YOUR_USER_ID'
);

-- Register 3 more random users for testing
INSERT INTO tournament_participants (tournament_id, user_id)
SELECT 
  (SELECT id FROM tournaments WHERE tournament_name = 'Quick Test Tournament'),
  id
FROM profiles
WHERE id != 'YOUR_USER_ID'
LIMIT 3;
```

Then:
1. Go to **Manage** tab
2. Click **"Start"** on "Quick Test Tournament"
3. Go to **My Matches** tab
4. Submit a score!

---

## 📋 **Complete File List**

### **What You Need to Run:**
1. ✅ `TOURNAMENT_MANAGEMENT_SYSTEM.sql` - Run in Supabase

### **What Already Exists:**
2. ✅ `src/components/TournamentManagementDashboard.tsx` - Created ✅
3. ✅ `src/components/MyActiveMatches.tsx` - Created ✅

### **What You Need to Edit:**
4. ✅ `src/pages/Tournaments.tsx` - Add 4 code snippets above

---

## 💡 **Pro Tips**

### **Tip 1: Role-Based Tab Visibility**
Hide "Manage" tab for non-admins:

```tsx
{profile?.role === 'admin' && (
  <button
    key="manage"
    onClick={() => setActiveTab('manage')}
    className={...}
  >
    <Settings className="w-4 h-4" />
    Manage
  </button>
)}
```

### **Tip 2: Badge on "My Matches"**
Show number of active matches:

```tsx
const [activeMatchCount, setActiveMatchCount] = useState(0);

// Fetch in useEffect
useEffect(() => {
  if (profile) {
    supabase.rpc('get_my_active_matches', { p_user_id: profile.id })
      .then(({ data }) => setActiveMatchCount(data?.length || 0));
  }
}, [profile]);

// In tab:
My Matches {activeMatchCount > 0 && `(${activeMatchCount})`}
```

### **Tip 3: Auto-Open My Matches**
If player has active matches, show that tab first:

```tsx
useEffect(() => {
  if (activeMatchCount > 0) {
    setActiveTab('mymatches');
  }
}, [activeMatchCount]);
```

---

## 🎉 **Done!**

Your tournament system now has:
- ✅ Automatic bracket generation
- ✅ Score submission UI
- ✅ Real-time tracking
- ✅ Progress monitoring
- ✅ Auto-prize distribution

**Go launch some tournaments!** 🏆🚀

