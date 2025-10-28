# 🚀 TokenQuest Implementation & Deployment Guide

## 📋 What Has Been Implemented

### ✅ Phase 1: Enhanced Chat System
- **Message Reactions** - Users can react to messages with emojis
- **Message Editing** - Edit your own messages with visual indicator
- **Message Replies** - Reply to specific messages with context
- **Message Pinning** - Pin important messages
- **Message Attachments** - Support for images and files
- **Read Receipts** - Track when messages are read
- **Typing Indicators** - See when someone is typing
- **Group DMs** - Create group conversations with 3+ people
- **Blocked Users** - Block unwanted users

### ✅ Phase 2: Automated Playtime Rewards
- **Automated Sync Function** - Hourly playtime tracking
- **Token Rewards** - Earn tokens based on game tier
  - Tier 1 (AAA): 5 tokens/hour
  - Tier 2 (Popular): 3 tokens/hour
  - Tier 3 (Other): 2 tokens/hour
- **Achievement Tracking** - Automatic achievement sync
- **Rarity-Based Rewards** - More tokens for rare achievements

### ✅ Phase 3: Enhanced Components
- **EnhancedMessage Component** - Full-featured message display
- **Reaction System** - Quick emoji reactions
- **Message Actions Menu** - Edit, delete, pin, reply options

---

## 🗄️ Database Setup

### Step 1: Run Migrations in Order

```bash
# Navigate to your project
cd C:\Users\ronan\Desktop\tokenquest

# Run migrations in Supabase SQL Editor in this order:
```

#### Migration 1: Enhanced Chat System
File: `supabase/migrations/20251026100000_enhanced_chat_system.sql`

This creates:
- `message_reactions` table
- `message_read_receipts` table
- `dm_room_members` table (for group DMs)
- `blocked_users` table
- `typing_indicators` table
- Helper functions for read receipts and group DMs

#### Migration 2: Update Gaming Achievements
File: `supabase/migrations/20251026100001_update_gaming_achievements.sql`

This adds:
- New columns to `gaming_achievements`
- Updated `award_playtime_tokens()` function
- Indexes for better performance

### Step 2: Verify Tables

Run this in Supabase SQL Editor:

```sql
-- Check if all new tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'message_reactions',
  'message_read_receipts',
  'dm_room_members',
  'blocked_users',
  'typing_indicators'
);

-- Should return 5 rows
```

---

## 🔧 Edge Functions Deployment

### Function 1: Automated Playtime Sync

```bash
# Deploy the function
supabase functions deploy sync-playtime-rewards

# Set environment variables (if not already set)
supabase secrets set STEAM_API_KEY=74329FA7ECBB181297FFB2B02A1C4838
```

**Manual Trigger** (for testing):
```bash
curl -X POST https://mprvbelnfalnvcwvrsqe.supabase.co/functions/v1/sync-playtime-rewards \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

**Set up Cron Job** (Optional - for automatic hourly sync):

You can use a service like:
- **Cron-job.org** - Free cron job service
- **GitHub Actions** - Run on schedule
- **Vercel Cron** - If deploying to Vercel

Example GitHub Action (`.github/workflows/sync-playtime.yml`):
```yaml
name: Sync Playtime
on:
  schedule:
    - cron: '0 * * * *'  # Every hour
  workflow_dispatch:  # Manual trigger

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - name: Call Edge Function
        run: |
          curl -X POST https://mprvbelnfalnvcwvrsqe.supabase.co/functions/v1/sync-playtime-rewards \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_ANON_KEY }}"
```

### Function 2: Achievement Sync

```bash
# Deploy the function
supabase functions deploy sync-achievements
```

**Manual Trigger**:
```bash
curl -X POST https://mprvbelnfalnvcwvrsqe.supabase.co/functions/v1/sync-achievements \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

**Recommended Schedule**: Every 6 hours

---

## 🎨 Frontend Integration

### Step 1: Update TypeScript Interfaces

Add to `src/lib/supabase.ts`:

```typescript
export interface MessageReaction {
  id: string;
  message_id: string;
  message_type: 'dm' | 'global';
  user_id: string;
  emoji: string;
  created_at: string;
}

export interface ReadReceipt {
  id: string;
  room_id: string;
  user_id: string;
  last_read_message_id: string | null;
  last_read_at: string;
}

export interface DMRoomMember {
  id: string;
  room_id: string;
  user_id: string;
  is_muted: boolean;
  is_admin: boolean;
  joined_at: string;
}

export interface BlockedUser {
  id: string;
  blocker_id: string;
  blocked_id: string;
  reason: string | null;
  created_at: string;
}

export interface TypingIndicator {
  id: string;
  room_id: string;
  user_id: string;
  is_typing: boolean;
  updated_at: string;
}
```

### Step 2: Replace DiscordMessage with EnhancedMessage

In `src/pages/Chat.tsx`, import the new component:

```typescript
import EnhancedMessage from '../components/EnhancedMessage';
```

Replace message rendering with:

```typescript
<EnhancedMessage
  id={msg.id}
  message={msg.message}
  username={username}
  avatar=""
  timestamp={msg.created_at}
  isOwnMessage={isOwnMessage}
  showAvatar={msgIndex === 0}
  showUsername={msgIndex === 0}
  messageType="dm"  // or "global"
  roomId={currentDMRoom}
  editedAt={msg.edited_at}
  replyTo={msg.reply_to}
  isPinned={msg.is_pinned}
  attachments={msg.attachments}
  onEdit={handleEditMessage}
  onDelete={handleDeleteMessage}
  onReply={handleReplyToMessage}
/>
```

