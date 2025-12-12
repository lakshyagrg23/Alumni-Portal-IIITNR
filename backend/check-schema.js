import { query } from "./src/utils/sqlHelpers.js";

async function checkSchema() {
  try {
    const result = await query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'alumni_profiles' 
      ORDER BY ordinal_position
    `);

    console.log("Alumni Profiles Table Columns:");
    console.log("================================");
    result.rows.forEach((row) => {
      console.log(
        `${row.column_name.padEnd(40)} ${row.data_type.padEnd(20)} ${row.is_nullable}`
      );
    });
    process.exit(0);
  } catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
  }
}

checkSchema();
