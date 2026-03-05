import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import pg from "pg";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config();

const { Pool } = pg;

// Create a new pool
const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432"),
  database: process.env.DB_NAME || "alumni_portal",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "postgres",
});

async function runMigration() {
  const client = await pool.connect();

  try {
    console.log("🔧 Applying employment_status constraint fix...\n");

    // Read the migration file
    const migrationPath = join(
      __dirname,
      "..",
      "database",
      "migrations",
      "009_fix_employment_status_constraint.sql"
    );
    const migrationSQL = readFileSync(migrationPath, "utf8");

    // Execute the migration
    await client.query(migrationSQL);

    console.log("✅ Migration completed successfully!\n");

    // Verify the constraint
    const result = await client.query(`
      SELECT conname, pg_get_constraintdef(oid) as definition
      FROM pg_constraint 
      WHERE conname = 'employment_status_valid'
    `);

    if (result.rows.length > 0) {
      console.log("📋 Current constraint definition:");
      console.log(result.rows[0].definition);
    }
  } catch (error) {
    console.error("❌ Migration failed:", error.message);
    console.error("Full error:", error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
