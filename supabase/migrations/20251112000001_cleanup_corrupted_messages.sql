-- Clean up corrupted or incomplete messages
-- Run this in Supabase SQL Editor if you're seeing decryption errors

-- Option 1: Delete ALL existing messages (fresh start)
-- Uncomment the line below to use this option:
-- DELETE FROM public.messages;

-- Option 2: Delete only messages missing sender_encrypted_key (sent before migration)
DELETE FROM public.messages 
WHERE sender_encrypted_key IS NULL;

-- Option 3: Delete messages with invalid/empty encryption data
DELETE FROM public.messages 
WHERE encrypted_content IS NULL 
   OR encrypted_content = '' 
   OR encrypted_key IS NULL 
   OR encrypted_key = ''
   OR iv IS NULL 
   OR iv = '';

-- Verify cleanup
SELECT COUNT(*) as remaining_messages FROM public.messages;
