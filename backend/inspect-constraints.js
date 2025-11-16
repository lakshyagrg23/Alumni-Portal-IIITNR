import 'dotenv/config';
import { query } from './src/config/database.js';

async function inspect() {
  try {
    const res = await query("SELECT conname, pg_get_constraintdef(oid) as def FROM pg_constraint WHERE conrelid = 'alumni_profiles'::regclass;");
    console.log(res.rows);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit(0);
  }
}

inspect();
