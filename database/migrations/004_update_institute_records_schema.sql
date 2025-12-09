-- Migration: Update institute_records table schema
-- Version: 004
-- Date: 2025-12-06
-- Description: Add contact_number column and rename graduation_year to enrollment_year

-- =====================================================
-- PART 1: Add contact_number column
-- =====================================================

ALTER TABLE institute_records 
ADD COLUMN IF NOT EXISTS contact_number VARCHAR(20);

-- Add index for contact number searches
CREATE INDEX IF NOT EXISTS idx_institute_records_contact ON institute_records(contact_number);

-- Add comment
COMMENT ON COLUMN institute_records.contact_number IS 'Student/alumni contact phone number';

-- =====================================================
-- PART 2: Rename graduation_year to enrollment_year
-- =====================================================

-- Add new enrollment_year column
ALTER TABLE institute_records 
ADD COLUMN IF NOT EXISTS enrollment_year INTEGER;

-- Copy data from graduation_year to enrollment_year (if graduation_year exists and has data)
UPDATE institute_records 
SET enrollment_year = graduation_year 
WHERE graduation_year IS NOT NULL AND enrollment_year IS NULL;

-- Drop old constraint
ALTER TABLE institute_records 
DROP CONSTRAINT IF EXISTS valid_graduation_year;

-- Drop old column (only after data is copied)
ALTER TABLE institute_records 
DROP COLUMN IF EXISTS graduation_year;

-- Add new constraint for enrollment_year
ALTER TABLE institute_records 
ADD CONSTRAINT valid_enrollment_year CHECK (enrollment_year >= 2010 AND enrollment_year <= 2030);

-- Add comment
COMMENT ON COLUMN institute_records.enrollment_year IS 'Year of student enrollment/admission to the institute';

-- =====================================================
-- PART 3: Verification
-- =====================================================

DO $$
DECLARE
    record_count INTEGER;
BEGIN
    -- Check institute_records table
    SELECT COUNT(*) INTO record_count 
    FROM institute_records;
    RAISE NOTICE 'Institute records updated: % records', record_count;
    
    -- Verify new columns exist
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'institute_records' 
        AND column_name = 'contact_number'
    ) THEN
        RAISE NOTICE 'Column contact_number added successfully';
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'institute_records' 
        AND column_name = 'enrollment_year'
    ) THEN
        RAISE NOTICE 'Column enrollment_year added successfully';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'institute_records' 
        AND column_name = 'graduation_year'
    ) THEN
        RAISE NOTICE 'Column graduation_year removed successfully';
    END IF;
END $$;
