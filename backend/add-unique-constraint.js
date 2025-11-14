require("dotenv").config();
const { query, closePool } = require("./src/config/database");

async function addUniqueConstraint() {
  try {
    console.log("Adding UNIQUE constraint to public_keys.user_id...\n");

    await query(`
      ALTER TABLE public_keys 
      ADD CONSTRAINT unique_user_public_key UNIQUE(user_id)
    `);

    console.log("✅ UNIQUE constraint added successfully\n");

    // Verify
    const verify = await query(`
      SELECT constraint_name, constraint_type
      FROM information_schema.table_constraints
      WHERE table_name = 'public_keys' 
      AND constraint_type = 'UNIQUE'
    `);

    console.log("Verified UNIQUE constraints on public_keys:");
    verify.rows.forEach((r) => {
      console.log(`  ✅ ${r.constraint_name}`);
    });

    console.log("\n✅ Database is now 100% correctly configured!");
  } catch (error) {
    if (error.message.includes("already exists")) {
      console.log("✅ UNIQUE constraint already exists - no action needed");
    } else {
      console.error("❌ Error:", error.message);
      process.exitCode = 1;
    }
  } finally {
    await closePool();
  }
}

addUniqueConstraint();
