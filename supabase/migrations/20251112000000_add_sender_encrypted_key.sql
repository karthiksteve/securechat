-- Add column to store encrypted key for the sender
ALTER TABLE public.messages ADD COLUMN sender_encrypted_key TEXT;

-- Update existing messages to have sender_encrypted_key (will be null for old messages)
-- New messages will have both sender_encrypted_key and encrypted_key (for recipient)
