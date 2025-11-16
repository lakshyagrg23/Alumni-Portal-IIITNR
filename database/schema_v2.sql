-- =============================================
-- IIIT Naya Raipur Alumni Portal Database Schema
-- PostgreSQL Database Schema (COMPLETE & UP-TO-DATE)
-- Version: 2.0
-- Last Updated: October 6, 2025
-- 
-- This schema includes all migrations and updates:
-- - Email verification with expiry
-- - Complete E2E encrypted messaging system
-- - Public keys for ECDH encryption
-- - Message constraints and validations
-- - Conversations and read receipts
-- - All indexes and triggers
-- =============================================

-- Create database (run this command separately)
-- CREATE DATABASE alumni_portal;

-- =============================================
-- EXTENSIONS
-- =============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- USERS TABLE (Authentication & Authorization)
-- =============================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255), -- NULL for OAuth users
    provider VARCHAR(50) DEFAULT 'local', -- 'local', 'google'
    provider_id VARCHAR(255), -- Google ID for OAuth users
    role VARCHAR(20) DEFAULT 'alumni' CHECK (role IN ('admin', 'alumni')),
    is_approved BOOLEAN DEFAULT FALSE, -- Auto-approved for @iiitnr.edu.in emails
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Email Verification
    email_verified BOOLEAN DEFAULT FALSE,
    email_verification_token VARCHAR(255),
    email_verification_token_expires TIMESTAMP, -- Token expiry timestamp
    
    -- Password Reset
    password_reset_token VARCHAR(255),
    password_reset_expires TIMESTAMP,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- ALUMNI PROFILES TABLE
-- =============================================
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

-- =============================================
-- WORK EXPERIENCE TABLE
-- =============================================
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

-- =============================================
-- EDUCATION TABLE (Additional Degrees)
-- =============================================
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

-- =============================================
-- NEWS TABLE (News & Achievements)
-- =============================================
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

-- =============================================
-- EVENTS TABLE
-- =============================================
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

-- =============================================
-- EVENT REGISTRATIONS TABLE
-- =============================================
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

-- =============================================
-- CONNECTIONS TABLE (Alumni Networking)
-- =============================================
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

-- =============================================
-- PUBLIC KEYS TABLE (E2E Encryption)
-- =============================================
CREATE TABLE public_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    public_key TEXT NOT NULL, -- Base64 encoded ECDH P-256 public key
    algorithm VARCHAR(50) DEFAULT 'ECDH-P256', -- Encryption algorithm used
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure one key per user
    CONSTRAINT unique_user_public_key UNIQUE(user_id)
);

-- =============================================
-- MESSAGES TABLE (E2E Encrypted Messaging)
-- =============================================
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID NOT NULL REFERENCES alumni_profiles(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES alumni_profiles(id) ON DELETE CASCADE,
    
    -- Message Content (encrypted)
    content TEXT NOT NULL, -- Encrypted message content (AES-GCM ciphertext)
    iv TEXT, -- Base64 initialization vector for AES-GCM
    client_id TEXT, -- Client-generated ID for deduplication
    
    -- Message Metadata
    message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'system')),
    attachment_url VARCHAR(500), -- URL to uploaded file if any
    
    -- E2E Encryption Support (key snapshots)
    sender_public_key TEXT, -- Snapshot of sender's public key at send time
    receiver_public_key TEXT, -- Snapshot of receiver's public key at send time
    
    -- Status and Timestamps
    is_read BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP,
    
    -- Business Rules
    CONSTRAINT messages_check CHECK (sender_id != receiver_id),
    CONSTRAINT check_no_self_messages CHECK (sender_id != receiver_id),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- CONVERSATIONS TABLE
-- =============================================
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    participant1_id UUID NOT NULL REFERENCES alumni_profiles(id) ON DELETE CASCADE,
    participant2_id UUID NOT NULL REFERENCES alumni_profiles(id) ON DELETE CASCADE,
    
    -- Conversation Metadata
    last_message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
    last_message_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Privacy Settings
    is_archived_by_participant1 BOOLEAN DEFAULT FALSE,
    is_archived_by_participant2 BOOLEAN DEFAULT FALSE,
    is_muted_by_participant1 BOOLEAN DEFAULT FALSE,
    is_muted_by_participant2 BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure unique conversations (order participants consistently)
    CONSTRAINT unique_conversation UNIQUE(LEAST(participant1_id, participant2_id), GREATEST(participant1_id, participant2_id)),
    CONSTRAINT different_participants CHECK (participant1_id != participant2_id)
);

