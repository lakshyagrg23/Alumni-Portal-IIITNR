-- =============================================
-- MESSAGING FEATURE MIGRATION
-- Migration: 001_messaging_feature.sql
-- Description: Complete messaging system with E2E encryption support
-- Date: 2025-10-06
-- =============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- 1. PUBLIC KEYS TABLE
-- Store user public keys for E2E encryption
-- =============================================
CREATE TABLE IF NOT EXISTS public_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    public_key TEXT NOT NULL, -- Base64 encoded public key
    algorithm VARCHAR(50) DEFAULT 'ECDH-P256', -- Encryption algorithm used
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure one key per user
    CONSTRAINT unique_user_public_key UNIQUE(user_id)
);

-- =============================================
-- 2. MESSAGES TABLE 
-- Core messaging with E2E encryption support
-- =============================================
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID NOT NULL REFERENCES alumni_profiles(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES alumni_profiles(id) ON DELETE CASCADE,
    
    -- Message Content (encrypted)
    content TEXT NOT NULL, -- Encrypted message content
    iv TEXT, -- Base64 initialization vector for AES-GCM
    client_id TEXT, -- Client-generated ID for deduplication
    
    -- Message Metadata
    message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'system')),
    attachment_url VARCHAR(500), -- URL to uploaded file if any
    
    -- E2E Encryption Support
    sender_public_key TEXT, -- Snapshot of sender's public key at send time
    receiver_public_key TEXT, -- Snapshot of receiver's public key at send time
    
    -- Status and Timestamps
    is_read BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP,
    
    -- Business Rules
    CONSTRAINT messages_check CHECK (sender_id <> receiver_id),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- 3. CONVERSATIONS TABLE
-- Track conversation metadata and last activity
-- =============================================
CREATE TABLE IF NOT EXISTS conversations (
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
    CONSTRAINT different_participants CHECK (participant1_id <> participant2_id)
);

-- =============================================
-- 4. MESSAGE READ RECEIPTS TABLE
-- Track read status per user for group messaging (future)
-- =============================================
CREATE TABLE IF NOT EXISTS message_read_receipts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT unique_user_message_receipt UNIQUE(message_id, user_id)
);

-- =============================================
-- 5. INDEXES FOR PERFORMANCE
-- =============================================

-- Public Keys Indexes
CREATE INDEX IF NOT EXISTS idx_public_keys_user_id ON public_keys(user_id);

