-- Migration: Add delete and edit support for messages
-- Date: 2026-01-29

-- Add columns for message deletion and editing
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES alumni_profiles(id),
ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS edited_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS original_content TEXT;

-- Create index for efficient querying of non-deleted messages
CREATE INDEX IF NOT EXISTS idx_messages_is_deleted ON messages(is_deleted);

-- Add comment
COMMENT ON COLUMN messages.is_deleted IS 'Soft delete flag - message marked as deleted';
COMMENT ON COLUMN messages.deleted_at IS 'Timestamp when message was deleted';
COMMENT ON COLUMN messages.deleted_by IS 'User who deleted the message (sender only)';
COMMENT ON COLUMN messages.is_edited IS 'Flag indicating if message was edited';
COMMENT ON COLUMN messages.edited_at IS 'Timestamp of last edit';
COMMENT ON COLUMN messages.original_content IS 'Original encrypted content before edits';
