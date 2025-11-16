import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import pool from './src/config/database.js';

const migrations = [
  '002_create_alumni_contributions.sql',
  '003_create_alumni_achievements.sql',
  '004_enhance_event_registrations.sql',
  '005_create_placement_data.sql',
  '006_create_higher_education_data.sql'
];

async function runMigrations() {
  console.log('🚀 Running remaining migrations...\n');
  
  for (const migration of migrations) {
    const migrationPath = path.join(__dirname, '..', 'database', 'migrations', migration);
    
    try {
      console.log(`📄 Running migration: ${migration}`);
      const sql = fs.readFileSync(migrationPath, 'utf8');
      await pool.query(sql);
      console.log(`✅ ${migration} completed successfully!\n`);
    } catch (error) {
      console.error(`❌ ${migration} failed:`, error.message);
      console.error('Continuing with next migration...\n');
    }
  }
  
  console.log('🎉 All migrations completed!');
  process.exit(0);
}

runMigrations();
