-- Migration: Add UNIQUE constraint on institute_record_id
-- Version: 012
-- Date: 2025-12-18
-- Description: Prevent duplicate accounts from linking to the same institute record
-- This is a safety net constraint to ensure data integrity

-- Add UNIQUE constraint on institute_record_id
-- Note: PostgreSQL allows multiple NULLs, so duplicates can only happen for non-NULL values
ALTER TABLE users 
ADD CONSTRAINT unique_institute_record_id UNIQUE (institute_record_id) 
WHERE institute_record_id IS NOT NULL;

-- Comment on constraint
COMMENT ON CONSTRAINT unique_institute_record_id ON users 
IS 'Ensures each institute record can only be linked to one user account to prevent duplicate alumni entries';
