import { query } from "./src/config/database.js";

const run = async () => {
  try {
    console.log("Checking indexes on users table...\n");

    // Check for indexes on email_verification_token
    const result = await query(`
      SELECT 
        tablename,
        indexname,
        indexdef
      FROM pg_indexes
      WHERE tablename = 'users' 
      AND (indexdef ILIKE '%email_verification_token%' OR indexdef ILIKE '%email_verified%')
      ORDER BY indexname;
    `);

    if (result.rows.length === 0) {
      console.log("❌ NO INDEXES FOUND for email verification columns!");
      console.log("\nThis is likely causing the timeout issue.");
      console.log("\n🔧 Creating missing indexes...\n");

      try {
        await query(
          "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email_verification_token ON users(email_verification_token)"
        );
        console.log("✓ Created index: idx_users_email_verification_token");
      } catch (e) {
        console.log("Note: Could not create CONCURRENTLY (migration may be needed)");
      }

      try {
        await query(
          "CREATE INDEX IF NOT EXISTS idx_users_email_verified ON users(email_verified)"
        );
        console.log("✓ Created index: idx_users_email_verified");
      } catch (e) {
        console.log("Note: Index may already exist");
      }
    } else {
      console.log("Existing indexes:\n");
      result.rows.forEach((row) => {
        console.log(`  Table: ${row.tablename}`);
        console.log(`  Index: ${row.indexname}`);
        console.log(`  Definition: ${row.indexdef}\n`);
      });
    }

    // Also check other important indexes
    console.log("\n📊 All indexes on users table:\n");
    const allIndexes = await query(`
      SELECT 
        indexname,
        indexdef
      FROM pg_indexes
      WHERE tablename = 'users'
      ORDER BY indexname;
    `);

    allIndexes.rows.forEach((row) => {
      console.log(`  ${row.indexname}`);
    });

    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
};

run();
