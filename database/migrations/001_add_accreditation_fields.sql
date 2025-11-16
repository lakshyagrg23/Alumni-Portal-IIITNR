-- Migration: Add Accreditation Fields to Alumni Profiles
-- Date: 2025-11-15
-- Description: Adds fields required for NAAC/NIRF/NBA accreditation reporting

-- Add employment tracking fields to alumni_profiles
ALTER TABLE alumni_profiles
ADD COLUMN IF NOT EXISTS current_employer VARCHAR(200),
ADD COLUMN IF NOT EXISTS current_job_title VARCHAR(200),
ADD COLUMN IF NOT EXISTS industry_sector VARCHAR(100),
ADD COLUMN IF NOT EXISTS job_location VARCHAR(200),
ADD COLUMN IF NOT EXISTS job_start_year INTEGER,
ADD COLUMN IF NOT EXISTS annual_salary_range VARCHAR(50), -- e.g., "5-10 LPA", "10-15 LPA"
ADD COLUMN IF NOT EXISTS job_type VARCHAR(50) CHECK (job_type IN ('Full-time', 'Part-time', 'Contract', 'Internship', 'Self-employed'));

-- Add higher education tracking fields
ALTER TABLE alumni_profiles
ADD COLUMN IF NOT EXISTS higher_study_institution VARCHAR(200),
ADD COLUMN IF NOT EXISTS higher_study_program VARCHAR(100), -- Master's, PhD, etc.
ADD COLUMN IF NOT EXISTS higher_study_field VARCHAR(100),
ADD COLUMN IF NOT EXISTS higher_study_country VARCHAR(100),
ADD COLUMN IF NOT EXISTS higher_study_year INTEGER,
ADD COLUMN IF NOT EXISTS higher_study_status VARCHAR(50) CHECK (higher_study_status IN ('Pursuing', 'Completed', 'Deferred', 'Dropped'));

-- Add contact verification fields
ALTER TABLE alumni_profiles
ADD COLUMN IF NOT EXISTS alternate_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS current_address TEXT,
ADD COLUMN IF NOT EXISTS permanent_address TEXT,
ADD COLUMN IF NOT EXISTS profile_verified_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS verification_source VARCHAR(50) CHECK (verification_source IN ('Self-reported', 'LinkedIn', 'Admin-verified', 'Email-verified', 'Phone-verified')),
ADD COLUMN IF NOT EXISTS last_contact_date DATE;

-- Add accreditation consent fields
ALTER TABLE alumni_profiles
ADD COLUMN IF NOT EXISTS consent_for_accreditation BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS consent_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS consent_ip_address INET;

-- Add program/department fields if missing (some may already exist)
ALTER TABLE alumni_profiles
ADD COLUMN IF NOT EXISTS program VARCHAR(100), -- BTech CSE, MTech ECE, etc.
ADD COLUMN IF NOT EXISTS department VARCHAR(100); -- CSE, ECE, etc.

-- Add employment status tracking
ALTER TABLE alumni_profiles
ADD COLUMN IF NOT EXISTS employment_status VARCHAR(50) DEFAULT 'Not specified' 
    CHECK (employment_status IN ('Employed', 'Self-employed', 'Higher Studies', 'Entrepreneur', 'Unemployed', 'Not specified'));

-- Update existing records to have department from branch if available
UPDATE alumni_profiles 
SET department = branch 
WHERE department IS NULL AND branch IS NOT NULL;

-- Create indexes for accreditation queries
CREATE INDEX IF NOT EXISTS idx_alumni_employment_status ON alumni_profiles(employment_status);
CREATE INDEX IF NOT EXISTS idx_alumni_graduation_year_program ON alumni_profiles(graduation_year, program);
CREATE INDEX IF NOT EXISTS idx_alumni_current_employer ON alumni_profiles(current_employer) WHERE current_employer IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_alumni_higher_study ON alumni_profiles(higher_study_institution) WHERE higher_study_institution IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_alumni_industry_sector ON alumni_profiles(industry_sector) WHERE industry_sector IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_alumni_consent ON alumni_profiles(consent_for_accreditation, consent_date);
CREATE INDEX IF NOT EXISTS idx_alumni_verification ON alumni_profiles(profile_verified_at, verification_source);

-- Add comment for documentation
COMMENT ON COLUMN alumni_profiles.consent_for_accreditation IS 'Alumni consent to use their data for accreditation purposes (NAAC/NIRF/NBA)';
COMMENT ON COLUMN alumni_profiles.employment_status IS 'Current employment status for placement statistics';
COMMENT ON COLUMN alumni_profiles.verification_source IS 'Source of profile data verification';
