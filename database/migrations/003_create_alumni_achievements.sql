-- Migration: Create Alumni Achievements Table
-- Date: 2025-11-15
-- Description: Track alumni achievements for accreditation and showcasing success stories

CREATE TABLE IF NOT EXISTS alumni_achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    alumni_id UUID REFERENCES alumni_profiles(id) ON DELETE CASCADE,
    
    -- Achievement Type
    achievement_type VARCHAR(50) NOT NULL CHECK (achievement_type IN (
        'promotion',
        'award',
        'recognition',
        'startup_founded',
        'startup_funded',
        'publication',
        'patent',
        'conference_speaker',
        'certification',
        'higher_education_admission',
        'competition_win',
        'social_impact',
        'other'
    )),
    
    -- Achievement Details
    title VARCHAR(300) NOT NULL,
    description TEXT NOT NULL,
    organization VARCHAR(200), -- Company, university, awarding body
    location VARCHAR(200),
    
    -- Date Information
    achievement_date DATE NOT NULL,
    academic_year VARCHAR(20), -- Academic year when achieved
    years_after_graduation INTEGER, -- Calculated field
    
    -- Additional Details Based on Type
    position_title VARCHAR(200), -- For promotions
    award_name VARCHAR(200), -- For awards
    publication_title VARCHAR(300), -- For publications
    publication_venue VARCHAR(200), -- Journal/Conference name
    patent_number VARCHAR(100), -- For patents
    funding_amount DECIMAL(12,2), -- For funded startups
    funding_currency VARCHAR(10) DEFAULT 'INR',
    
    -- Impact and Reach
    impact_description TEXT,
    media_coverage_url VARCHAR(500),
    recognition_level VARCHAR(50) CHECK (recognition_level IN (
        'International',
        'National',
        'State',
        'University',
        'Local',
        'Corporate'
    )),
    
    -- Evidence and Verification
    evidence_url VARCHAR(500), -- Certificate, news article, LinkedIn post
    evidence_type VARCHAR(50), -- 'certificate', 'news', 'photo', 'document', 'link'
    verification_status VARCHAR(50) DEFAULT 'pending' CHECK (verification_status IN (
        'pending',
        'verified',
        'rejected'
    )),
    is_verified BOOLEAN DEFAULT FALSE,
    verified_by UUID REFERENCES users(id),
    verified_at TIMESTAMP,
    verification_notes TEXT,
    
    -- Visibility and Featuring
    is_featured BOOLEAN DEFAULT FALSE, -- Show on homepage/highlights
    is_published BOOLEAN DEFAULT TRUE, -- Public visibility
    showcase_priority INTEGER DEFAULT 0, -- For ordering featured achievements
    
    -- SEO and Categorization
    tags TEXT[],
    keywords TEXT[],
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for efficient queries
CREATE INDEX idx_achievements_alumni ON alumni_achievements(alumni_id);
CREATE INDEX idx_achievements_type ON alumni_achievements(type);
CREATE INDEX idx_achievements_date ON alumni_achievements(achievement_date);
CREATE INDEX idx_achievements_academic_year ON alumni_achievements(academic_year);
CREATE INDEX idx_achievements_verification ON alumni_achievements(verification_status, verified_at);
CREATE INDEX idx_achievements_featured ON alumni_achievements(is_featured, showcase_priority) WHERE is_featured = TRUE;
CREATE INDEX idx_achievements_published ON alumni_achievements(is_published) WHERE is_published = TRUE;
CREATE INDEX idx_achievements_recognition_level ON alumni_achievements(recognition_level);

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_achievements_updated_at 
    BEFORE UPDATE ON alumni_achievements 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger to calculate years_after_graduation
CREATE OR REPLACE FUNCTION calculate_years_after_graduation()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate years between graduation and achievement
    IF NEW.achievement_date IS NOT NULL THEN
        SELECT EXTRACT(YEAR FROM NEW.achievement_date) - COALESCE(ap.graduation_year, 0)
        INTO NEW.years_after_graduation
        FROM alumni_profiles ap
        WHERE ap.id = NEW.alumni_id;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER calculate_years_after_graduation_trigger
    BEFORE INSERT OR UPDATE ON alumni_achievements
    FOR EACH ROW
    EXECUTE FUNCTION calculate_years_after_graduation();

-- Comments for documentation
COMMENT ON TABLE alumni_achievements IS 'Tracks alumni achievements for showcasing success and accreditation reporting';
COMMENT ON COLUMN alumni_achievements.type IS 'Type of achievement (promotion, award, startup, publication, etc.)';
COMMENT ON COLUMN alumni_achievements.years_after_graduation IS 'Number of years after graduation when achievement was earned';
COMMENT ON COLUMN alumni_achievements.recognition_level IS 'Scope of recognition (International, National, etc.)';
COMMENT ON COLUMN alumni_achievements.showcase_priority IS 'Higher numbers appear first in featured lists';
