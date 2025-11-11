# 🎯 FINAL SETUP - Complete Deployment Guide

## ✅ Your Project is Ready!

All code is complete and working. Just follow these final steps.

---

## 📋 Your Supabase Credentials

**Project:** xuyjhlfquuyfpttabgwf  
**URL:** https://xuyjhlfquuyfpttabgwf.supabase.co  
**Publishable Key:** eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh1eWpobGZxdXV5ZnB0dGFiZ3dmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3NzM0MTUsImV4cCI6MjA3ODM0OTQxNX0.QUu4MvtV7MdcAJ2R4B7GSHJIFblrjDQX-8thRAGL4OI

---

## 🚀 Step 1: Set Up Database (5 minutes)

### 1.1 Run Migration 1 (Create Tables)

Go to: https://supabase.com/dashboard/project/xuyjhlfquuyfpttabgwf/sql/new

Copy and paste this entire SQL:

```sql
-- Create profiles table for user information
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  public_key TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Create conversations table
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user2_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user1_id, user2_id),
  CHECK (user1_id < user2_id)
);

-- Enable RLS on conversations
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- Conversations policies
DROP POLICY IF EXISTS "Users can view their conversations" ON public.conversations;
CREATE POLICY "Users can view their conversations"
  ON public.conversations FOR SELECT
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);

DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;
CREATE POLICY "Users can create conversations"
  ON public.conversations FOR INSERT
  WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Create messages table with encryption
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  encrypted_content TEXT NOT NULL,
  encrypted_key TEXT NOT NULL,
  iv TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on messages
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Messages policies
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.messages;
CREATE POLICY "Users can view messages in their conversations"
  ON public.messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations
      WHERE id = conversation_id
      AND (user1_id = auth.uid() OR user2_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert messages in their conversations" ON public.messages;
CREATE POLICY "Users can insert messages in their conversations"
  ON public.messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM public.conversations
      WHERE id = conversation_id
      AND (user1_id = auth.uid() OR user2_id = auth.uid())
    )
  );

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

Click **Run** or press Ctrl+Enter.

### 1.2 Run Migration 2 (Add Sender Encrypted Key)

In the same SQL Editor, clear the previous query and paste:

```sql
-- Add sender_encrypted_key column to messages table
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS sender_encrypted_key TEXT;
```

Click **Run** or press Ctrl+Enter.

### 1.3 Verify Tables Exist

Run this to verify:

```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('profiles', 'conversations', 'messages');
```

You should see 3 rows: **profiles**, **conversations**, **messages**

### 1.4 Verify sender_encrypted_key Column Exists

Run this:

```sql
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'messages' AND column_name = 'sender_encrypted_key';
```

You should see 1 row: **sender_encrypted_key**

---

## 🌐 Step 2: Update Vercel Environment Variables

Go to: https://vercel.com/karthiksteves-projects/securechat11/settings/environment-variables

### Delete Old Variables
Delete any existing Supabase-related variables.

### Add These 3 Variables:

**Variable 1:**
- Key: `VITE_SUPABASE_URL`
- Value: `https://xuyjhlfquuyfpttabgwf.supabase.co`
- Environments: ✅ Production ✅ Preview ✅ Development
- Click **Save**

**Variable 2:**
- Key: `VITE_SUPABASE_PUBLISHABLE_KEY`
- Value: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh1eWpobGZxdXV5ZnB0dGFiZ3dmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3NzM0MTUsImV4cCI6MjA3ODM0OTQxNX0.QUu4MvtV7MdcAJ2R4B7GSHJIFblrjDQX-8thRAGL4OI`
- Environments: ✅ Production ✅ Preview ✅ Development
- Click **Save**

**Variable 3:**
- Key: `VITE_APP_URL`
- Value: `https://securechat11.vercel.app`
- Environments: ✅ Production ✅ Preview ✅ Development
- Click **Save**

---

## 🔄 Step 3: Redeploy to Vercel

1. Go to: https://vercel.com/karthiksteves-projects/securechat11
2. Click **Deployments** tab
3. Click the **⋯** (three dots) menu on the latest deployment
4. Click **Redeploy**
5. Select: ✅ Use existing Build Cache
6. Click **Redeploy**
7. Wait 1-2 minutes for deployment to complete

---

## ⚙️ Step 4: Update Supabase Site URL

Go to: https://supabase.com/dashboard/project/xuyjhlfquuyfpttabgwf/auth/url-configuration

Set these values:

**Site URL:**
```
https://securechat11.vercel.app
```

**Redirect URLs:**
Add this URL:
```
https://securechat11.vercel.app/**
```

Click **Save**

---

## ✅ Step 5: Test Your App!

1. Visit: https://securechat11.vercel.app/

2. **Sign Up Test:**
   - Sign up with your email
   - Check email for confirmation
   - Click confirmation link
   - Sign in

3. **Messaging Test:**
   - Open incognito/another browser
   - Sign up with a different email
   - Go back to first account
   - Select the second user from sidebar
   - Send a message: "Hello from Account 1"
   - Switch to second account
   - See the message appear
   - Reply: "Hello from Account 2"
   - Switch back to first account
   - See the reply

4. **Verify Encryption Works:**
   - You should see your sent messages (blue bubbles, right side)
   - You should see received messages (gray bubbles, left side)
   - All messages should decrypt and display text properly
   - No "[Decryption failed]" errors

---

## 🎉 Success Checklist

After completing all steps, you should have:

- ✅ Database tables created in Supabase
- ✅ `sender_encrypted_key` column added to messages table
- ✅ Vercel environment variables updated
- ✅ Supabase Site URL set to production URL
- ✅ App deployed and accessible at https://securechat11.vercel.app/
- ✅ Users can sign up and receive confirmation emails
- ✅ Email links redirect to production (not localhost)
- ✅ Messages send and receive in real-time
- ✅ Both senders and recipients can decrypt messages
- ✅ No API key errors
- ✅ No decryption errors

---

## 🐛 Troubleshooting

**"Invalid API key" error:**
- Verify Vercel environment variables match your Supabase credentials
- Redeploy after updating variables

**"column 'sender_encrypted_key' does not exist":**
- Run Migration 2 in Supabase SQL Editor

**Sent messages show "[Decryption failed]":**
- Clear browser data (localStorage)
- Sign out and sign in again to regenerate keys

**Email confirmation links go to localhost:**
- Update VITE_APP_URL in Vercel to production URL
- Update Supabase Site URL to production URL

**Messages don't appear in real-time:**
- Verify Realtime is enabled in Supabase
- Check that messages table is added to replication

---

## 📱 Your Live App

**Production URL:** https://securechat11.vercel.app/
**GitHub Repo:** https://github.com/karthiksteve/securechat
**Supabase Project:** https://supabase.com/dashboard/project/xuyjhlfquuyfpttabgwf

---

## 🔐 Security Notes

- All messages are end-to-end encrypted
- Private keys stored in browser localStorage
- Clearing browser data = losing access to old messages
- Each message uses unique AES-256-GCM encryption
- Keys exchanged using RSA-OAEP-2048

---

**Your SecureChat app is production-ready!** 🚀🔒✨

Follow the steps above in order and you'll have a fully working encrypted messaging app!
