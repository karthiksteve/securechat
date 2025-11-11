# Database Setup Instructions

## ⚠️ CRITICAL: Run This Migration First

Before the app will work, you MUST add the `sender_encrypted_key` column to your database.

### Option 1: Using Supabase Dashboard (RECOMMENDED)

1. Go to https://supabase.com/dashboard
2. Select your project: `xuyjhlfquuyfpttabgwf`
3. Click **"SQL Editor"** in the left sidebar
4. Click **"New Query"**
5. Copy and paste this SQL:

```sql
-- Add sender_encrypted_key column to messages table
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS sender_encrypted_key TEXT;
```

6. Click **"Run"** or press `Ctrl+Enter`
7. You should see: "Success. No rows returned"

### Option 2: Using Supabase CLI (If you have it installed)

Run this command from the project directory:

```bash
supabase db push
```

This will apply the migration file: `supabase/migrations/20251112000000_add_sender_encrypted_key.sql`

## Verify Migration

After running the migration, verify it worked:

1. In Supabase Dashboard → SQL Editor
2. Run this query:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'messages' 
AND column_name = 'sender_encrypted_key';
```

3. You should see one row with:
   - column_name: `sender_encrypted_key`
   - data_type: `text`

## What This Does

This migration adds a new column `sender_encrypted_key` to store the encrypted AES key for the message sender. This allows senders to decrypt and view their own sent messages.

**How it works:**
- Message is encrypted ONCE with AES
- The AES key is encrypted with the recipient's RSA public key → stored in `encrypted_key`
- The SAME AES key is encrypted with the sender's RSA public key → stored in `sender_encrypted_key`
- Both sender and recipient can decrypt the same message using their respective private keys

## After Migration

Once the migration is complete:
1. The app should work without errors
2. You can send messages and see what you sent
3. Recipients can read your messages
4. All messages are end-to-end encrypted

## Troubleshooting

If you see errors about "column 'sender_encrypted_key' does not exist":
- The migration hasn't been run yet
- Follow Option 1 above to run it manually
