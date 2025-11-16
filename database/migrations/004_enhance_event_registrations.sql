-- Migration: Enhance Event Registrations Table
-- Date: 2025-11-15
-- Description: Add fields to event_registrations for better event tracking and accreditation

-- Note: event_registrations table already exists in schema.sql
-- This migration adds additional fields for accreditation tracking

-- Add attendance verification fields
ALTER TABLE event_registrations
ADD COLUMN IF NOT EXISTS check_in_time TIMESTAMP,
ADD COLUMN IF NOT EXISTS check_out_time TIMESTAMP,
ADD COLUMN IF NOT EXISTS attendance_duration_minutes INTEGER,
ADD COLUMN IF NOT EXISTS attendance_verified_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS attendance_verified_at TIMESTAMP;

-- Add participation quality fields
ALTER TABLE event_registrations
ADD COLUMN IF NOT EXISTS participation_score INTEGER CHECK (participation_score >= 0 AND participation_score <= 100),
ADD COLUMN IF NOT EXISTS certificate_issued BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS certificate_url VARCHAR(500),
ADD COLUMN IF NOT EXISTS certificate_issued_at TIMESTAMP;

-- Add follow-up and impact fields
ALTER TABLE event_registrations
ADD COLUMN IF NOT EXISTS skills_learned TEXT[],
ADD COLUMN IF NOT EXISTS would_recommend BOOLEAN,
ADD COLUMN IF NOT EXISTS testimonial TEXT,
ADD COLUMN IF NOT EXISTS follow_up_completed BOOLEAN DEFAULT FALSE;

-- Add cancellation tracking
ALTER TABLE event_registrations
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

-- Create indexes for accreditation queries
CREATE INDEX IF NOT EXISTS idx_event_registrations_attended ON event_registrations(attended, event_id);
CREATE INDEX IF NOT EXISTS idx_event_registrations_status ON event_registrations(registration_status);
CREATE INDEX IF NOT EXISTS idx_event_registrations_feedback ON event_registrations(feedback_rating) WHERE feedback_rating IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_event_registrations_certificate ON event_registrations(certificate_issued) WHERE certificate_issued = TRUE;
CREATE INDEX IF NOT EXISTS idx_event_registrations_alumni ON event_registrations(alumni_id, attended);

-- Comments for documentation
COMMENT ON COLUMN event_registrations.attendance_duration_minutes IS 'Duration of actual participation in minutes';
COMMENT ON COLUMN event_registrations.participation_score IS 'Quality score (0-100) based on engagement and contribution';
COMMENT ON COLUMN event_registrations.certificate_issued IS 'Whether participation certificate was issued';
