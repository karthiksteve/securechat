# Deployment Checklist ✅

Follow these steps in order to deploy SecureChat successfully.

## Step 1: Database Setup (Supabase)

- [ ] Create Supabase project at https://supabase.com
- [ ] Copy your project URL and anon key
- [ ] Go to SQL Editor in Supabase Dashboard
- [ ] Run migration 1: `supabase/migrations/20251111143544_29785be6-4723-4673-b7d3-c61bfe8d6183.sql`
  - Creates `profiles`, `conversations`, and `messages` tables
  - Sets up Row Level Security policies
  - Creates trigger for new user signup
- [ ] Run migration 2: `supabase/migrations/20251112000000_add_sender_encrypted_key.sql`
  - Adds `sender_encrypted_key` column to messages table
- [ ] Verify columns exist by running:
  ```sql
  SELECT column_name FROM information_schema.columns 
  WHERE table_name = 'messages';
  ```
  You should see: `id`, `conversation_id`, `sender_id`, `encrypted_content`, `encrypted_key`, `sender_encrypted_key`, `iv`, `created_at`

## Step 2: Update Supabase Configuration

- [ ] Go to Authentication → URL Configuration in Supabase Dashboard
- [ ] Set **Site URL** to your production URL (e.g., `https://securechat11.vercel.app`)
- [ ] Add your production URL to **Redirect URLs**

## Step 3: Deploy to Vercel

- [ ] Push code to GitHub repository
- [ ] Go to https://vercel.com and sign in
- [ ] Click "Add New Project"
- [ ] Import your GitHub repository
- [ ] Add environment variables:
  - `VITE_SUPABASE_URL` = your Supabase project URL
  - `VITE_SUPABASE_PUBLISHABLE_KEY` = your Supabase anon key
  - `VITE_APP_URL` = your Vercel URL (e.g., https://securechat11.vercel.app)
- [ ] Click "Deploy"
- [ ] Wait for deployment to complete

## Step 4: Test the Application

- [ ] Visit your deployed URL
- [ ] Sign up with a test account
- [ ] Check that you receive confirmation email
- [ ] Confirm email and sign in
- [ ] Sign up with a second test account (use different browser/incognito)
- [ ] Send messages between the two accounts
- [ ] Verify both users can:
  - See their sent messages
  - See received messages
  - Messages decrypt correctly

## Step 5: Verify Everything Works

- [ ] Check browser console (F12) for any errors
- [ ] Send message from Account A → Account B
- [ ] Verify Account A sees their sent message (blue bubble, right side)
- [ ] Verify Account B sees received message (gray bubble, left side)
- [ ] Send message from Account B → Account A
- [ ] Verify both directions work
- [ ] Sign out and sign back in
- [ ] Verify message history loads correctly

## Troubleshooting

**If you see "column 'sender_encrypted_key' does not exist":**
- You didn't run migration 2. Go back to Step 1 and run it.

**If sent messages show "[Decryption failed]":**
- Migration 2 wasn't run
- Or you're looking at old messages sent before the migration

**If email confirmation links go to localhost:**
- You didn't set `VITE_APP_URL` environment variable in Vercel
- Or you didn't update Supabase Site URL

**If messages don't appear in real-time:**
- Check that Realtime is enabled in Supabase Dashboard → Database → Replication
- Verify `messages` table is added to publication

## Environment Variables Summary

**Local Development (.env):**
```
VITE_SUPABASE_URL=https://xuyjhlfquuyfpttabgwf.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_APP_URL=http://localhost:5173
```

**Production (Vercel):**
```
VITE_SUPABASE_URL=https://xuyjhlfquuyfpttabgwf.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_APP_URL=https://securechat11.vercel.app
```

## Success Criteria ✨

You'll know everything is working when:
- ✅ Users can sign up and receive confirmation emails
- ✅ Email links redirect to production URL (not localhost)
- ✅ Users can send and receive messages
- ✅ Senders can see their own sent messages
- ✅ Recipients can see received messages
- ✅ All messages decrypt successfully
- ✅ No errors in browser console
- ✅ Real-time updates work (messages appear instantly)
