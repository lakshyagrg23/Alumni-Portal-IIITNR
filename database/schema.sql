-- IIIT Naya Raipur Alumni Portal Database Schema
-- PostgreSQL Database Schema

-- Create database (run this command separately)
-- CREATE DATABASE alumni_portal;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table for authentication
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255), -- NULL for OAuth users
    provider VARCHAR(50) DEFAULT 'local', -- 'local', 'google'
    provider_id VARCHAR(255), -- Google ID for OAuth users
    role VARCHAR(20) DEFAULT 'alumni' CHECK (role IN ('admin', 'alumni')),
    is_approved BOOLEAN DEFAULT FALSE, -- Auto-approved for @iiitnr.edu.in emails
    is_active BOOLEAN DEFAULT TRUE,
    email_verified BOOLEAN DEFAULT FALSE,
    email_verification_token VARCHAR(255),
    password_reset_token VARCHAR(255),
    password_reset_expires TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Alumni profiles table
CREATE TABLE alumni_profiles (
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

-- Work Experience table
CREATE TABLE work_experiences (
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
CREATE TABLE education (
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

-- News and Achievements table
CREATE TABLE news (
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

-- Events and Volunteer Opportunities table
CREATE TABLE events (
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

-- Event Registrations table
CREATE TABLE event_registrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    alumni_id UUID REFERENCES alumni_profiles(id) ON DELETE CASCADE,
    
    -- Registration Details
    registration_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'waitlist'
    motivation TEXT, -- Why they want to participate
    relevant_experience TEXT,
    
    -- Attendance
    attended BOOLEAN DEFAULT FALSE,
    feedback_rating INTEGER CHECK (feedback_rating >= 1 AND feedback_rating <= 5),
    feedback_comment TEXT,
    
    registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(event_id, user_id)
);

-- Alumni Connections/Networking table
CREATE TABLE connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    requester_id UUID REFERENCES alumni_profiles(id) ON DELETE CASCADE,
    addressee_id UUID REFERENCES alumni_profiles(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'accepted', 'rejected', 'blocked'
    message TEXT, -- Connection request message
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(requester_id, addressee_id),
    CHECK (requester_id != addressee_id)
);

-- Messages table for direct messaging
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID REFERENCES alumni_profiles(id) ON DELETE CASCADE,
    receiver_id UUID REFERENCES alumni_profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    message_type VARCHAR(20) DEFAULT 'text', -- 'text', 'file', 'image'
    attachment_url VARCHAR(500),
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP,
    
    CHECK (sender_id != receiver_id)
);

-- Conversations table to group messages
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    participant1_id UUID REFERENCES alumni_profiles(id) ON DELETE CASCADE,
    participant2_id UUID REFERENCES alumni_profiles(id) ON DELETE CASCADE,
    last_message_id UUID REFERENCES messages(id),
    last_message_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(participant1_id, participant2_id),
    CHECK (participant1_id != participant2_id)
);

-- Notifications table
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'connection_request', 'message', 'event_invitation', 'news'
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    data JSONB, -- Additional data for the notification
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Activity Log table for admin monitoring
CREATE TABLE activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL, -- 'login', 'profile_update', 'message_sent', etc.
    resource_type VARCHAR(50), -- 'user', 'event', 'message', etc.
    resource_id UUID,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- File uploads table
CREATE TABLE file_uploads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    filename VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    upload_type VARCHAR(50), -- 'profile_picture', 'document', 'news_image', etc.
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_alumni_graduation_year ON alumni_profiles(graduation_year);
CREATE INDEX idx_alumni_branch ON alumni_profiles(branch);
CREATE INDEX idx_alumni_current_company ON alumni_profiles(current_company);
CREATE INDEX idx_alumni_skills ON alumni_profiles USING GIN(skills);
CREATE INDEX idx_news_category ON news(category);
CREATE INDEX idx_news_published ON news(is_published, published_at);
CREATE INDEX idx_events_type ON events(event_type);
CREATE INDEX idx_events_datetime ON events(start_datetime);
CREATE INDEX idx_messages_conversation ON messages(sender_id, receiver_id);
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);

-- Triggers to update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_alumni_profiles_updated_at BEFORE UPDATE ON alumni_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_news_updated_at BEFORE UPDATE ON news FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to auto-approve users with @iiitnr.edu.in emails
CREATE OR REPLACE FUNCTION auto_approve_institute_emails()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.email LIKE '%@iiitnr.edu.in' THEN
        NEW.is_approved = TRUE;
        NEW.email_verified = TRUE;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER auto_approve_institute_emails_trigger 
    BEFORE INSERT ON users 
    FOR EACH ROW 
    EXECUTE FUNCTION auto_approve_institute_emails();
