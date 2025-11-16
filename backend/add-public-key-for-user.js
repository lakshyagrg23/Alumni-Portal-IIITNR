import 'dotenv/config';
import db from './src/config/database.js';

// Function to generate a dummy public key for testing
function generateDummyPublicKey(userId) {
  return `sample_public_key_${userId.substring(0, 8)}`;
}

(async () => {
  try {
    const userId = "9941ad6d-cb55-488b-8429-79ff4d41ea03"; // lakshyagrg05@gmail.com
    const publicKey = generateDummyPublicKey(userId);

    console.log(`\n🔑 Adding public key for user: ${userId}\n`);

    // Check if user exists
    const user = await db.query("SELECT id, email FROM users WHERE id = $1", [
      userId,
    ]);
    if (user.rows.length === 0) {
      console.error("❌ User not found!");
      process.exit(1);
    }

    console.log(`✅ User found: ${user.rows[0].email}`);

    // Check if public key already exists
    const existingKey = await db.query(
      "SELECT * FROM public_keys WHERE user_id = $1",
      [userId]
    );
    if (existingKey.rows.length > 0) {
      console.log("⚠️  Public key already exists, updating...");
      await db.query(
        "UPDATE public_keys SET public_key = $1 WHERE user_id = $2",
        [publicKey, userId]
      );
      console.log("✅ Public key updated successfully!");
    } else {
      console.log("Adding new public key...");
      await db.query(
        "INSERT INTO public_keys (user_id, public_key) VALUES ($1, $2)",
        [userId, publicKey]
      );
      console.log("✅ Public key added successfully!");
    }

    // Verify
    const verification = await db.query(
      "SELECT * FROM public_keys WHERE user_id = $1",
      [userId]
    );
    console.log("\n📋 Verification:");
    console.log("  User ID:", verification.rows[0].user_id);
    console.log(
      "  Public Key:",
      verification.rows[0].public_key.substring(0, 50) + "..."
    );
    console.log("\n✅ Done! You can now try sending messages again.");

    process.exit(0);
  } catch (err) {
    console.error("❌ Error:", err);
    process.exit(1);
  }
})();
