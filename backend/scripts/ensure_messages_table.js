// Ensure messages table exists by running idempotent CREATE statements
const path = require('path');
const { query, closePool } = require('../src/config/database');

const createMessagesTableSql = `
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID,
  receiver_id UUID,
  content TEXT NOT NULL,
  iv TEXT, -- base64 IV for AES-GCM
  client_id TEXT, -- optional client-generated id to dedupe
  is_read BOOLEAN DEFAULT FALSE,
  message_type VARCHAR(20) DEFAULT 'text',
  attachment_url VARCHAR(500),
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  read_at TIMESTAMP
);

-- Create index for conversation queries
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(sender_id, receiver_id);
`;

async function ensure() {
  try {
    console.log('Ensuring messages table exists...');
    // Ensure uuid-ossp extension (idempotent)
    await query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

    const res = await query(createMessagesTableSql);
    console.log('Messages table check/create executed. Result:', res.command || 'OK');

    // If messages table existed previously without iv/client_id columns, add them
    try {
      await query("ALTER TABLE messages ADD COLUMN IF NOT EXISTS iv TEXT");
      await query("ALTER TABLE messages ADD COLUMN IF NOT EXISTS client_id TEXT");
      await query("ALTER TABLE messages ADD COLUMN IF NOT EXISTS receiver_public_key TEXT");
      await query("ALTER TABLE messages ADD COLUMN IF NOT EXISTS sender_public_key TEXT");
      console.log('Ensured columns iv, client_id, sender_public_key and receiver_public_key exist on messages table');
    } catch (e) {
      console.warn('Could not ensure iv/client_id/public_key columns on messages table:', e.message || e);
    }
  } catch (err) {
    console.error('Error ensuring messages table:', err.message || err);
    process.exitCode = 1;
  } finally {
    await closePool();
  }
}

ensure();