-- Messages Indexes
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(sender_id, receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_sent_at ON messages(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_client_id ON messages(client_id) WHERE client_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_messages_unread ON messages(receiver_id, is_read) WHERE is_read = FALSE;

-- Conversations Indexes
CREATE INDEX IF NOT EXISTS idx_conversations_participant1 ON conversations(participant1_id);
CREATE INDEX IF NOT EXISTS idx_conversations_participant2 ON conversations(participant2_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at ON conversations(last_message_at DESC);

-- Message Read Receipts Indexes
CREATE INDEX IF NOT EXISTS idx_message_read_receipts_message_id ON message_read_receipts(message_id);
CREATE INDEX IF NOT EXISTS idx_message_read_receipts_user_id ON message_read_receipts(user_id);

-- =============================================
-- 6. TRIGGERS FOR AUTO-UPDATING TIMESTAMPS
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply timestamp triggers
CREATE TRIGGER update_public_keys_updated_at BEFORE UPDATE ON public_keys FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- 7. TRIGGERS FOR CONVERSATION MANAGEMENT
-- =============================================

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

-- Trigger to auto-update conversations on new messages
CREATE TRIGGER update_conversation_on_new_message 
    AFTER INSERT ON messages 
    FOR EACH ROW 
    EXECUTE FUNCTION update_conversation_last_message();

-- =============================================
-- 8. VIEWS FOR EASIER QUERYING
-- =============================================

-- Conversation list with participant details
CREATE OR REPLACE VIEW conversation_list AS
SELECT 
    c.id as conversation_id,
    c.participant1_id,
    c.participant2_id,
    ap1.first_name as participant1_first_name,
    ap1.last_name as participant1_last_name,
    ap1.profile_picture_url as participant1_avatar,
    u1.id as participant1_user_id,
    ap2.first_name as participant2_first_name,
    ap2.last_name as participant2_last_name,
    ap2.profile_picture_url as participant2_avatar,
    u2.id as participant2_user_id,
    c.last_message_id,
    m.content as last_message_content,
    m.message_type as last_message_type,
    c.last_message_at,
    c.created_at as conversation_created_at
FROM conversations c
LEFT JOIN alumni_profiles ap1 ON c.participant1_id = ap1.id
LEFT JOIN users u1 ON ap1.user_id = u1.id
LEFT JOIN alumni_profiles ap2 ON c.participant2_id = ap2.id
LEFT JOIN users u2 ON ap2.user_id = u2.id
LEFT JOIN messages m ON c.last_message_id = m.id
ORDER BY c.last_message_at DESC;

-- Message thread view with sender/receiver details
CREATE OR REPLACE VIEW message_thread AS
SELECT 
    m.id,
    m.content,
    m.iv,
    m.client_id,
    m.message_type,
    m.attachment_url,
    m.sender_public_key,
    m.receiver_public_key,
    m.is_read,
    m.sent_at,
    m.read_at,
    -- Sender details
    m.sender_id,
    sender_profile.first_name as sender_first_name,
    sender_profile.last_name as sender_last_name,
    sender_profile.profile_picture_url as sender_avatar,
    sender_user.id as sender_user_id,
    -- Receiver details
    m.receiver_id,
    receiver_profile.first_name as receiver_first_name,
    receiver_profile.last_name as receiver_last_name,
    receiver_profile.profile_picture_url as receiver_avatar,
    receiver_user.id as receiver_user_id
FROM messages m
JOIN alumni_profiles sender_profile ON m.sender_id = sender_profile.id
JOIN users sender_user ON sender_profile.user_id = sender_user.id
JOIN alumni_profiles receiver_profile ON m.receiver_id = receiver_profile.id
JOIN users receiver_user ON receiver_profile.user_id = receiver_user.id
ORDER BY m.sent_at ASC;

-- =============================================
-- 9. SAMPLE DATA (Optional - for development)
-- =============================================

-- Insert sample public keys (if users exist)
-- Note: This is for development only - in production, users generate their own keys
INSERT INTO public_keys (user_id, public_key, algorithm) 
SELECT 
    u.id,
    'sample_public_key_' || u.id::text,
    'ECDH-P256'
FROM users u
WHERE NOT EXISTS (SELECT 1 FROM public_keys pk WHERE pk.user_id = u.id)
LIMIT 5; -- Only add for first 5 users

-- =============================================
-- 10. SECURITY POLICIES (Row Level Security)
-- =============================================

-- Enable RLS on sensitive tables
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own public keys
CREATE POLICY user_own_public_key ON public_keys
    FOR ALL USING (user_id = current_setting('app.user_id', true)::UUID);

-- Policy: Users can only see messages they sent or received
CREATE POLICY user_messages ON messages
    FOR ALL USING (
        sender_id IN (SELECT id FROM alumni_profiles WHERE user_id = current_setting('app.user_id', true)::UUID)
        OR receiver_id IN (SELECT id FROM alumni_profiles WHERE user_id = current_setting('app.user_id', true)::UUID)
    );

-- Policy: Users can only see conversations they participate in
CREATE POLICY user_conversations ON conversations
    FOR ALL USING (
        participant1_id IN (SELECT id FROM alumni_profiles WHERE user_id = current_setting('app.user_id', true)::UUID)
        OR participant2_id IN (SELECT id FROM alumni_profiles WHERE user_id = current_setting('app.user_id', true)::UUID)
    );

-- =============================================
-- 11. CLEANUP FUNCTIONS
-- =============================================

-- Function to clean old messages (for GDPR compliance)
CREATE OR REPLACE FUNCTION cleanup_old_messages(days_old INTEGER DEFAULT 365)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM messages 
    WHERE sent_at < CURRENT_TIMESTAMP - INTERVAL '1 day' * days_old;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to delete a conversation and all its messages
CREATE OR REPLACE FUNCTION delete_conversation(conv_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Delete all messages in the conversation
    DELETE FROM messages m 
    USING conversations c 
    WHERE c.id = conv_id
    AND ((m.sender_id = c.participant1_id AND m.receiver_id = c.participant2_id)
         OR (m.sender_id = c.participant2_id AND m.receiver_id = c.participant1_id));
    
    -- Delete the conversation
    DELETE FROM conversations WHERE id = conv_id;
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- MIGRATION COMPLETE
-- =============================================

-- Log migration completion
DO $$
BEGIN
    RAISE NOTICE 'Messaging feature migration completed successfully';
    RAISE NOTICE 'Created tables: public_keys, messages, conversations, message_read_receipts';
    RAISE NOTICE 'Created views: conversation_list, message_thread';
    RAISE NOTICE 'Created functions: update_conversation_last_message, cleanup_old_messages, delete_conversation';
    RAISE NOTICE 'Enabled Row Level Security on sensitive tables';
END
$$;