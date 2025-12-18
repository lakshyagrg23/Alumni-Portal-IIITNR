-- Migration: Add indexes for email verification performance
-- Version: 013
-- Date: 2025-12-18
-- Description: Add indexes on email_verification_token and email_verified columns
--              to prevent timeout issues during email verification

BEGIN;

-- Index on email_verification_token for faster token lookups during verification
-- This is critical for the /verify-email endpoint
CREATE INDEX IF NOT EXISTS idx_users_email_verification_token 
ON users(email_verification_token) 
WHERE email_verification_token IS NOT NULL;

-- Index on email_verified for faster queries filtering verified/unverified users
CREATE INDEX IF NOT EXISTS idx_users_email_verified 
ON users(email_verified);

-- Index on email column (if not already indexed)
-- Used for duplicate checking and user lookups
CREATE INDEX IF NOT EXISTS idx_users_email 
ON users(LOWER(email));

-- Index on created_at for sorting and filtering by registration date
CREATE INDEX IF NOT EXISTS idx_users_created_at 
ON users(created_at DESC);

-- Comment on indexes
COMMENT ON INDEX idx_users_email_verification_token IS 
'Indexes email_verification_token for fast token lookups during email verification process';

COMMENT ON INDEX idx_users_email_verified IS 
'Indexes email_verified status for filtering verified/unverified users';

COMMENT ON INDEX idx_users_email IS 
'Indexes lowercased email for case-insensitive lookups and duplicate detection';

COMMIT;
