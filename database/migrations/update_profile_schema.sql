-- Migration: Update Profile Schema
-- Description: Restructure alumni_profiles table with new required fields
-- Date: December 12, 2025

BEGIN;

-- Add new columns for professional details
ALTER TABLE alumni_profiles
ADD COLUMN IF NOT EXISTS employment_status VARCHAR(100),
ADD COLUMN IF NOT EXISTS target_role VARCHAR(200),
ADD COLUMN IF NOT EXISTS institution_name VARCHAR(200),      -- for higher education
ADD COLUMN IF NOT EXISTS expected_completion_year INTEGER;   -- for students

-- Add / rename industry column (separate ALTER TABLE, no comma allowed here)
ALTER TABLE alumni_profiles
ADD COLUMN IF NOT EXISTS industry VARCHAR(150);

-- Add career and engagement columns
ALTER TABLE alumni_profiles
ADD COLUMN IF NOT EXISTS career_goals TEXT[],
ADD COLUMN IF NOT EXISTS professional_interests TEXT[],
ADD COLUMN IF NOT EXISTS interested_in_mentoring BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS open_to_referrals BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS available_for_speaking BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS twitter_url VARCHAR(300);

-- Remove deprecated columns
ALTER TABLE alumni_profiles
DROP COLUMN IF EXISTS phone,
DROP COLUMN IF EXISTS date_of_birth,
DROP COLUMN IF EXISTS cgpa,
DROP COLUMN IF EXISTS bio,
DROP COLUMN IF EXISTS is_profile_public,
DROP COLUMN IF EXISTS show_contact_info,
DROP COLUMN IF EXISTS show_work_info,
DROP COLUMN IF EXISTS show_academic_info;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_alumni_employment_status ON alumni_profiles(employment_status);
CREATE INDEX IF NOT EXISTS idx_alumni_industry ON alumni_profiles(industry);
CREATE INDEX IF NOT EXISTS idx_alumni_professional_interests ON alumni_profiles USING GIN (professional_interests);

-- Fix NULL boolean fields
UPDATE alumni_profiles
SET 
  interested_in_mentoring = COALESCE(interested_in_mentoring, FALSE),
  open_to_referrals       = COALESCE(open_to_referrals, FALSE),
  available_for_speaking  = COALESCE(available_for_speaking, FALSE)
WHERE interested_in_mentoring IS NULL 
   OR open_to_referrals IS NULL 
   OR available_for_speaking IS NULL;

COMMIT;

DO $$
BEGIN
  RAISE NOTICE 'Profile schema migration completed successfully';
END $$;
