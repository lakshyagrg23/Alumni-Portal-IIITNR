import "dotenv/config";
import db from "../src/config/database.js";

(async () => {
  try {
    console.log("\n=== Checking Public Keys Issue ===\n");

    // Check all public keys
    const keys = await db.query("SELECT * FROM public_keys");
    console.log("📋 Public Keys in database:", keys.rows.length);
    keys.rows.forEach((key) => {
      console.log(`  - user_id: ${key.user_id}`);
      console.log(`    public_key: ${key.public_key.substring(0, 50)}...`);
    });

    // Check the specific user
    const userId = "9941ad6d-cb55-488b-8429-79ff4d41ea03";
    console.log(`\n🔍 Looking for user: ${userId}`);

    const user = await db.query("SELECT id, email FROM users WHERE id = $1", [
      userId,
    ]);
    if (user.rows.length > 0) {
      console.log("✅ User exists:", user.rows[0]);

      // Check if user has alumni profile
      const profile = await db.query(
        "SELECT id, user_id, first_name, last_name FROM alumni_profiles WHERE user_id = $1",
        [userId],
      );
      if (profile.rows.length > 0) {
        console.log("✅ Alumni profile exists:", profile.rows[0]);
      } else {
        console.log("❌ No alumni profile found for this user");
      }

      // Check if user has public key
      const pubKey = await db.query(
        "SELECT * FROM public_keys WHERE user_id = $1",
        [userId],
      );
      if (pubKey.rows.length > 0) {
        console.log("✅ Public key exists for this user");
      } else {
        console.log(
          "❌ No public key found for this user - THIS IS THE ISSUE!",
        );
      }
    } else {
      console.log("❌ User does not exist in database");
    }

    // Check all users and their public keys
    console.log("\n📊 All users and their public key status:");
    const allUsers = await db.query(`
      SELECT u.id, u.email,
             CASE WHEN pk.user_id IS NOT NULL THEN 'YES' ELSE 'NO' END as has_public_key
      FROM users u
      LEFT JOIN public_keys pk ON u.id = pk.user_id
      ORDER BY u.email
    `);
    allUsers.rows.forEach((u) => {
      console.log(`  ${u.has_public_key === "YES" ? "✅" : "❌"} ${u.email}`);
    });

    process.exit(0);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
})();