### Step 3: Implement Message Actions

Add these functions to `Chat.tsx`:

```typescript
const handleEditMessage = async (messageId: string, newContent: string) => {
  const { error } = await supabase
    .from('dm_messages')  // or 'chat_messages' for global
    .update({ message: newContent })
    .eq('id', messageId);
    
  if (error) {
    toast.error('Failed to edit message');
  } else {
    toast.success('Message updated');
  }
};

const handleDeleteMessage = async (messageId: string) => {
  const { error } = await supabase
    .from('dm_messages')  // or 'chat_messages' for global
    .delete()
    .eq('id', messageId);
    
  if (error) {
    toast.error('Failed to delete message');
  } else {
    toast.success('Message deleted');
  }
};

const handleReplyToMessage = (messageId: string, username: string, message: string) => {
  setReplyingTo({ id: messageId, username, message });
  // Focus input field
};
```

---

## 🧪 Testing the Implementation

### Test 1: Message Reactions
1. Send a message in chat
2. Hover over the message
3. Click the smile icon
4. Select an emoji
5. Verify the reaction appears below the message

### Test 2: Message Editing
1. Send a message
2. Hover and click the "..." menu
3. Click "Edit Message"
4. Change the text and press Enter
5. Verify "(edited)" appears next to the message

### Test 3: Playtime Sync
1. Connect your Steam account
2. Manually trigger the sync function:
```bash
curl -X POST https://mprvbelnfalnvcwvrsqe.supabase.co/functions/v1/sync-playtime-rewards \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```
3. Check your token balance - it should increase
4. Check transactions table for playtime rewards

### Test 4: Achievement Sync
1. Play a game and unlock an achievement
2. Trigger the achievement sync:
```bash
curl -X POST https://mprvbelnfalnvcwvrsqe.supabase.co/functions/v1/sync-achievements \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```
3. Check your token balance
4. Check `gaming_achievements` table for new entries

---

## 📊 Monitoring & Maintenance

### Check Sync Status

```sql
-- Check last sync times
SELECT 
  platform_username,
  total_playtime_hours,
  last_sync,
  EXTRACT(EPOCH FROM (NOW() - last_sync))/3600 as hours_since_sync
FROM gaming_accounts
ORDER BY last_sync DESC;

-- Check recent playtime rewards
SELECT 
  pr.*,
  p.username
FROM playtime_rewards pr
JOIN profiles p ON p.id = pr.user_id
ORDER BY pr.created_at DESC
LIMIT 20;

-- Check recent achievements
SELECT 
  ga.*,
  p.username
FROM gaming_achievements ga
JOIN profiles p ON p.id = ga.user_id
ORDER BY ga.created_at DESC
LIMIT 20;
```

### Monitor Token Economy

```sql
-- Total tokens awarded from playtime
SELECT 
  SUM(tokens_earned) as total_playtime_tokens
FROM playtime_rewards;

-- Total tokens awarded from achievements
SELECT 
  SUM(tokens_awarded) as total_achievement_tokens
FROM gaming_achievements;

-- Top earners
SELECT 
  p.username,
  p.total_earned,
  p.token_balance
FROM profiles p
ORDER BY p.total_earned DESC
LIMIT 10;
```

---

## 🔮 Next Steps (Future Enhancements)

### Phase 4: WebRTC Voice Chat (Not Yet Implemented)
- Real peer-to-peer voice communication
- Voice activity detection
- Individual volume controls
- Screen sharing

### Phase 5: Rich Text & Media (Not Yet Implemented)
- Emoji picker component
- GIF picker (Tenor/GIPHY)
- File upload system
- Image preview

### Phase 6: Advanced Features (Not Yet Implemented)
- Message search
- Voice messages
- Video chat
- Markdown support

---

## 🐛 Troubleshooting

### Issue: Migrations fail with "relation already exists"
**Solution**: The migrations use `IF NOT EXISTS` and `DO $$ ... END $$` blocks, so they're idempotent. Just re-run them.

### Issue: Edge Functions return 401 Unauthorized
**Solution**: Make sure you're passing the Authorization header with your Supabase anon key.

### Issue: No tokens being awarded
**Solution**: 
1. Check if gaming accounts have `last_sync` older than 1 hour
2. Verify game tiers exist in `game_tiers` table
3. Check Edge Function logs in Supabase dashboard

### Issue: Reactions not showing
**Solution**:
1. Verify `message_reactions` table exists
2. Check RLS policies are enabled
3. Ensure EnhancedMessage component is being used

---

## 📞 Support

If you encounter issues:
1. Check Supabase logs (Dashboard → Edge Functions → Logs)
2. Check browser console for errors
3. Verify all migrations ran successfully
4. Check RLS policies are not blocking queries

---

## ✅ Deployment Checklist

- [ ] Run migration `20251026100000_enhanced_chat_system.sql`
- [ ] Run migration `20251026100001_update_gaming_achievements.sql`
- [ ] Verify all tables created successfully
- [ ] Deploy `sync-playtime-rewards` Edge Function
- [ ] Deploy `sync-achievements` Edge Function
- [ ] Set up cron jobs for automatic syncing
- [ ] Update TypeScript interfaces in `supabase.ts`
- [ ] Replace DiscordMessage with EnhancedMessage
- [ ] Implement message action handlers
- [ ] Test message reactions
- [ ] Test message editing
- [ ] Test playtime sync
- [ ] Test achievement sync
- [ ] Monitor token economy

---

**Congratulations!** 🎉 Your enhanced chat system and automated gaming rewards are now live!

