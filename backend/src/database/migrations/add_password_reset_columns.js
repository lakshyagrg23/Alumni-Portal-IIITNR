import pkg from "pg";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from backend root
dotenv.config({ path: join(__dirname, "../../../.env") });

const { Pool } = pkg;

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    `postgresql://${process.env.DB_USER || "username"}:${process.env.DB_PASSWORD || "password"}@${process.env.DB_HOST || "localhost"}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME || "alumni_portal"}`,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
});

async function addPasswordResetColumns() {
  try {
    console.log("Adding password reset columns to users table...");

    await pool.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS password_reset_token VARCHAR(255),
      ADD COLUMN IF NOT EXISTS password_reset_token_expires TIMESTAMP;
    `);

    console.log("✅ Password reset columns added successfully");
    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

addPasswordResetColumns();
