import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const client = new pg.Client({
  host: 'localhost',
  port: 5432,
  database: 'alumni_portal',
  user: 'postgres',
  password: 'admin'
});

async function runMigration() {
  try {
    await client.connect();
    console.log('✅ Connected to database');
    
    const sqlPath = path.join(__dirname, '..', 'database', 'migrations', '009_fix_employment_status_constraint.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('📝 Running migration...');
    await client.query(sql);
    
    console.log('✅ Migration completed successfully');
    
    // Verify the constraint
    const result = await client.query(
      `SELECT conname, pg_get_constraintdef(oid) 
       FROM pg_constraint 
       WHERE conname = 'employment_status_valid'`
    );
    
    console.log('\n📋 Current constraint:');
    console.log(JSON.stringify(result.rows, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
    process.exit(0);
  }
}

runMigration();
