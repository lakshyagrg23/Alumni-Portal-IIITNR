-- Rollback Script for Accreditation Dashboard Migrations
-- Date: 2025-11-15
-- CAUTION: This will remove all accreditation-related tables and columns
-- Only use this if you need to completely reverse the migrations

BEGIN;

\echo 'WARNING: This will remove all accreditation data!'
\echo 'Press Ctrl+C to cancel within 5 seconds...'
SELECT pg_sleep(5);

-- Drop new tables (in reverse order of creation)
\echo 'Dropping higher_education_data table...'
DROP TABLE IF EXISTS higher_education_data CASCADE;

\echo 'Dropping placement_data table...'
DROP TABLE IF EXISTS placement_data CASCADE;

\echo 'Dropping alumni_achievements table...'
DROP TABLE IF EXISTS alumni_achievements CASCADE;

\echo 'Dropping alumni_contributions table...'
DROP TABLE IF EXISTS alumni_contributions CASCADE;

-- Remove columns added to event_registrations
\echo 'Removing enhanced event registration columns...'
ALTER TABLE event_registrations
DROP COLUMN IF EXISTS check_in_time,
DROP COLUMN IF EXISTS check_out_time,
DROP COLUMN IF EXISTS attendance_duration_minutes,
DROP COLUMN IF EXISTS attendance_verified_by,
DROP COLUMN IF EXISTS attendance_verified_at,
DROP COLUMN IF EXISTS participation_score,
DROP COLUMN IF EXISTS certificate_issued,
DROP COLUMN IF EXISTS certificate_url,
DROP COLUMN IF EXISTS certificate_issued_at,
DROP COLUMN IF EXISTS skills_learned,
DROP COLUMN IF EXISTS would_recommend,
DROP COLUMN IF EXISTS testimonial,
DROP COLUMN IF EXISTS follow_up_completed,
DROP COLUMN IF EXISTS cancelled_at,
DROP COLUMN IF EXISTS cancellation_reason;

-- Remove columns added to alumni_profiles
\echo 'Removing accreditation fields from alumni_profiles...'
ALTER TABLE alumni_profiles
DROP COLUMN IF EXISTS current_employer,
DROP COLUMN IF EXISTS current_job_title,
DROP COLUMN IF EXISTS industry_sector,
DROP COLUMN IF EXISTS job_location,
DROP COLUMN IF EXISTS job_start_year,
DROP COLUMN IF EXISTS annual_salary_range,
DROP COLUMN IF EXISTS job_type,
DROP COLUMN IF EXISTS higher_study_institution,
DROP COLUMN IF EXISTS higher_study_program,
DROP COLUMN IF EXISTS higher_study_field,
DROP COLUMN IF EXISTS higher_study_country,
DROP COLUMN IF EXISTS higher_study_year,
DROP COLUMN IF EXISTS higher_study_status,
DROP COLUMN IF EXISTS alternate_email,
DROP COLUMN IF EXISTS current_address,
DROP COLUMN IF EXISTS permanent_address,
DROP COLUMN IF EXISTS profile_verified_at,
DROP COLUMN IF EXISTS verification_source,
DROP COLUMN IF EXISTS last_contact_date,
DROP COLUMN IF EXISTS consent_for_accreditation,
DROP COLUMN IF EXISTS consent_date,
DROP COLUMN IF EXISTS consent_ip_address,
DROP COLUMN IF EXISTS program,
DROP COLUMN IF EXISTS department,
DROP COLUMN IF EXISTS employment_status;

-- Drop triggers and functions
\echo 'Dropping triggers and functions...'
DROP TRIGGER IF EXISTS calculate_years_after_graduation_trigger ON alumni_achievements;
DROP FUNCTION IF EXISTS calculate_years_after_graduation();

-- Remove migration records
\echo 'Removing migration records...'
DELETE FROM schema_migrations WHERE migration_name IN (
    '001_add_accreditation_fields',
    '002_create_alumni_contributions',
    '003_create_alumni_achievements',
    '004_enhance_event_registrations',
    '005_create_placement_data',
    '006_create_higher_education_data',
    '007_extend_alumni_profiles'
);

COMMIT;

\echo 'Rollback completed successfully!'
\echo 'All accreditation-related changes have been removed.'
