// Ensure messaging tables exist for the messaging feature
import path from 'path';
import { query, closePool, testConnection } from '../src/config/database.js';

async function ensureMessagingTables() {
  try {
    console.log('🚀 Ensuring messaging tables exist...\n');
    
    // Test connection first
    console.log('📡 Testing database connection...');
    await testConnection();
    console.log('✅ Database connection successful\n');
    
    // Ensure uuid-ossp extension (idempotent)
    console.log('🔧 Ensuring UUID extension...');
    await query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    console.log('✅ UUID extension ready\n');

    // 1. Create public_keys table
    console.log('🔑 Creating public_keys table...');
    const createPublicKeysSQL = `
      CREATE TABLE IF NOT EXISTS public_keys (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        public_key TEXT NOT NULL,
        algorithm VARCHAR(50) DEFAULT 'ECDH-P256',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_user_public_key UNIQUE(user_id)
      );
    `;
    await query(createPublicKeysSQL);
    console.log('✅ Public keys table ready');

    // 2. Create or update messages table
    console.log('💬 Creating messages table...');
    const createMessagesTableSql = `
      CREATE TABLE IF NOT EXISTS messages (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        sender_id UUID REFERENCES alumni_profiles(id) ON DELETE CASCADE,
        receiver_id UUID REFERENCES alumni_profiles(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        iv TEXT,
        client_id TEXT,
        sender_public_key TEXT,
        receiver_public_key TEXT,
        is_read BOOLEAN DEFAULT FALSE,
        message_type VARCHAR(20) DEFAULT 'text',
        attachment_url VARCHAR(500),
        sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        read_at TIMESTAMP,
        CONSTRAINT messages_check CHECK (sender_id <> receiver_id)
      );
    `;
    await query(createMessagesTableSql);
    console.log('✅ Messages table ready');

    // 3. Add missing columns to existing messages table
    console.log('🔄 Ensuring all required columns exist...');
    const alterCommands = [
      "ALTER TABLE messages ADD COLUMN IF NOT EXISTS iv TEXT",
      "ALTER TABLE messages ADD COLUMN IF NOT EXISTS client_id TEXT",
      "ALTER TABLE messages ADD COLUMN IF NOT EXISTS sender_public_key TEXT",
      "ALTER TABLE messages ADD COLUMN IF NOT EXISTS receiver_public_key TEXT"
    ];

    for (const cmd of alterCommands) {
      try {
        await query(cmd);
      } catch (e) {
        if (!e.message.includes('already exists')) {
          console.warn(`Warning: ${e.message}`);
        }
      }
    }
    console.log('✅ All columns ensured');

    // 4. Create indexes
    console.log('📊 Creating indexes...');
    const indexCommands = [
      "CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(sender_id, receiver_id)",
      "CREATE INDEX IF NOT EXISTS idx_messages_client_id ON messages(client_id) WHERE client_id IS NOT NULL",
      "CREATE INDEX IF NOT EXISTS idx_messages_sent_at ON messages(sent_at DESC)",
      "CREATE INDEX IF NOT EXISTS idx_public_keys_user_id ON public_keys(user_id)"
    ];

    for (const cmd of indexCommands) {
      await query(cmd);
    }
    console.log('✅ Indexes created');

    // 5. Verification
    console.log('\n🔍 Verifying tables...');
    const verifyQueries = [
      { name: 'messages', query: "SELECT COUNT(*) as count FROM messages" },
      { name: 'public_keys', query: "SELECT COUNT(*) as count FROM public_keys" }
    ];

    for (const { name, query: verifyQuery } of verifyQueries) {
      try {
        const result = await query(verifyQuery);
        console.log(`✅ ${name} table: ${result.rows[0].count} records`);
      } catch (e) {
        console.log(`❌ ${name} table: Error - ${e.message}`);
      }
    }

    console.log('\n🎉 Messaging tables setup completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('   1. Restart your backend server');
    console.log('   2. Users can now generate E2E encryption keys');
    console.log('   3. Test sending encrypted messages');

  } catch (err) {
    console.error('\n💥 Error setting up messaging tables:', err.message);
    console.error('Full error:', err);
    process.exitCode = 1;
  } finally {
    await closePool();
    console.log('\n👋 Database connection closed.');
  }
}

// Alias for backwards compatibility
const ensure = ensureMessagingTables;

// Run the migration if this file is executed directly
if (require.main === module) {
  ensureMessagingTables();
}

module.exports = { ensureMessagingTables, ensure };

ensure();
