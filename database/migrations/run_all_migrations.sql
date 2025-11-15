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
    ('006_create_higher_education_data')
ON CONFLICT (migration_name) DO NOTHING;

-- Commit transaction
COMMIT;

\echo 'All migrations completed successfully!'
\echo 'Run SELECT * FROM schema_migrations; to verify applied migrations'
