-- Migration: Fix messages table constraints
-- Date: October 6, 2025
-- Purpose: Add missing CHECK constraint and make foreign keys NOT NULL

-- Step 1: Make sender_id and receiver_id NOT NULL
-- (This will fail if there are any NULL values - which is good, we want to catch that)
ALTER TABLE messages 
ALTER COLUMN sender_id
SET
NOT NULL;

ALTER TABLE messages 
ALTER COLUMN receiver_id
SET
NOT NULL;

-- Step 2: Add CHECK constraint to prevent self-messaging
ALTER TABLE messages 
ADD CONSTRAINT check_no_self_messages 
CHECK (sender_id != receiver_id);

-- Step 3: Verify constraints were added
DO $$
BEGIN
    -- Check if constraints exist
    IF EXISTS (
        SELECT 1
    FROM information_schema.table_constraints
    WHERE table_name = 'messages'
        AND constraint_name = 'check_no_self_messages'
    ) THEN
        RAISE NOTICE 'CHECK constraint added successfully';
ELSE
        RAISE EXCEPTION 'CHECK constraint was not added';
END
IF;
    
    -- Check if columns are NOT NULL
    IF EXISTS (
        SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'messages'
        AND column_name = 'sender_id'
        AND is_nullable = 'NO'
    ) AND EXISTS (
        SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'messages'
        AND column_name = 'receiver_id'
        AND is_nullable = 'NO'
    ) THEN
        RAISE NOTICE 'NOT NULL constraints added successfully';
    ELSE
        RAISE EXCEPTION 'NOT NULL constraints were not added';
END
IF;
END $$;
