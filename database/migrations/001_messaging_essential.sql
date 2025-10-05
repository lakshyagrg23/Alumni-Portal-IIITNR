-- =============================================
-- MESSAGING FEATURE MIGRATION (Essential)
-- Migration: 001_messaging_essential.sql
-- Description: Essential tables and columns for messaging with E2E encryption
-- Date: 2025-10-06
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- 1. Public Keys Table for E2E Encryption
-- =============================================
CREATE TABLE IF NOT EXISTS public_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    public_key TEXT NOT NULL,
    algorithm VARCHAR(50) DEFAULT 'ECDH-P256',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_user_public_key UNIQUE(user_id)
);

-- =============================================
-- 2. Ensure Messages Table Has Required Columns
-- =============================================

-- Add missing columns to messages table if they don't exist
DO $$ 
BEGIN
    -- Add iv column for encryption
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'messages' AND column_name = 'iv') THEN
        ALTER TABLE messages ADD COLUMN iv TEXT;
    END IF;

    -- Add client_id for deduplication
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'messages' AND column_name = 'client_id') THEN
        ALTER TABLE messages ADD COLUMN client_id TEXT;
    END IF;

    -- Add sender_public_key for encryption
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'messages' AND column_name = 'sender_public_key') THEN
        ALTER TABLE messages ADD COLUMN sender_public_key TEXT;
    END IF;

    -- Add receiver_public_key for encryption
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'messages' AND column_name = 'receiver_public_key') THEN
        ALTER TABLE messages ADD COLUMN receiver_public_key TEXT;
    END IF;
END
$$;

-- =============================================
-- 3. Essential Indexes for Performance
-- =============================================
CREATE INDEX IF NOT EXISTS idx_public_keys_user_id ON public_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_client_id ON messages(client_id) WHERE client_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(sender_id, receiver_id);

-- =============================================
-- 4. Update Timestamp Function (if not exists)
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger for public_keys
DROP TRIGGER IF EXISTS update_public_keys_updated_at ON public_keys;
CREATE TRIGGER update_public_keys_updated_at 
    BEFORE UPDATE ON public_keys 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- 5. Verification Queries
-- =============================================

-- Show table structures
SELECT 
    table_name, 
    column_name, 
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name IN ('messages', 'public_keys')
ORDER BY table_name, ordinal_position;