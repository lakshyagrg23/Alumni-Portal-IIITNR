require("dotenv").config();
const { query, testConnection, getClient } = require("./database");
const fs = require("fs");
const path = require("path");

/**
 * Node.js Database Migration Runner
 * Executes SQL schema directly through Node.js pg client
 */

const runMigrations = async () => {
  try {
    console.log("🔄 Starting database migrations...");

    // Test connection first
    await testConnection();

    // Check if schema file exists
    const schemaPath = path.join(__dirname, "../../../database/schema.sql");
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`Schema file not found: ${schemaPath}`);
    }

    console.log("📋 Reading and executing schema.sql...");

    // Read the schema file
    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
    
    // Split SQL into individual statements (basic approach)
    const statements = schemaSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    // Execute each statement
    let successCount = 0;
    for (const statement of statements) {
      try {
        if (statement.trim()) {
          console.log(`   Executing: ${statement.substring(0, 50)}...`);
          await query(statement);
          successCount++;
        }
      } catch (error) {
        // Ignore "already exists" errors
        if (error.message.includes('already exists') || 
            error.message.includes('relation') && error.message.includes('already exists')) {
          console.log(`   ⚠️  Skipping (already exists): ${statement.substring(0, 30)}...`);
          continue;
        }
        throw error;
      }
    }

    console.log(`✅ Database migrations completed successfully! (${successCount} statements executed)`);

    // Run post-migration setup
    await runPostMigrationSetup();
    
  } catch (error) {
    console.error("❌ Migration failed:", error.message);
    throw error;
  }
};

/**
 * Post-migration setup - create indexes, insert initial data, etc.
 */
const runPostMigrationSetup = async () => {
  try {
    console.log("🔧 Running post-migration setup...");

    // Create additional indexes for better performance
    const indexes = [
      "CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);",
      "CREATE INDEX IF NOT EXISTS idx_alumni_graduation_year ON alumni_profiles(graduation_year);",
      "CREATE INDEX IF NOT EXISTS idx_alumni_branch ON alumni_profiles(branch);",
      "CREATE INDEX IF NOT EXISTS idx_alumni_current_company ON alumni_profiles(current_company);",
      "CREATE INDEX IF NOT EXISTS idx_alumni_current_city ON alumni_profiles(current_city);",
    ];

    for (const indexSQL of indexes) {
      try {
        await query(indexSQL);
        console.log(`   ✅ Created index: ${indexSQL.match(/idx_\\w+/)?.[0] || 'unknown'}`);
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log(`   ⚠️  Index already exists: ${indexSQL.match(/idx_\\w+/)?.[0] || 'unknown'}`);
        } else {
          throw error;
        }
      }
    }

    console.log("✅ Post-migration setup completed!");
  } catch (error) {
    console.error("❌ Post-migration setup failed:", error.message);
    throw error;
  }
};

/**
 * Seed database with initial data
 */
const seedDatabase = async () => {
  try {
    console.log("🌱 Seeding database with initial data...");

    // Check if admin user already exists
    const existingAdmin = await query(
      "SELECT id FROM users WHERE email = $1",
      ['admin@iiitnr.edu.in']
    );

    if (existingAdmin.rows.length === 0) {
      // Create admin user
      await query(`
        INSERT INTO users (email, role, is_approved, is_active, email_verified) 
        VALUES ($1, $2, $3, $4, $5)
      `, ['admin@iiitnr.edu.in', 'admin', true, true, true]);
      
      console.log("   ✅ Created admin user: admin@iiitnr.edu.in");
    } else {
      console.log("   ⚠️  Admin user already exists");
    }

    // Add sample branches and degrees
    const sampleData = [
      // Add more sample data as needed
    ];

    console.log("✅ Database seeding completed!");
  } catch (error) {
    console.error("❌ Database seeding failed:", error.message);
    throw error;
  }
};

/**
 * Reset database (drop all tables)
 */
const resetDatabase = async () => {
  try {
    console.log("🗑️  Resetting database...");
    
    const dropTables = [
      "DROP TABLE IF EXISTS notifications CASCADE;",
      "DROP TABLE IF EXISTS messages CASCADE;", 
      "DROP TABLE IF EXISTS connections CASCADE;",
      "DROP TABLE IF EXISTS event_registrations CASCADE;",
      "DROP TABLE IF EXISTS events CASCADE;",
      "DROP TABLE IF EXISTS news CASCADE;",
      "DROP TABLE IF EXISTS education CASCADE;",
      "DROP TABLE IF EXISTS work_experiences CASCADE;",
      "DROP TABLE IF EXISTS alumni_profiles CASCADE;",
      "DROP TABLE IF EXISTS users CASCADE;",
    ];

    for (const dropSQL of dropTables) {
      await query(dropSQL);
    }

    console.log("✅ Database reset completed!");
  } catch (error) {
    console.error("❌ Database reset failed:", error.message);
    throw error;
  }
};

// Command line interface
const command = process.argv[2];

const main = async () => {
  try {
    switch (command) {
      case 'migrate':
        await runMigrations();
        break;
      case 'seed':
        await seedDatabase();
        break;
      case 'reset':
        await resetDatabase();
        break;
      case 'setup':
        await runMigrations();
        await seedDatabase();
        break;
      default:
        console.log("Usage: node migrate-node.js [migrate|seed|reset|setup]");
        process.exit(1);
    }
    process.exit(0);
  } catch (error) {
    console.error(`❌ Command '${command}' failed:`, error.message);
    process.exit(1);
  }
};

if (require.main === module) {
  main();
}

module.exports = {
  runMigrations,
  seedDatabase,
  resetDatabase,
};