-- =============================================
-- MESSAGE READ RECEIPTS TABLE
-- =============================================
CREATE TABLE message_read_receipts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT unique_user_message_receipt UNIQUE(message_id, user_id)
);

-- =============================================
-- NOTIFICATIONS TABLE
-- =============================================
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

-- =============================================
-- ACTIVITY LOGS TABLE (Admin Monitoring)
-- =============================================
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

-- =============================================
-- FILE UPLOADS TABLE
-- =============================================
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

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Users Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_email_lower ON users(LOWER(email));
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_verification_token ON users(email_verification_token) WHERE email_verification_token IS NOT NULL;

-- Alumni Profiles Indexes
CREATE INDEX idx_alumni_graduation_year ON alumni_profiles(graduation_year);
CREATE INDEX idx_alumni_branch ON alumni_profiles(branch);
CREATE INDEX idx_alumni_current_company ON alumni_profiles(current_company);
CREATE INDEX idx_alumni_skills ON alumni_profiles USING GIN(skills);

-- News Indexes
CREATE INDEX idx_news_category ON news(category);
CREATE INDEX idx_news_published ON news(is_published, published_at);

-- Events Indexes
CREATE INDEX idx_events_type ON events(event_type);
CREATE INDEX idx_events_datetime ON events(start_datetime);

-- Public Keys Indexes
CREATE INDEX idx_public_keys_user_id ON public_keys(user_id);

-- Messages Indexes
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_receiver_id ON messages(receiver_id);
CREATE INDEX idx_messages_conversation ON messages(sender_id, receiver_id);
CREATE INDEX idx_messages_sent_at ON messages(sent_at DESC);
CREATE INDEX idx_messages_client_id ON messages(client_id) WHERE client_id IS NOT NULL;
CREATE INDEX idx_messages_unread ON messages(receiver_id, is_read) WHERE is_read = FALSE;

-- Conversations Indexes
CREATE INDEX idx_conversations_participant1 ON conversations(participant1_id);
CREATE INDEX idx_conversations_participant2 ON conversations(participant2_id);
CREATE INDEX idx_conversations_last_message_at ON conversations(last_message_at DESC);

-- Message Read Receipts Indexes
CREATE INDEX idx_message_read_receipts_message_id ON message_read_receipts(message_id);
CREATE INDEX idx_message_read_receipts_user_id ON message_read_receipts(user_id);

-- Notifications Indexes
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);

-- =============================================
-- FUNCTIONS
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

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

-- Function to update conversation last message
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
DECLARE
    conv_id UUID;
BEGIN
    -- Find or create conversation
    SELECT id INTO conv_id 
    FROM conversations 
    WHERE (participant1_id = NEW.sender_id AND participant2_id = NEW.receiver_id)
       OR (participant1_id = NEW.receiver_id AND participant2_id = NEW.sender_id);
    
    IF conv_id IS NULL THEN
        -- Create new conversation
        INSERT INTO conversations (
            participant1_id, 
            participant2_id, 
            last_message_id, 
            last_message_at
        ) VALUES (
            LEAST(NEW.sender_id, NEW.receiver_id),
            GREATEST(NEW.sender_id, NEW.receiver_id),
            NEW.id,
            NEW.sent_at
        );
    ELSE
        -- Update existing conversation
        UPDATE conversations 
        SET last_message_id = NEW.id, 
            last_message_at = NEW.sent_at,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = conv_id;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- =============================================
-- TRIGGERS
-- =============================================

-- Auto-update timestamps
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_alumni_profiles_updated_at 
    BEFORE UPDATE ON alumni_profiles 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_news_updated_at 
    BEFORE UPDATE ON news 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at 
    BEFORE UPDATE ON events 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_public_keys_updated_at 
    BEFORE UPDATE ON public_keys 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_messages_updated_at 
    BEFORE UPDATE ON messages 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at 
    BEFORE UPDATE ON conversations 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Auto-approve institute emails
