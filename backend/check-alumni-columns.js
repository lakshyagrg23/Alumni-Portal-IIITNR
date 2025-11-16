import 'dotenv/config';
import pool from './src/config/database.js';

async function checkColumns() {
  try {
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'alumni_profiles'
      ORDER BY ordinal_position;
    `);
    
    console.log('\n=== Alumni Profiles Table Columns ===\n');
    console.table(result.rows);
    
    // Check if email column exists
    const hasEmail = result.rows.some(row => row.column_name === 'email');
    console.log('\nHas email column:', hasEmail);
    console.log('Has phone column:', result.rows.some(row => row.column_name === 'phone'));
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkColumns();
