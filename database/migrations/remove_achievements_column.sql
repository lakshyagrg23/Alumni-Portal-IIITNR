-- Migration: Remove achievements column from alumni_profiles table
-- Created: 2025-10-05
-- Reason: Achievements field is being removed from the application

-- Step 1: Check if the column exists before dropping (safe migration)
DO $
$ 
BEGIN
    IF EXISTS (
        SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'alumni_profiles'
        AND column_name = 'achievements'
    ) THEN
    -- Step 2: Drop the achievements column
    ALTER TABLE alumni_profiles DROP COLUMN achievements;
    RAISE NOTICE 'achievements column has been successfully dropped from alumni_profiles table';
ELSE
        RAISE NOTICE 'achievements column does not exist in alumni_profiles table - no action needed';
END
IF;
END $$;

-- Verify the column has been removed
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'alumni_profiles'
ORDER BY ordinal_position;
