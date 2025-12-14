-- =============================================
-- Migration: Add Personal Email Fields
-- Version: 011
-- Date: December 14, 2025
-- Description: Add personal email support for alumni to maintain connectivity after graduation
-- =============================================

BEGIN;

-- Add personal email fields to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS personal_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS personal_email_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS personal_email_verification_token VARCHAR(255),
ADD COLUMN IF NOT EXISTS personal_email_verification_token_expires TIMESTAMP,
ADD COLUMN IF NOT EXISTS institute_email_status VARCHAR(20) DEFAULT 'active' 
    CHECK (institute_email_status IN ('active', 'bounced', 'expired'));

-- Create index on personal_email for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_personal_email ON users(personal_email);

-- Create index on verification token
CREATE INDEX IF NOT EXISTS idx_users_personal_email_token ON users(personal_email_verification_token);

-- Add comment to document the fields
COMMENT ON COLUMN users.personal_email IS 'Secondary email for long-term connectivity after institute email expires';
COMMENT ON COLUMN users.personal_email_verified IS 'Whether personal email has been verified by the user';
COMMENT ON COLUMN users.personal_email_verification_token IS 'Token for verifying personal email address';
COMMENT ON COLUMN users.personal_email_verification_token_expires IS 'Expiration timestamp for personal email verification token';
COMMENT ON COLUMN users.institute_email_status IS 'Status of institute email: active, bounced, or expired';

COMMIT;
