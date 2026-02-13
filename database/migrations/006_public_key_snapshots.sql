-- Migration: Add public key snapshots to messages table
-- Purpose: Capture sender and receiver public keys at message send time
-- for E2E encryption integrity and validation

BEGIN;

-- Check if columns exist before adding them
DO $$ 
BEGIN
  -- Add sender_public_key if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'messages' AND column_name = 'sender_public_key'
  ) THEN
    ALTER TABLE messages ADD COLUMN sender_public_key TEXT;
    COMMENT ON COLUMN messages.sender_public_key IS 'Snapshot of sender public key at message send time for E2E encryption verification';
  END IF;

  -- Add receiver_public_key if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'messages' AND column_name = 'receiver_public_key'
  ) THEN
    ALTER TABLE messages ADD COLUMN receiver_public_key TEXT;
    COMMENT ON COLUMN messages.receiver_public_key IS 'Snapshot of receiver public key at message send time for E2E encryption verification';
  END IF;

  -- Add is_edited if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'messages' AND column_name = 'is_edited'
  ) THEN
    ALTER TABLE messages ADD COLUMN is_edited BOOLEAN DEFAULT FALSE;
    COMMENT ON COLUMN messages.is_edited IS 'Whether message content has been edited after sending';
  END IF;

  -- Add edited_at if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'messages' AND column_name = 'edited_at'
  ) THEN
    ALTER TABLE messages ADD COLUMN edited_at TIMESTAMP;
    COMMENT ON COLUMN messages.edited_at IS 'Timestamp of last edit';
  END IF;

  -- Add original_content if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'messages' AND column_name = 'original_content'
  ) THEN
    ALTER TABLE messages ADD COLUMN original_content TEXT;
    COMMENT ON COLUMN messages.original_content IS 'Original message content before first edit';
  END IF;

  -- Add deleted_by if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'messages' AND column_name = 'deleted_by'
  ) THEN
    ALTER TABLE messages ADD COLUMN deleted_by UUID REFERENCES alumni_profiles(id) ON DELETE SET NULL;
    COMMENT ON COLUMN messages.deleted_by IS 'Alumni profile ID of user who deleted the message';
  END IF;

  -- Add deleted_at if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'messages' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE messages ADD COLUMN deleted_at TIMESTAMP;
    COMMENT ON COLUMN messages.deleted_at IS 'Timestamp of soft deletion';
  END IF;

  -- Add is_deleted if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'messages' AND column_name = 'is_deleted'
  ) THEN
    ALTER TABLE messages ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE;
    COMMENT ON COLUMN messages.is_deleted IS 'Soft delete flag';
  END IF;

END $$;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_messages_sender_public_key ON messages(sender_public_key);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_public_key ON messages(receiver_public_key);
CREATE INDEX IF NOT EXISTS idx_messages_is_deleted ON messages(is_deleted);
CREATE INDEX IF NOT EXISTS idx_messages_is_edited ON messages(is_edited);

COMMIT;
