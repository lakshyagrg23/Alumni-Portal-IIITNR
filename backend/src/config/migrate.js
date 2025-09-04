const { query, testConnection } = require("./database");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

/**
 * Database Migration Runner
 * Uses psql to execute SQL schema files directly
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

    console.log("📋 Executing schema.sql using psql...");

    // Execute schema file using psql
    await executePsqlFile(schemaPath);

    console.log("✅ Database migrations completed successfully!");

    // Run additional setup queries if needed
    await runPostMigrationSetup();
  } catch (error) {
    console.error("❌ Migration failed:", error.message);
    throw error;
  }
};

/**
 * Execute SQL file using psql command
 */
const executePsqlFile = (filePath) => {
  return new Promise((resolve, reject) => {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      reject(new Error("DATABASE_URL environment variable is required"));
      return;
    }

    // Parse DATABASE_URL to get connection parameters
    let psqlCommand, args;
    
    try {
      const url = new URL(dbUrl);
      const hostname = url.hostname;
      const port = url.port || 5432;
      const database = url.pathname.substring(1); // Remove leading slash
      const username = url.username;
      const password = url.password;

      // Build psql command
      args = [
        '-h', hostname,
        '-p', port.toString(),
        '-U', username,
        '-d', database,
        '-f', filePath,
        '-v', 'ON_ERROR_STOP=1' // Stop on first error
      ];

      // Set password via environment variable if provided
      const env = { ...process.env };
      if (password) {
        env.PGPASSWORD = password;
      }

      console.log(`   Executing: psql -h ${hostname} -p ${port} -U ${username} -d ${database} -f ${filePath}`);

      const psql = spawn('psql', args, { 
        env,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      psql.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      psql.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      psql.on('close', (code) => {
        if (code === 0) {
          console.log("   ✅ Schema executed successfully");
          if (stdout.trim()) {
            console.log("   📝 Output:", stdout.trim());
          }
          resolve();
        } else {
          console.error("   ❌ psql execution failed");
          if (stderr.trim()) {
            console.error("   Error:", stderr.trim());
          }
          reject(new Error(`psql exited with code ${code}: ${stderr}`));
        }
      });

      psql.on('error', (error) => {
        reject(new Error(`Failed to start psql: ${error.message}`));
      });

    } catch (error) {
      reject(new Error(`Invalid DATABASE_URL: ${error.message}`));
    }
  });
};

/**
 * Run post-migration setup queries
 */
const runPostMigrationSetup = async () => {
  try {
    console.log("🔧 Running post-migration setup...");

    // Check if tables were created successfully
    const tablesCheck = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    console.log(`   ✅ Found ${tablesCheck.rows.length} tables:`);
    tablesCheck.rows.forEach(row => {
      console.log(`      - ${row.table_name}`);
    });

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
