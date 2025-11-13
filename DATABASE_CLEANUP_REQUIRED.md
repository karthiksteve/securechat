# 🚨 CRITICAL: Run This in Supabase SQL Editor Before Testing

## Go to: https://supabase.com/dashboard/project/xuyjhlfquuyfpttabgwf/sql

Copy and paste this SQL, then click **Run**:

```sql
-- Delete messages missing sender_encrypted_key (old/corrupted messages)
DELETE FROM public.messages WHERE sender_encrypted_key IS NULL;

-- Delete messages with invalid encryption data
DELETE FROM public.messages 
WHERE encrypted_content IS NULL 
   OR encrypted_content = '' 
   OR encrypted_key IS NULL 
   OR encrypted_key = ''
   OR iv IS NULL 
   OR iv = '';

-- Verify cleanup
SELECT 
  COUNT(*) as total_messages,
  COUNT(sender_encrypted_key) as messages_with_sender_key
FROM public.messages;
```

✅ This removes corrupted messages that cause "Decryption error: OperationError"

After running this:
1. Clear your browser localStorage (F12 → Application → Local Storage → Clear All)
2. Refresh the app
3. Sign up with 2 NEW test accounts
4. Send messages and verify they work
