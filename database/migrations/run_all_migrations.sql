-- Master Migration Script for Accreditation Dashboard
-- Date: 2025-11-15
-- Run this file to apply all accreditation-related database changes

-- Check PostgreSQL version
SELECT version();

-- Start transaction
BEGIN;

-- Migration 001: Add Accreditation Fields to Alumni Profiles
\echo 'Running migration 001: Add accreditation fields...'
\i 001_add_accreditation_fields.sql

-- Migration 002: Create Alumni Contributions Table
\echo 'Running migration 002: Create alumni contributions table...'
\i 002_create_alumni_contributions.sql

-- Migration 003: Create Alumni Achievements Table
\echo 'Running migration 003: Create alumni achievements table...'
\i 003_create_alumni_achievements.sql

-- Migration 004: Enhance Event Registrations
\echo 'Running migration 004: Enhance event registrations...'
\i 004_enhance_event_registrations.sql

-- Migration 005: Create Placement Data Table
\echo 'Running migration 005: Create placement data table...'
\i 005_create_placement_data.sql

-- Migration 006: Create Higher Education Data Table
\echo 'Running migration 006: Create higher education data table...'
\i 006_create_higher_education_data.sql

\echo 'Running migration 007: Extend alumni_profiles with onboarding fields...'
\i 007_extend_alumni_profiles.sql

\echo 'Running migration 008: Accreditation dashboard functions...'
\i 008_accreditation_v2_functions.sql

\echo 'Running migration 008b: Superadmin role and permissions...'
\i 008_add_superadmin_and_permissions.sql

\echo 'Running migration 009: Add encrypted private key column for messaging...'
\i 009_add_encrypted_private_key.sql

\echo 'Running migration 009b: Fix employment_status constraint...'
\i 009_fix_employment_status_constraint.sql

-- Create migration tracking table
CREATE TABLE IF NOT EXISTS schema_migrations (
    id SERIAL PRIMARY KEY,
    migration_name VARCHAR(255) NOT NULL UNIQUE,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    applied_by VARCHAR(100) DEFAULT CURRENT_USER
);

-- Record applied migrations
INSERT INTO schema_migrations (migration_name) VALUES
    ('001_add_accreditation_fields'),
    ('002_create_alumni_contributions'),
    ('003_create_alumni_achievements'),
    ('004_enhance_event_registrations'),
    ('005_create_placement_data'),
    ('006_create_higher_education_data'),
    ('007_extend_alumni_profiles'),
    ('008_accreditation_v2_functions'),
    ('008_add_superadmin_and_permissions'),
    ('009_add_encrypted_private_key'),
    ('009_fix_employment_status_constraint')
ON CONFLICT (migration_name) DO NOTHING;

-- Commit transaction
COMMIT;

\echo 'All migrations completed successfully!'
\echo 'Run SELECT * FROM schema_migrations; to verify applied migrations'
