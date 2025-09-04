const { query, testConnection } = require("./database");
const fs = require("fs");
const path = require("path");

/**
 * Database Migration Runner
 * Executes SQL schema files for database setup
 */

const runMigrations = async () => {
  try {
    console.log("🔄 Starting database migrations...");

    // Test connection first
    await testConnection();

    // Read and execute the main schema file
    const schemaPath = path.join(__dirname, "../../database/schema.sql");

    if (!fs.existsSync(schemaPath)) {
      throw new Error(`Schema file not found: ${schemaPath}`);
    }

    const schemaSql = fs.readFileSync(schemaPath, "utf8");

    // Split by semicolons and execute each statement
    const statements = schemaSql
      .split(";")
      .map((stmt) => stmt.trim())
      .filter((stmt) => stmt.length > 0 && !stmt.startsWith("--"));

    console.log(`📋 Found ${statements.length} SQL statements to execute`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`   Executing statement ${i + 1}/${statements.length}...`);

      try {
        await query(statement);
      } catch (error) {
        // Ignore errors for statements that might already exist (like CREATE EXTENSION)
        if (error.message.includes("already exists")) {
          console.log(`   ⚠️  Skipped (already exists): ${error.message}`);
          continue;
        }
        throw error;
      }
    }

    console.log("✅ Database migrations completed successfully!");

    // Run additional setup queries
    await runPostMigrationSetup();
  } catch (error) {
    console.error("❌ Migration failed:", error.message);
    throw error;
  }
};

/**
 * Run post-migration setup queries
 */
const runPostMigrationSetup = async () => {
  try {
    console.log("🔧 Running post-migration setup...");

    // Create indexes for better performance
    const indexes = [
      "CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);",
      "CREATE INDEX IF NOT EXISTS idx_users_provider_id ON users(provider_id);",
      "CREATE INDEX IF NOT EXISTS idx_alumni_profiles_user_id ON alumni_profiles(user_id);",
      "CREATE INDEX IF NOT EXISTS idx_alumni_profiles_graduation_year ON alumni_profiles(graduation_year);",
      "CREATE INDEX IF NOT EXISTS idx_alumni_profiles_branch ON alumni_profiles(branch);",
      "CREATE INDEX IF NOT EXISTS idx_alumni_profiles_location ON alumni_profiles(current_city, current_state);",
      "CREATE INDEX IF NOT EXISTS idx_alumni_profiles_public ON alumni_profiles(is_profile_public);",
      "CREATE INDEX IF NOT EXISTS idx_work_experiences_alumni_id ON work_experiences(alumni_id);",
      "CREATE INDEX IF NOT EXISTS idx_education_alumni_id ON education(alumni_id);",
    ];

    for (const indexQuery of indexes) {
      try {
        await query(indexQuery);
        console.log(`   ✅ Index created: ${indexQuery.split(" ")[5]}`);
      } catch (error) {
        if (error.message.includes("already exists")) {
          console.log(
            `   ⚠️  Index already exists: ${indexQuery.split(" ")[5]}`
          );
        } else {
          console.error(`   ❌ Index creation failed: ${error.message}`);
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
 * Reset database (DROP and recreate all tables)
 */
const resetDatabase = async () => {
  try {
    console.log("🗑️  Resetting database...");

    await testConnection();

    // Drop all tables in reverse order (to handle foreign key constraints)
    const dropQueries = [
      "DROP TABLE IF EXISTS education CASCADE;",
      "DROP TABLE IF EXISTS work_experiences CASCADE;",
      "DROP TABLE IF EXISTS messages CASCADE;",
      "DROP TABLE IF EXISTS connections CASCADE;",
      "DROP TABLE IF EXISTS event_registrations CASCADE;",
      "DROP TABLE IF EXISTS events CASCADE;",
      "DROP TABLE IF EXISTS news CASCADE;",
      "DROP TABLE IF EXISTS alumni_profiles CASCADE;",
      "DROP TABLE IF EXISTS users CASCADE;",
    ];

    for (const dropQuery of dropQueries) {
      await query(dropQuery);
      console.log(`   ✅ Dropped: ${dropQuery.split(" ")[4]}`);
    }

    console.log("✅ Database reset completed!");

    // Run migrations again
    await runMigrations();
  } catch (error) {
    console.error("❌ Database reset failed:", error.message);
    throw error;
  }
};

/**
 * Seed database with initial data
 */
const seedDatabase = async () => {
  try {
    console.log("🌱 Seeding database...");

    await testConnection();

    // Check if admin user already exists
    const adminCheck = await query("SELECT id FROM users WHERE email = $1", [
      "admin@iiitnr.edu.in",
    ]);

    if (adminCheck.rows.length === 0) {
      // Create admin user
      const bcrypt = require("bcryptjs");
      const adminPassword = await bcrypt.hash("admin123", 12);

      await query(
        `
        INSERT INTO users (email, password_hash, role, is_approved, email_verified)
        VALUES ($1, $2, $3, $4, $5)
      `,
        ["admin@iiitnr.edu.in", adminPassword, "admin", true, true]
      );

      console.log(
        "   ✅ Created admin user: admin@iiitnr.edu.in (password: admin123)"
      );
    } else {
      console.log("   ⚠️  Admin user already exists");
    }

    console.log("✅ Database seeding completed!");
  } catch (error) {
    console.error("❌ Database seeding failed:", error.message);
    throw error;
  }
};

// Command line interface
if (require.main === module) {
  const command = process.argv[2];

  const commands = {
    migrate: runMigrations,
    reset: resetDatabase,
    seed: seedDatabase,
    setup: async () => {
      await runMigrations();
      await seedDatabase();
    },
  };

  if (commands[command]) {
    commands[command]()
      .then(() => {
        console.log(`✅ Command '${command}' completed successfully!`);
        process.exit(0);
      })
      .catch((error) => {
        console.error(`❌ Command '${command}' failed:`, error.message);
        process.exit(1);
      });
  } else {
    console.log("Available commands:");
    console.log("  migrate - Run database migrations");
    console.log("  reset   - Reset database (DROP and recreate)");
    console.log("  seed    - Seed database with initial data");
    console.log("  setup   - Run migrations and seed");
    console.log("");
    console.log("Usage: node migrate.js <command>");
    process.exit(1);
  }
}

module.exports = {
  runMigrations,
  resetDatabase,
  seedDatabase,
};
