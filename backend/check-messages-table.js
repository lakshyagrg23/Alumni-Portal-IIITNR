require("dotenv").config();
const { query, closePool } = require("./src/config/database");

async function checkMessagesTable() {
  try {
    console.log("📋 Checking messages table structure...\n");

    // Get columns
    const columns = await query(`
      SELECT column_name, data_type, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'messages' 
      ORDER BY ordinal_position
    `);

    console.log("Columns in messages table:");
    columns.rows.forEach((col) => {
      console.log(
        `  - ${col.column_name} (${col.data_type}) ${col.is_nullable === "NO" ? "NOT NULL" : "NULLABLE"}`
      );
    });

    // Get constraints
    const constraints = await query(`
      SELECT 
        tc.constraint_name, 
        tc.constraint_type,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc 
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      LEFT JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.table_name = 'messages'
    `);

    console.log("\nConstraints on messages table:");
    constraints.rows.forEach((con) => {
      if (con.constraint_type === "FOREIGN KEY") {
        console.log(
          `  - FK: ${con.column_name} -> ${con.foreign_table_name}(${con.foreign_column_name})`
        );
      } else {
        console.log(`  - ${con.constraint_type}: ${con.column_name}`);
      }
    });

    // Get indexes
    const indexes = await query(`
      SELECT indexname, indexdef 
      FROM pg_indexes 
      WHERE tablename = 'messages'
    `);

    console.log("\nIndexes on messages table:");
    indexes.rows.forEach((idx) => {
      console.log(`  - ${idx.indexname}`);
    });

    // Count messages
    const count = await query("SELECT COUNT(*) FROM messages");
    console.log(`\n📊 Total messages: ${count.rows[0].count}`);
  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await closePool();
  }
}

checkMessagesTable();
