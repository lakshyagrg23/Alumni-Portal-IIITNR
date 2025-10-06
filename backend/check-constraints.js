require("dotenv").config();
const { query, closePool } = require("./src/config/database");

async function checkConstraints() {
  try {
    const result = await query(`
      SELECT conname, pg_get_constraintdef(oid) as definition 
      FROM pg_constraint 
      WHERE conrelid = 'messages'::regclass AND contype = 'c'
    `);

    console.log("✅ CHECK constraints on messages table:");
    if (result.rows.length === 0) {
      console.log("   ⚠️  No CHECK constraints found!");
    } else {
      result.rows.forEach((c) => {
        console.log(`   - ${c.conname}: ${c.definition}`);
      });
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await closePool();
  }
}

checkConstraints();
