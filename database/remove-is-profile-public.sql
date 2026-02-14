-- Remove is_profile_public column from alumni_profiles table
-- This fixes the error: column "is_profile_public" does not exist

BEGIN;

    -- Check if column exists and drop it
    DO $$ 
    BEGIN
        IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'alumni_profiles'
            AND column_name = 'is_profile_public'
    ) THEN
        ALTER TABLE alumni_profiles DROP COLUMN is_profile_public;
        RAISE NOTICE 'Column is_profile_public has been dropped successfully';
    ELSE
        RAISE NOTICE 'Column is_profile_public does not exist - no action needed';
END
IF;
END $$;

COMMIT;

-- Verify the column is gone
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'alumni_profiles'
    AND column_name = 'is_profile_public';
