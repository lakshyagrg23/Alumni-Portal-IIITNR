-- 002_add_onboarding_flag.sql
-- Add onboarding_completed flag to users table to track profile completion

BEGIN;

-- Add onboarding_completed column (default false)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;

-- Update existing users: mark as completed if they have an alumni profile
UPDATE users u
SET onboarding_completed = TRUE
WHERE EXISTS (
    SELECT 1 FROM alumni_profiles ap 
    WHERE ap.user_id = u.id
    AND ap.first_name IS NOT NULL 
    AND ap.last_name IS NOT NULL
    AND ap.graduation_year IS NOT NULL
);

COMMIT;

-- Usage:
-- psql -d <your_database_name> -f database/migrations/002_add_onboarding_flag.sql
