-- Migration: Add institute records table and update users table for dual registration paths
-- Version: 003
-- Date: 2025-11-21
-- Description: Support for institute email vs personal email registration with identity verification

-- =====================================================
-- PART 1: Create institute_records table
-- =====================================================

-- Create table for storing institute alumni records (for verification)
CREATE TABLE
IF NOT EXISTS institute_records
(
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4
(),
    roll_number VARCHAR
(50) UNIQUE NOT NULL,
    full_name VARCHAR
(200) NOT NULL,
    date_of_birth DATE NOT NULL,
    graduation_year INTEGER,
    degree VARCHAR
(100),
    branch VARCHAR
(100),
    institute_email VARCHAR
(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_graduation_year CHECK
(graduation_year >= 2010 AND graduation_year <= 2030)
);

-- Create indexes for fast verification queries
CREATE INDEX
IF NOT EXISTS idx_institute_records_rollnum ON institute_records
(roll_number);
CREATE INDEX
IF NOT EXISTS idx_institute_records_verification ON institute_records
(roll_number, date_of_birth);
CREATE INDEX
IF NOT EXISTS idx_institute_records_name ON institute_records
(LOWER
(full_name));

-- Add comment
COMMENT ON TABLE institute_records IS 'Stores verified alumni records from institute for identity verification during personal email registration';

-- =====================================================
-- PART 2: Update users table
-- =====================================================

-- Add new columns to users table
ALTER TABLE users 
ADD COLUMN
IF NOT EXISTS institute_record_id UUID REFERENCES institute_records
(id),
ADD COLUMN
IF NOT EXISTS registration_path VARCHAR
(20) DEFAULT 'institute_email' 
    CHECK
(registration_path IN
('institute_email', 'personal_email', 'oauth'));

-- Create index for registration path queries
CREATE INDEX
IF NOT EXISTS idx_users_registration_path ON users
(registration_path);

-- Add comments
COMMENT ON COLUMN users.institute_record_id IS 'Links to institute_records table if user registered via personal email path';
COMMENT ON COLUMN users.registration_path IS 'Tracks how user registered: institute_email, personal_email, or oauth';

-- =====================================================
-- PART 3: Insert dummy/sample data for testing
-- =====================================================

-- Insert sample institute records (dummy data for testing)
INSERT INTO institute_records
    (roll_number, full_name, date_of_birth, graduation_year, degree, branch, institute_email)
VALUES
    -- Batch 2023 - Computer Science
    ('19115001', 'Rahul Kumar Sharma', '2001-08-15', 2023, 'B.Tech', 'Computer Science & Engineering', '19115001@iiitnr.edu.in'),
    ('19115002', 'Priya Singh', '2001-11-22', 2023, 'B.Tech', 'Computer Science & Engineering', '19115002@iiitnr.edu.in'),
    ('19115003', 'Amit Patel', '2001-05-10', 2023, 'B.Tech', 'Computer Science & Engineering', '19115003@iiitnr.edu.in'),
    ('19115004', 'Sneha Gupta', '2001-09-28', 2023, 'B.Tech', 'Computer Science & Engineering', '19115004@iiitnr.edu.in'),
    ('19115005', 'Vikram Reddy', '2001-03-17', 2023, 'B.Tech', 'Computer Science & Engineering', '19115005@iiitnr.edu.in'),

    -- Batch 2023 - Electronics & Communication
    ('19125001', 'Anjali Verma', '2001-12-05', 2023, 'B.Tech', 'Electronics & Communication Engineering', '19125001@iiitnr.edu.in'),
    ('19125002', 'Rohan Mehta', '2001-07-14', 2023, 'B.Tech', 'Electronics & Communication Engineering', '19125002@iiitnr.edu.in'),
    ('19125003', 'Kavya Iyer', '2001-10-20', 2023, 'B.Tech', 'Electronics & Communication Engineering', '19125003@iiitnr.edu.in'),

    -- Batch 2022 - Computer Science
    ('18115001', 'Arjun Desai', '2000-06-12', 2022, 'B.Tech', 'Computer Science & Engineering', '18115001@iiitnr.edu.in'),
    ('18115002', 'Divya Nair', '2000-04-25', 2022, 'B.Tech', 'Computer Science & Engineering', '18115002@iiitnr.edu.in'),
    ('18115003', 'Karthik Raj', '2000-08-30', 2022, 'B.Tech', 'Computer Science & Engineering', '18115003@iiitnr.edu.in'),

    -- Batch 2024 - Data Science
    ('20135001', 'Neha Agarwal', '2002-02-18', 2024, 'B.Tech', 'Data Science & Artificial Intelligence', '20135001@iiitnr.edu.in'),
    ('20135002', 'Siddharth Joshi', '2002-11-08', 2024, 'B.Tech', 'Data Science & Artificial Intelligence', '20135002@iiitnr.edu.in'),

    -- M.Tech Students
    ('21215001', 'Dr. Ananya Krishnan', '1998-03-21', 2023, 'M.Tech', 'Computer Science & Engineering', '21215001@iiitnr.ac.in'),
    ('21215002', 'Rajesh Kumar', '1999-09-15', 2023, 'M.Tech', 'Electronics & Communication Engineering', '21215002@iiitnr.ac.in'),

    -- PhD Students
    ('20315001', 'Prof. Suresh Babu', '1995-12-10', 2025, 'PhD', 'Computer Science & Engineering', '20315001@iiitnr.ac.in')
ON CONFLICT
(roll_number) DO NOTHING;

-- =====================================================
-- PART 4: Update existing users (if any)
-- =====================================================

-- Set registration_path for existing users based on their provider
UPDATE users 
SET registration_path = CASE 
    WHEN provider = 'google' OR provider = 'linkedin' THEN 'oauth'
    ELSE 'institute_email'
END
WHERE registration_path IS NULL;

-- =====================================================
-- PART 5: Verification
-- =====================================================

-- Verify the migration
DO $$
DECLARE
    record_count INTEGER;
    user_columns_exist BOOLEAN;
BEGIN
    -- Check institute_records table
    SELECT COUNT(*)
    INTO record_count
    FROM institute_records;
    RAISE NOTICE 'Institute records created: % records', record_count;

-- Check users table columns
SELECT EXISTS
(
        SELECT 1
FROM information_schema.columns
WHERE table_name = 'users'
    AND column_name IN ('institute_record_id', 'registration_path')
    )
INTO user_columns_exist;

IF user_columns_exist THEN
        RAISE NOTICE 'Users table columns added successfully';
    ELSE
        RAISE WARNING 'Users table columns may not have been added';
END
IF;
    
    RAISE NOTICE 'Migration 003 completed successfully!';
END $$;
