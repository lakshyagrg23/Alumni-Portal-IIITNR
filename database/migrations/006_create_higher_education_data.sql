-- Migration: Create Higher Education Data Table
-- Date: 2025-11-15
-- Description: Dedicated table for tracking alumni pursuing higher education

CREATE TABLE IF NOT EXISTS higher_education_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    alumni_id UUID REFERENCES alumni_profiles(id) ON DELETE CASCADE,
    
    -- Institution Details
    institution_name VARCHAR(200) NOT NULL,
    institution_type VARCHAR(50) CHECK (institution_type IN (
        'University',
        'Institute',
        'Research Center',
        'Company (Corporate Program)'
    )),
    institution_country VARCHAR(100) NOT NULL,
    institution_state VARCHAR(100),
    institution_city VARCHAR(100),
    institution_ranking VARCHAR(100), -- QS/THE/NIRF rank
    
    -- Program Details
    program_level VARCHAR(50) NOT NULL CHECK (program_level IN (
        'Masters',
        'MS',
        'PhD',
        'Post-Doc',
        'MBA',
        'Certificate',
        'Diploma'
    )),
    program_name VARCHAR(200) NOT NULL,
    field_of_study VARCHAR(100) NOT NULL,
    specialization VARCHAR(200),
    program_duration_years DECIMAL(3,1), -- e.g., 2.0, 1.5
    
    -- Timeline
    admission_year INTEGER NOT NULL,
    start_date DATE,
    expected_completion_date DATE,
    actual_completion_date DATE,
    status VARCHAR(50) DEFAULT 'Pursuing' CHECK (status IN (
        'Pursuing',
        'Completed',
        'Deferred',
        'Dropped',
        'On Hold'
    )),
    
    -- Academic Performance
    gpa DECIMAL(4,2),
    grade_scale VARCHAR(20), -- '4.0', '10.0', 'Percentage'
    thesis_title VARCHAR(500),
    advisor_name VARCHAR(200),
    
    -- Financial Support
    funding_type VARCHAR(50) CHECK (funding_type IN (
        'Self-funded',
        'Scholarship',
        'Fellowship',
        'Assistantship',
        'Employer-sponsored',
        'Government Grant',
        'Mixed'
    )),
    funding_details TEXT,
    scholarship_name VARCHAR(200),
    
    -- Admission Process
    entrance_exam VARCHAR(100), -- GRE, GATE, GMAT, CAT, etc.
    entrance_score VARCHAR(50),
    admission_category VARCHAR(50) CHECK (admission_category IN (
        'Regular',
        'Direct Admission',
        'Industry Collaboration',
        'Research Position'
    )),
    
    -- Undergraduate Context (IIIT NR)
    ug_graduation_year INTEGER,
    ug_program VARCHAR(100),
    ug_department VARCHAR(100),
    ug_cgpa DECIMAL(4,2),
    
    -- Verification
    offer_letter_url VARCHAR(500),
    enrollment_proof_url VARCHAR(500),
    degree_certificate_url VARCHAR(500),
    verification_status VARCHAR(50) DEFAULT 'pending' CHECK (verification_status IN (
        'pending',
        'verified',
        'rejected'
    )),
    verified_by UUID REFERENCES users(id),
    verified_at TIMESTAMP,
    
    -- Additional Details
    reasons_for_higher_studies TEXT,
    career_goals TEXT,
    research_area TEXT,
    publications_count INTEGER DEFAULT 0,
    
    -- Privacy
    is_public BOOLEAN DEFAULT TRUE,
    
    -- Metadata
    data_source VARCHAR(50) DEFAULT 'Self-reported',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for higher education analytics
CREATE INDEX idx_higher_ed_alumni ON higher_education_data(alumni_id);
CREATE INDEX idx_higher_ed_institution ON higher_education_data(institution_name, institution_country);
CREATE INDEX idx_higher_ed_program ON higher_education_data(program_level, field_of_study);
CREATE INDEX idx_higher_ed_year ON higher_education_data(admission_year);
CREATE INDEX idx_higher_ed_status ON higher_education_data(status);
CREATE INDEX idx_higher_ed_country ON higher_education_data(institution_country);
CREATE INDEX idx_higher_ed_ug_year ON higher_education_data(ug_graduation_year, ug_program);
CREATE INDEX idx_higher_ed_verification ON higher_education_data(verification_status);

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_higher_education_data_updated_at 
    BEFORE UPDATE ON higher_education_data 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE higher_education_data IS 'Tracks alumni pursuing higher education for accreditation reporting';
COMMENT ON COLUMN higher_education_data.program_level IS 'Level of higher education (Masters, PhD, etc.)';
COMMENT ON COLUMN higher_education_data.funding_type IS 'How the education is funded';
COMMENT ON COLUMN higher_education_data.ug_graduation_year IS 'Year graduated from IIIT NR (undergraduate)';
