import { query } from "./src/config/database.js";

async function checkColumn() {
  try {
    const res = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'alumni_profiles' 
      AND column_name = 'is_profile_public'
    `);

    if (res.rows.length > 0) {
      console.log(
        '❌ Column "is_profile_public" STILL EXISTS - NEEDS MIGRATION'
      );
      console.log("Run: node run-schema-update.js");
    } else {
      console.log(
        '✅ Column "is_profile_public" has been removed - Migration already applied'
      );
    }

    process.exit(0);
  } catch (error) {
    console.error("Error checking column:", error);
    process.exit(1);
  }
}

checkColumn();
