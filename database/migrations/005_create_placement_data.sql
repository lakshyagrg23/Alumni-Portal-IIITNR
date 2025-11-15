-- Migration: Create Placement Data Table
-- Date: 2025-11-15
-- Description: Dedicated table for placement data tracking (separate from work_experiences)

CREATE TABLE IF NOT EXISTS placement_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    alumni_id UUID REFERENCES alumni_profiles(id) ON DELETE CASCADE,
    
    -- Placement Details
    company_name VARCHAR(200) NOT NULL,
    job_title VARCHAR(200) NOT NULL,
    job_location VARCHAR(200),
    job_type VARCHAR(50) CHECK (job_type IN ('Full-time', 'Internship', 'Part-time', 'Contract')),
    
    -- Compensation
    salary_package DECIMAL(12,2), -- Annual CTC in INR (in lakhs)
    currency VARCHAR(10) DEFAULT 'INR',
    salary_range VARCHAR(50), -- e.g., "5-10 LPA"
    other_benefits TEXT, -- Stock options, signing bonus, etc.
    
    -- Placement Timeline
    offer_received_date DATE,
    joining_date DATE,
    placement_year INTEGER NOT NULL,
    placement_season VARCHAR(50), -- 'Campus', 'Off-campus', 'Pool-campus'
    
    -- Academic Context
    graduation_year INTEGER,
    program VARCHAR(100), -- BTech CSE, MTech ECE, etc.
    department VARCHAR(100),
    cgpa DECIMAL(4,2),
    
    -- Industry Classification
    industry_sector VARCHAR(100),
    company_type VARCHAR(50) CHECK (company_type IN (
        'Product',
        'Service',
        'Startup',
        'MNC',
        'PSU',
        'Government',
        'Research',
        'NGO'
    )),
    company_size VARCHAR(50), -- 'Large (>1000)', 'Medium (100-1000)', 'Small (<100)'
    
    -- Job Category
    job_category VARCHAR(100), -- 'Software Development', 'Data Science', 'Consulting', etc.
    job_role_type VARCHAR(50) CHECK (job_role_type IN (
        'Technical',
        'Non-Technical',
        'Research',
        'Management'
    )),
    
    -- Placement Process
    placement_type VARCHAR(50) CHECK (placement_type IN (
        'Campus Placement',
        'Off-Campus',
        'Pool Campus',
        'PPO (Pre-Placement Offer)',
        'Internship to FTE'
    )),
    number_of_rounds INTEGER,
    interview_experience TEXT,
    
    -- Verification
    offer_letter_url VARCHAR(500),
    verification_status VARCHAR(50) DEFAULT 'pending' CHECK (verification_status IN (
        'pending',
        'verified',
        'rejected'
    )),
    verified_by UUID REFERENCES users(id),
    verified_at TIMESTAMP,
    
    -- Privacy
    is_anonymous BOOLEAN DEFAULT FALSE,
    show_salary BOOLEAN DEFAULT FALSE,
    show_company BOOLEAN DEFAULT TRUE,
    
    -- Metadata
    notes TEXT,
    data_source VARCHAR(50) DEFAULT 'Self-reported', -- 'Self-reported', 'Admin-entry', 'Import'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure one primary placement record per student per year
    UNIQUE(alumni_id, placement_year, placement_type)
);

-- Indexes for placement analytics
CREATE INDEX idx_placement_company ON placement_data(company_name);
CREATE INDEX idx_placement_year_program ON placement_data(placement_year, program);
CREATE INDEX idx_placement_department ON placement_data(department, placement_year);
CREATE INDEX idx_placement_salary ON placement_data(salary_package) WHERE salary_package IS NOT NULL;
CREATE INDEX idx_placement_industry ON placement_data(industry_sector);
CREATE INDEX idx_placement_type ON placement_data(placement_type);
CREATE INDEX idx_placement_verification ON placement_data(verification_status);
CREATE INDEX idx_placement_graduation_year ON placement_data(graduation_year);

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_placement_data_updated_at 
    BEFORE UPDATE ON placement_data 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE placement_data IS 'Detailed placement records for accreditation and analytics';
COMMENT ON COLUMN placement_data.salary_package IS 'Annual CTC in lakhs (INR)';
COMMENT ON COLUMN placement_data.placement_season IS 'How student was placed (campus/off-campus/pool)';
COMMENT ON COLUMN placement_data.is_anonymous IS 'Whether to hide student identity in reports';
