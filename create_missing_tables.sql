-- SQL to create missing tables for Alumni Portal
-- Run these commands in your PostgreSQL database

-- Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Alumni profiles table
CREATE TABLE IF NOT EXISTS alumni_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- Personal Information
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100),
    profile_picture_url VARCHAR(500),
    phone VARCHAR(20),
    date_of_birth DATE,
    gender VARCHAR(10) CHECK (gender IN ('Male', 'Female', 'Other', 'Prefer not to say')),
    
    -- Academic Information
    student_id VARCHAR(50), -- Institute student ID
    admission_year INTEGER,
    graduation_year INTEGER,
    degree VARCHAR(100), -- BTech, MTech, PhD, etc.
    branch VARCHAR(100), -- CSE, ECE, etc.
    cgpa DECIMAL(4,2),
    
    -- Professional Information
    current_company VARCHAR(200),
    current_position VARCHAR(200),
    industry VARCHAR(100),
    work_experience_years INTEGER DEFAULT 0,
    skills TEXT[], -- Array of skills
    linkedin_url VARCHAR(300),
    github_url VARCHAR(300),
    portfolio_url VARCHAR(300),
    
    -- Location Information
    current_city VARCHAR(100),
    current_state VARCHAR(100),
    current_country VARCHAR(100) DEFAULT 'India',
    hometown_city VARCHAR(100),
    hometown_state VARCHAR(100),
    
    -- Biography and Interests
    bio TEXT,
    achievements TEXT,
    interests TEXT[],
    
    -- Privacy Settings
    is_profile_public BOOLEAN DEFAULT TRUE,
    show_contact_info BOOLEAN DEFAULT FALSE,
    show_work_info BOOLEAN DEFAULT TRUE,
    show_academic_info BOOLEAN DEFAULT TRUE,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- News and Achievements table
CREATE TABLE IF NOT EXISTS news (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(300) NOT NULL,
    content TEXT NOT NULL,
    excerpt VARCHAR(500),
    featured_image_url VARCHAR(500),
    author_id UUID REFERENCES users(id),
    category VARCHAR(50) DEFAULT 'general', -- 'achievement', 'news', 'event', 'announcement'
    tags TEXT[],
    is_published BOOLEAN DEFAULT FALSE,
    is_featured BOOLEAN DEFAULT FALSE,
    published_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Work Experience table
CREATE TABLE IF NOT EXISTS work_experiences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    alumni_id UUID REFERENCES alumni_profiles(id) ON DELETE CASCADE,
    company_name VARCHAR(200) NOT NULL,
    position VARCHAR(200) NOT NULL,
    location VARCHAR(200),
    start_date DATE NOT NULL,
    end_date DATE, -- NULL for current position
    is_current BOOLEAN DEFAULT FALSE,
    description TEXT,
    skills_used TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Education table (for additional degrees)
CREATE TABLE IF NOT EXISTS education (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    alumni_id UUID REFERENCES alumni_profiles(id) ON DELETE CASCADE,
    institution_name VARCHAR(200) NOT NULL,
    degree VARCHAR(100) NOT NULL,
    field_of_study VARCHAR(100),
    start_year INTEGER,
    end_year INTEGER,
    grade VARCHAR(50), -- GPA, percentage, etc.
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Events table
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(300) NOT NULL,
    description TEXT NOT NULL,
    event_type VARCHAR(50) NOT NULL, -- 'workshop', 'webinar', 'volunteer', 'meetup'
    mode VARCHAR(20) DEFAULT 'online', -- 'online', 'offline', 'hybrid'
    location VARCHAR(300), -- Physical location or meeting link
    start_datetime TIMESTAMP NOT NULL,
    end_datetime TIMESTAMP NOT NULL,
    registration_deadline TIMESTAMP,
    max_participants INTEGER,
    current_participants INTEGER DEFAULT 0,
    
    -- Requirements
    required_skills TEXT[],
    experience_level VARCHAR(50), -- 'beginner', 'intermediate', 'advanced', 'all'
    
    -- Event Details
    agenda TEXT,
    requirements TEXT,
    benefits TEXT,
    contact_email VARCHAR(255),
    contact_phone VARCHAR(20),
    
    -- Organizer Information
    organizer_id UUID REFERENCES users(id),
    organizer_name VARCHAR(200),
    
    -- Status and Settings
    status VARCHAR(20) DEFAULT 'upcoming', -- 'upcoming', 'ongoing', 'completed', 'cancelled'
    is_published BOOLEAN DEFAULT FALSE,
    requires_approval BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_alumni_graduation_year ON alumni_profiles(graduation_year);
CREATE INDEX IF NOT EXISTS idx_alumni_branch ON alumni_profiles(branch);
CREATE INDEX IF NOT EXISTS idx_alumni_current_company ON alumni_profiles(current_company);
CREATE INDEX IF NOT EXISTS idx_alumni_skills ON alumni_profiles USING GIN(skills);
CREATE INDEX IF NOT EXISTS idx_news_category ON news(category);
CREATE INDEX IF NOT EXISTS idx_news_published ON news(is_published, published_at);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_datetime ON events(start_datetime);

-- Triggers to update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers if they don't exist
DROP TRIGGER IF EXISTS update_alumni_profiles_updated_at ON alumni_profiles;
CREATE TRIGGER update_alumni_profiles_updated_at BEFORE UPDATE ON alumni_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_news_updated_at ON news;
CREATE TRIGGER update_news_updated_at BEFORE UPDATE ON news FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_events_updated_at ON events;
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
