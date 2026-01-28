const { query } = require('./src/config/database.js');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  try {
    console.log('🔄 Running migration: add_message_delete_edit.sql');
    
    const migrationPath = path.join(__dirname, '../database/migrations/add_message_delete_edit.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    await query(sql);
    
    console.log('✅ Migration completed successfully!');
    console.log('📋 Changes:');
    console.log('   - Added is_deleted column to messages table');
    console.log('   - Added deleted_at column to messages table');
    console.log('   - Added deleted_by column to messages table');
    console.log('   - Added is_edited column to messages table');
    console.log('   - Added edited_at column to messages table');
    console.log('   - Added original_content column to messages table');
    console.log('   - Created index on is_deleted for performance');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
