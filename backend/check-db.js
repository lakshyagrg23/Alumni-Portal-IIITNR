import 'dotenv/config';
import { query } from './src/config/database.js';

async function checkDatabase() {
  try {
    // Check tables
    const tables = await query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';");
    console.log("📋 Tables in database:");
    tables.rows.forEach(row => console.log(`   - ${row.table_name}`));
    
    // Check users table structure
    if (tables.rows.find(row => row.table_name === 'users')) {
      const userCount = await query("SELECT COUNT(*) FROM users;");
      console.log(`👥 Users count: ${userCount.rows[0].count}`);
    }
    
    // Check alumni_profiles table structure  
    if (tables.rows.find(row => row.table_name === 'alumni_profiles')) {
      const alumniCount = await query("SELECT COUNT(*) FROM alumni_profiles;");
      console.log(`🎓 Alumni profiles count: ${alumniCount.rows[0].count}`);
    }
    
    console.log("✅ Database check completed!");
  } catch (error) {
    console.error("❌ Database check failed:", error.message);
  }
  process.exit(0);
}

checkDatabase();
