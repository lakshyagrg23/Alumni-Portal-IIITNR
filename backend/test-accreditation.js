import { query } from "./src/config/database.js";

async function testFunctions() {
  try {
    console.log("Testing get_batch_coverage...");
    const result1 = await query(
      "SELECT * FROM get_batch_coverage(2015, 2024) LIMIT 3"
    );
    console.log("Batch coverage:", result1.rows);

    console.log("\nTesting get_employment_summary...");
    const result2 = await query(
      "SELECT * FROM get_employment_summary(2015, 2024) LIMIT 3"
    );
    console.log("Employment summary:", result2.rows);

    console.log("\nAll tests passed!");
    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

testFunctions();
