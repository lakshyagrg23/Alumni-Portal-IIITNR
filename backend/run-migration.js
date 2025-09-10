const { Pool } = require('pg');
require('dotenv').config();

// Database configuration
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'alumni_portal',
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('Starting database migration...');
    
    // Add first_name and last_name to users table
    console.log('Adding first_name and last_name columns to users table...');
    await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name VARCHAR(100)');
    await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name VARCHAR(100)');
    
    // Add new fields to alumni_profiles table
    console.log('Adding new fields to alumni_profiles table...');
    await client.query('ALTER TABLE alumni_profiles ADD COLUMN IF NOT EXISTS is_open_to_work BOOLEAN DEFAULT FALSE');
    await client.query('ALTER TABLE alumni_profiles ADD COLUMN IF NOT EXISTS is_available_for_mentorship BOOLEAN DEFAULT FALSE');
    
    // Create or update the trigger function for updated_at
    console.log('Creating/updating trigger function...');
    await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);
    
    // Create triggers for users table
    console.log('Creating triggers...');
    await client.query('DROP TRIGGER IF EXISTS update_users_updated_at ON users');
    await client.query(`
      CREATE TRIGGER update_users_updated_at 
      BEFORE UPDATE ON users 
      FOR EACH ROW 
      EXECUTE FUNCTION update_updated_at_column()
    `);
    
    // Create triggers for alumni_profiles table
    await client.query('DROP TRIGGER IF EXISTS update_alumni_profiles_updated_at ON alumni_profiles');
    await client.query(`
      CREATE TRIGGER update_alumni_profiles_updated_at 
      BEFORE UPDATE ON alumni_profiles 
      FOR EACH ROW 
      EXECUTE FUNCTION update_updated_at_column()
    `);
    
    console.log('Migration completed successfully!');
    
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the migration
runMigration()
  .then(() => {
    console.log('All migrations completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
