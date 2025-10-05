-- Migration: Add email verification token expiry column
-- Date: 2025-10-05
-- Description: Adds expiration timestamp for email verification tokens

-- Add email verification token expiry column
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS email_verification_token_expires TIMESTAMP;

-- Ensure proper defaults for verification columns
ALTER TABLE users 
ALTER COLUMN email_verified SET DEFAULT FALSE;

ALTER TABLE users 
ALTER COLUMN is_approved SET DEFAULT FALSE;

-- Create index for faster token lookups
CREATE INDEX IF NOT EXISTS idx_users_verification_token 
ON users(email_verification_token) 
WHERE email_verification_token IS NOT NULL;

-- Create index for email lookups
CREATE INDEX IF NOT EXISTS idx_users_email_lower 
ON users(LOWER(email));

-- Comment for documentation
COMMENT ON COLUMN users.email_verification_token_expires IS 'Timestamp when the email verification token expires (typically 24 hours after generation)';