CREATE TRIGGER auto_approve_institute_emails_trigger 
    BEFORE INSERT ON users 
    FOR EACH ROW 
    EXECUTE FUNCTION auto_approve_institute_emails();

-- Auto-update conversations on new messages
CREATE TRIGGER update_conversation_on_new_message 
    AFTER INSERT ON messages 
    FOR EACH ROW 
    EXECUTE FUNCTION update_conversation_last_message();

-- =============================================
-- VIEWS FOR EASIER QUERYING
-- =============================================

-- Conversation list with participant details
CREATE OR REPLACE VIEW conversation_list AS
SELECT 
    c.id as conversation_id,
    c.participant1_id,
    c.participant2_id,
    c.last_message_at,
    c.is_archived_by_participant1,
    c.is_archived_by_participant2,
    p1.first_name as p1_first_name,
    p1.last_name as p1_last_name,
    p1.profile_picture_url as p1_profile_picture,
    p2.first_name as p2_first_name,
    p2.last_name as p2_last_name,
    p2.profile_picture_url as p2_profile_picture,
    m.content as last_message_content,
    m.sent_at as last_message_sent_at,
    m.is_read as last_message_read
FROM conversations c
LEFT JOIN alumni_profiles p1 ON c.participant1_id = p1.id
LEFT JOIN alumni_profiles p2 ON c.participant2_id = p2.id
LEFT JOIN messages m ON c.last_message_id = m.id;

-- Unread message counts per user
CREATE OR REPLACE VIEW unread_message_counts AS
SELECT 
    receiver_id,
    sender_id,
    COUNT(*) as unread_count
FROM messages
WHERE is_read = FALSE
GROUP BY receiver_id, sender_id;

-- =============================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================

COMMENT ON TABLE users IS 'User authentication and authorization data';
COMMENT ON TABLE alumni_profiles IS 'Detailed alumni profile information';
COMMENT ON TABLE public_keys IS 'Public keys for end-to-end encrypted messaging (ECDH P-256)';
COMMENT ON TABLE messages IS 'Encrypted messages between alumni (E2E encryption using AES-GCM)';
COMMENT ON TABLE conversations IS 'Conversation metadata and last activity tracking';
COMMENT ON TABLE message_read_receipts IS 'Read receipts for messages (supports future group messaging)';

COMMENT ON COLUMN users.email_verification_token_expires IS 'Timestamp when the email verification token expires (typically 24 hours after generation)';
COMMENT ON COLUMN messages.content IS 'AES-GCM encrypted message content (ciphertext in base64)';
COMMENT ON COLUMN messages.iv IS 'Initialization vector for AES-GCM decryption (base64 encoded)';
COMMENT ON COLUMN messages.client_id IS 'Client-generated unique ID for message deduplication';
COMMENT ON COLUMN messages.sender_public_key IS 'Snapshot of sender public key at send time for decryption';
COMMENT ON COLUMN messages.receiver_public_key IS 'Snapshot of receiver public key at send time for encryption';
COMMENT ON COLUMN public_keys.public_key IS 'Base64 encoded ECDH P-256 raw public key (65 bytes)';
COMMENT ON COLUMN public_keys.algorithm IS 'Encryption algorithm identifier (default: ECDH-P256 for key exchange)';

-- =============================================
-- END OF SCHEMA
-- =============================================

-- Schema Version: 2.0
-- Total Tables: 17
-- - Authentication: users
-- - Profiles: alumni_profiles, work_experiences, education
-- - Content: news, events, event_registrations
-- - Social: connections, notifications
-- - Messaging: messages, conversations, message_read_receipts, public_keys
-- - System: activity_logs, file_uploads
-- 
-- Features:
-- ✅ Email verification with expiry
-- ✅ End-to-end encrypted messaging (ECDH + AES-GCM)
-- ✅ Public key management
-- ✅ Conversation tracking
-- ✅ Message read receipts
-- ✅ Auto-updating timestamps
-- ✅ Institute email auto-approval
-- ✅ Comprehensive indexes
-- ✅ Database views for common queries
-- ✅ Full constraints and validations
