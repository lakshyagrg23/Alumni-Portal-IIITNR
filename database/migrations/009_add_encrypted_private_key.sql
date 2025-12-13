-- Add encrypted_private_key column to public_keys table for cross-device support
-- This allows users to decrypt messages on any device they log in from

ALTER TABLE public.public_keys 
ADD COLUMN IF NOT EXISTS encrypted_private_key TEXT;

COMMENT ON COLUMN public.public_keys.encrypted_private_key IS 'User private key encrypted with password-derived key for cross-device message decryption';
