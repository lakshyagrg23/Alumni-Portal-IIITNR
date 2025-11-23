import 'dotenv/config';
import { query, closePool } from '../src/config/database.js';

async function addUpdatedAtToMessages() {
  try {
    console.log('🚀 Adding updated_at to messages and creating trigger...');

    // Ensure helper function exists (idempotent)
    console.log('🔧 Ensuring trigger function update_updated_at_column() exists...');
    await query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $$ LANGUAGE 'plpgsql';
    `);
    console.log('✅ Trigger function ready');

    // Add updated_at column if missing
    console.log('🗄️  Ensuring messages.updated_at column...');
    await query(`
      ALTER TABLE messages
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    `);
    console.log('✅ Column ensured');

    // Backfill updated_at where null using sent_at or now()
    console.log('🧹 Backfilling NULL updated_at values...');
    await query(`
      UPDATE messages
      SET updated_at = COALESCE(updated_at, sent_at, CURRENT_TIMESTAMP)
      WHERE updated_at IS NULL
    `);
    console.log('✅ Backfill complete');

    // Create/replace trigger on messages
    console.log('⏱️  Creating BEFORE UPDATE trigger on messages...');
    await query(`
      DROP TRIGGER IF EXISTS update_messages_updated_at ON messages;
      CREATE TRIGGER update_messages_updated_at
      BEFORE UPDATE ON messages
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
    `);
    console.log('✅ Trigger created');

    console.log('\n🎉 Migration complete: messages.updated_at with trigger is in place.');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exitCode = 1;
  } finally {
    await closePool();
  }
}

// Execute when run directly
if (process.argv[1] && process.argv[1].includes('add-updated-at-to-messages')) {
  addUpdatedAtToMessages();
}

export default addUpdatedAtToMessages;
