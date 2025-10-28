# 🚀 Fix Chat & Parties - Run This Migration

## Quick Steps:

1. **Open Supabase Dashboard**
   - Go to: https://supabase.com/dashboard
   - Select your project

2. **Go to SQL Editor**
   - Click "SQL Editor" in the left sidebar

3. **Copy & Paste**
   - Open: `supabase/migrations/20251026120000_fix_chat_and_parties.sql`
   - Copy ALL the content
   - Paste into SQL Editor

4. **Run It**
   - Click "Run" button
   - Wait for success message

## What This Fixes:

✅ Creates `chat_messages` table (for global chat)
✅ Creates `dm_rooms` table (for DM conversations)
✅ Creates `dm_messages` table (for DM messages)
✅ Fixes `parties` table with correct foreign keys
✅ Creates `party_members` table
✅ Adds proper RLS policies for security
✅ Creates helper function `get_or_create_dm_room()`

## After Running:

- ✅ Messages will send successfully
- ✅ DMs will work
- ✅ Parties will load
- ✅ No more 400/406 errors!

---

**That's it! Your chat system will be fully functional!** 🎉

