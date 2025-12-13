-- Migration: Fix employment_status constraint to match ProfileNew.jsx values
-- Date: December 13, 2025
-- Description: Update the check constraint to allow all employment status values used in the frontend

BEGIN;

    -- Drop the existing constraint
    ALTER TABLE alumni_profiles
    DROP CONSTRAINT IF EXISTS employment_status_valid;

    -- Add updated constraint with all values from both ProfileCompletion.jsx and ProfileNew.jsx
    ALTER TABLE alumni_profiles
    ADD CONSTRAINT employment_status_valid CHECK (
        employment_status IN (
            -- Values from ProfileCompletion.jsx (onboarding)
            'Employed',
            'Higher Studies',
            'Entrepreneur',
            'Self-employed',
            'Unemployed',
            'Looking for Opportunities',
            'Other',
            'Not specified',
            -- Additional values from ProfileNew.jsx (profile edit)
            'Employed Full-time',
            'Self-Employed / Entrepreneur',
            'Freelancing / Consulting',
            'Pursuing Higher Education',
            'Career Break'
        )
    );

    -- Update any existing 'Employed' values to 'Employed Full-time' for consistency
    -- (Only if they don't have a more specific status already)
    UPDATE alumni_profiles
SET employment_status = 'Employed Full-time'
WHERE employment_status = 'Employed';

    -- Update 'Entrepreneur' to 'Self-Employed / Entrepreneur' for consistency
    UPDATE alumni_profiles
SET employment_status = 'Self-Employed / Entrepreneur'
WHERE employment_status = 'Entrepreneur' OR employment_status = 'Self-employed';

    -- Update 'Higher Studies' to 'Pursuing Higher Education' for consistency
    UPDATE alumni_profiles
SET employment_status = 'Pursuing Higher Education'
WHERE employment_status = 'Higher Studies';

    COMMIT;

    -- Verify the constraint
    SELECT conname, pg_get_constraintdef(oid)
    FROM pg_constraint
    WHERE conname = 'employment_status_valid';
