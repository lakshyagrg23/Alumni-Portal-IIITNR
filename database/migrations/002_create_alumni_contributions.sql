-- Migration: Create Alumni Contributions Table
-- Date: 2025-11-15
-- Description: Track alumni contributions for accreditation (donations, lectures, mentorship, etc.)

CREATE TABLE IF NOT EXISTS alumni_contributions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    alumni_id UUID REFERENCES alumni_profiles(id) ON DELETE CASCADE,
    
    -- Contribution Type
    type VARCHAR(50) NOT NULL CHECK (type IN (
        'donation',
        'guest_lecture',
        'mentorship',
        'internship_offered',
        'job_recruitment',
        'industry_project',
        'research_collaboration',
        'workshop_conducted',
        'advisory_board',
        'other'
    )),
    
    -- Contribution Details
    title VARCHAR(300) NOT NULL,
    description TEXT,
    organization VARCHAR(200), -- Institute or external organization
    amount DECIMAL(12,2), -- For donations or monetary value
    currency VARCHAR(10) DEFAULT 'INR',
    
    -- Date Information
    contribution_date DATE NOT NULL,
    academic_year VARCHAR(20), -- e.g., "2024-25"
    
    -- Impact Metrics
    students_impacted INTEGER, -- Number of students benefited
    duration_hours INTEGER, -- For lectures, mentorship, workshops
    
    -- Evidence and Verification
    evidence_url VARCHAR(500), -- Link to certificate, receipt, photo, etc.
    evidence_type VARCHAR(50), -- 'certificate', 'receipt', 'photo', 'document', 'email'
    verification_status VARCHAR(50) DEFAULT 'pending' CHECK (verification_status IN (
        'pending',
        'verified',
        'rejected'
    )),
    verified_by UUID REFERENCES users(id),
    verified_at TIMESTAMP,
    verification_notes TEXT,
    
    -- Contact Information (for follow-up)
    contact_person VARCHAR(200),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(20),
    
    -- Metadata
    is_recurring BOOLEAN DEFAULT FALSE,
    is_featured BOOLEAN DEFAULT FALSE, -- Highlight in reports
    tags TEXT[], -- For categorization
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for efficient queries
CREATE INDEX idx_contributions_alumni ON alumni_contributions(alumni_id);
CREATE INDEX idx_contributions_type ON alumni_contributions(type);
CREATE INDEX idx_contributions_date ON alumni_contributions(contribution_date);
CREATE INDEX idx_contributions_academic_year ON alumni_contributions(academic_year);
CREATE INDEX idx_contributions_verification ON alumni_contributions(verification_status, verified_at);
CREATE INDEX idx_contributions_featured ON alumni_contributions(is_featured) WHERE is_featured = TRUE;

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_contributions_updated_at 
    BEFORE UPDATE ON alumni_contributions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE alumni_contributions IS 'Tracks alumni contributions to the institute for accreditation reporting';
COMMENT ON COLUMN alumni_contributions.type IS 'Type of contribution (donation, lecture, mentorship, etc.)';
COMMENT ON COLUMN alumni_contributions.students_impacted IS 'Number of students who benefited from this contribution';
COMMENT ON COLUMN alumni_contributions.verification_status IS 'Verification status by admin for accreditation evidence';
