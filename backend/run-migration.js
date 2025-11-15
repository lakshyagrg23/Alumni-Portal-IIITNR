require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('./src/config/database');

async function runMigration() {
  const migrationPath = path.join(__dirname, '..', 'database', 'migrations', '001_add_accreditation_fields.sql');
  
  try {
    console.log('Reading migration file...');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Executing migration: 001_add_accreditation_fields.sql');
    await pool.query(sql);
    
    console.log('✅ Migration completed successfully!');
    
    // Verify columns were added
    console.log('\nVerifying new columns...');
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'alumni_profiles'
      AND column_name IN ('employment_status', 'consent_for_accreditation', 'profile_verified_at', 'current_employer', 'higher_study_institution')
      ORDER BY column_name;
    `);
    
    console.log('\nNew columns added:');
    console.table(result.rows);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

runMigration();
