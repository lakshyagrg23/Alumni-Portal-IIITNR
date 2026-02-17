import "dotenv/config";
import db from "../src/config/database.js";

const userId = "8cfeb9f6-e712-427a-91db-dabcb7d067fb";

(async () => {
  try {
    console.log(`\n🔍 Checking user: ${userId}\n`);

    const result = await db.query(
      `
      SELECT 
        u.id as user_id,
        u.email,
        ap.id as alumni_profile_id,
        ap.first_name,
        ap.last_name,
        pk.public_key
      FROM users u
      LEFT JOIN alumni_profiles ap ON u.id = ap.user_id
      LEFT JOIN public_keys pk ON u.id = pk.user_id
      WHERE u.id = $1
    `,
      [userId],
    );

    if (result.rows.length === 0) {
      console.log("❌ User NOT FOUND in database!");
      process.exit(1);
    }

    const user = result.rows[0];
    console.log("✅ User found:");
    console.log("  Email:", user.email);
    console.log("  User ID:", user.user_id);
    console.log("  Alumni Profile ID:", user.alumni_profile_id || "❌ MISSING");
    console.log(
      "  Name:",
      user.first_name && user.last_name
        ? `${user.first_name} ${user.last_name}`
        : "❌ NO NAME",
    );
    console.log("  Has Public Key:", user.public_key ? "✅ YES" : "❌ NO");

    if (!user.alumni_profile_id) {
      console.log("\n⚠️  THIS USER CANNOT SEND OR RECEIVE MESSAGES");
      console.log("   Reason: No alumni profile exists");
      console.log("   Solution: Create an alumni profile for this user");
    }

    process.exit(0);
  } catch (err) {
    console.error("❌ Error:", err);
    process.exit(1);
  }
})();
