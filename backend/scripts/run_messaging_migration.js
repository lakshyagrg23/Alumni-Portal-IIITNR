#!/usr/bin/env node

/**
 * Messaging Feature Migration Script
 * 
 * This script applies the complete messaging feature migration including:
 * - Public keys table for E2E encryption
 * - Messages table with encryption support
 * - Conversations table for chat management
 * - Message read receipts
 * - Indexes for performance
 * - Triggers for automation
 * - Views for easier querying
 * - Security policies
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config();

const { query, testConnection, closePool } = require('../src/config/database');

async function runMigration() {
  console.log('🚀 Starting Messaging Feature Migration...\n');

  try {
    // Test database connection first
    console.log('📡 Testing database connection...');
    await testConnection();
    console.log('✅ Database connection successful\n');

    // Read the migration file
    const migrationPath = path.join(__dirname, '../database/migrations/001_messaging_feature.sql');
    console.log('📖 Reading migration file:', migrationPath);
    
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${migrationPath}`);
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    console.log('✅ Migration file loaded successfully\n');

    // Split SQL into individual statements (rough approach)
    console.log('🔄 Executing migration statements...');
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--') && !stmt.startsWith('/*'));

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // Skip comments and empty statements
      if (!statement || statement.startsWith('--') || statement.startsWith('/*')) {
        continue;
      }

      try {
        console.log(`   Executing statement ${i + 1}/${statements.length}...`);
        await query(statement);
        successCount++;
      } catch (error) {
        // Some errors are expected (like "already exists")
        if (error.message.includes('already exists') || 
            error.message.includes('does not exist') ||
            error.message.includes('duplicate key')) {
          console.log(`   ⚠️  Statement ${i + 1}: ${error.message} (continuing...)`);
          successCount++;
        } else {
          console.error(`   ❌ Error in statement ${i + 1}:`, error.message);
          errorCount++;
        }
      }
    }

    console.log('\n📊 Migration Summary:');
    console.log(`   ✅ Successful statements: ${successCount}`);
    console.log(`   ❌ Failed statements: ${errorCount}`);

    if (errorCount === 0) {
      console.log('\n🎉 Migration completed successfully!');
    } else {
      console.log('\n⚠️  Migration completed with some errors. Please review above.');
    }

    // Verify key tables exist
    console.log('\n🔍 Verifying migration results...');
    
    const verificationQueries = [
      "SELECT COUNT(*) as count FROM information_schema.tables WHERE table_name = 'public_keys'",
      "SELECT COUNT(*) as count FROM information_schema.tables WHERE table_name = 'messages'", 
      "SELECT COUNT(*) as count FROM information_schema.tables WHERE table_name = 'conversations'",
      "SELECT COUNT(*) as count FROM information_schema.views WHERE table_name = 'conversation_list'",
      "SELECT COUNT(*) as count FROM information_schema.views WHERE table_name = 'message_thread'"
    ];

    const tableNames = ['public_keys', 'messages', 'conversations', 'conversation_list (view)', 'message_thread (view)'];

    for (let i = 0; i < verificationQueries.length; i++) {
      try {
        const result = await query(verificationQueries[i]);
        const exists = result.rows[0].count > 0;
        console.log(`   ${exists ? '✅' : '❌'} ${tableNames[i]}: ${exists ? 'EXISTS' : 'MISSING'}`);
      } catch (error) {
        console.log(`   ❌ ${tableNames[i]}: Error checking - ${error.message}`);
      }
    }

    // Show sample data
    console.log('\n📋 Current state:');
    try {
      const messageCount = await query("SELECT COUNT(*) as count FROM messages");
      const pkCount = await query("SELECT COUNT(*) as count FROM public_keys");
      const convCount = await query("SELECT COUNT(*) as count FROM conversations");
      
      console.log(`   📨 Messages: ${messageCount.rows[0].count}`);
      console.log(`   🔑 Public Keys: ${pkCount.rows[0].count}`);
      console.log(`   💬 Conversations: ${convCount.rows[0].count}`);
    } catch (error) {
      console.log('   ⚠️  Could not retrieve counts:', error.message);
    }

    console.log('\n🔧 Next Steps:');
    console.log('   1. Restart your backend server to pick up the new tables');
    console.log('   2. Test the messaging feature in your frontend');
    console.log('   3. Generate E2E keys for existing users');
    console.log('   4. Send test messages between users');

  } catch (error) {
    console.error('\n💥 Migration failed:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  } finally {
    await closePool();
    console.log('\n👋 Database connection closed.');
  }
}

// Alternative: Run individual migration steps
async function runMigrationSteps() {
  console.log('🔧 Running step-by-step migration...\n');

  const steps = [
    {
      name: 'Create public_keys table',
      sql: `
        CREATE TABLE IF NOT EXISTS public_keys (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          public_key TEXT NOT NULL,
          algorithm VARCHAR(50) DEFAULT 'ECDH-P256',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT unique_user_public_key UNIQUE(user_id)
        );
      `
    },
    {
      name: 'Add missing columns to messages table',
      sql: `
        ALTER TABLE messages 
        ADD COLUMN IF NOT EXISTS iv TEXT,
        ADD COLUMN IF NOT EXISTS client_id TEXT,
        ADD COLUMN IF NOT EXISTS sender_public_key TEXT,
        ADD COLUMN IF NOT EXISTS receiver_public_key TEXT;
      `
    },
    {
      name: 'Create conversations table',
      sql: `
        CREATE TABLE IF NOT EXISTS conversations (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          participant1_id UUID NOT NULL REFERENCES alumni_profiles(id) ON DELETE CASCADE,
          participant2_id UUID NOT NULL REFERENCES alumni_profiles(id) ON DELETE CASCADE,
          last_message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
          last_message_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT unique_conversation UNIQUE(LEAST(participant1_id, participant2_id), GREATEST(participant1_id, participant2_id)),
          CONSTRAINT different_participants CHECK (participant1_id <> participant2_id)
        );
      `
    },
    {
      name: 'Create indexes',
      sql: `
        CREATE INDEX IF NOT EXISTS idx_public_keys_user_id ON public_keys(user_id);
        CREATE INDEX IF NOT EXISTS idx_messages_client_id ON messages(client_id) WHERE client_id IS NOT NULL;
        CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(sender_id, receiver_id);
        CREATE INDEX IF NOT EXISTS idx_conversations_participant1 ON conversations(participant1_id);
        CREATE INDEX IF NOT EXISTS idx_conversations_participant2 ON conversations(participant2_id);
      `
    }
  ];

  try {
    await testConnection();
    
    for (const step of steps) {
      console.log(`🔄 ${step.name}...`);
      try {
        await query(step.sql);
        console.log(`✅ ${step.name} completed`);
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log(`⚠️  ${step.name}: Already exists, skipping`);
        } else {
          console.error(`❌ ${step.name} failed:`, error.message);
        }
      }
    }

    console.log('\n🎉 Step-by-step migration completed!');

  } catch (error) {
    console.error('💥 Step-by-step migration failed:', error.message);
    process.exit(1);
  } finally {
    await closePool();
  }
}

// Main execution
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--steps')) {
    runMigrationSteps();
  } else {
    runMigration();
  }
}

module.exports = { runMigration, runMigrationSteps };