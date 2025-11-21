-- Migration: Extend alumni_profiles with onboarding/profile fields used by the app
-- Date: 2026-01-15
-- Description: Adds missing columns and relaxes employment status constraint to match UI options

-- Ensure the employment_status column exists and accepts all UI options
ALTER TABLE alumni_profiles
    ADD COLUMN IF NOT EXISTS employment_status VARCHAR(50) DEFAULT 'Not specified';

-- Replace the employment_status check constraint with one that matches current frontend values
ALTER TABLE alumni_profiles
    DROP CONSTRAINT IF EXISTS alumni_profiles_employment_status_check,
    ADD CONSTRAINT employment_status_valid CHECK (
        employment_status IN (
            'Employed',
            'Higher Studies',
            'Entrepreneur',
            'Self-employed',
            'Unemployed',
            'Looking for Opportunities',
            'Other',
            'Not specified'
        )
    );

-- Add or backfill extended profile fields
ALTER TABLE alumni_profiles
    ADD COLUMN IF NOT EXISTS current_employer VARCHAR(200),
    ADD COLUMN IF NOT EXISTS current_job_title VARCHAR(200),
    ADD COLUMN IF NOT EXISTS industry_sector VARCHAR(100),
    ADD COLUMN IF NOT EXISTS job_location VARCHAR(200),
    ADD COLUMN IF NOT EXISTS job_start_year INTEGER,
    ADD COLUMN IF NOT EXISTS annual_salary_range VARCHAR(50),
    ADD COLUMN IF NOT EXISTS job_type VARCHAR(50) CHECK (job_type IN ('Full-time', 'Part-time', 'Contract', 'Internship', 'Self-employed')),
    ADD COLUMN IF NOT EXISTS higher_study_institution VARCHAR(200),
    ADD COLUMN IF NOT EXISTS higher_study_program VARCHAR(100),
    ADD COLUMN IF NOT EXISTS higher_study_field VARCHAR(100),
    ADD COLUMN IF NOT EXISTS higher_study_country VARCHAR(100),
    ADD COLUMN IF NOT EXISTS higher_study_year INTEGER,
    ADD COLUMN IF NOT EXISTS higher_study_status VARCHAR(50) CHECK (higher_study_status IN ('Pursuing', 'Completed', 'Deferred', 'Dropped')),
    ADD COLUMN IF NOT EXISTS consent_for_accreditation BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS consent_date TIMESTAMP,
    ADD COLUMN IF NOT EXISTS consent_ip_address INET,
    ADD COLUMN IF NOT EXISTS program VARCHAR(100),
    ADD COLUMN IF NOT EXISTS department VARCHAR(100),
    ADD COLUMN IF NOT EXISTS alternate_email VARCHAR(255),
    ADD COLUMN IF NOT EXISTS current_address TEXT,
    ADD COLUMN IF NOT EXISTS permanent_address TEXT,
    ADD COLUMN IF NOT EXISTS profile_verified_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS verification_source VARCHAR(50),
    ADD COLUMN IF NOT EXISTS last_contact_date DATE;

-- Helpful indexes for reporting and lookups
CREATE INDEX IF NOT EXISTS idx_alumni_employment_status ON alumni_profiles(employment_status);
CREATE INDEX IF NOT EXISTS idx_alumni_graduation_year_program ON alumni_profiles(graduation_year, program);
CREATE INDEX IF NOT EXISTS idx_alumni_current_employer ON alumni_profiles(current_employer) WHERE current_employer IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_alumni_higher_study ON alumni_profiles(higher_study_institution) WHERE higher_study_institution IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_alumni_industry_sector ON alumni_profiles(industry_sector) WHERE industry_sector IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_alumni_consent ON alumni_profiles(consent_for_accreditation, consent_date);
CREATE INDEX IF NOT EXISTS idx_alumni_verification ON alumni_profiles(profile_verified_at, verification_source);
