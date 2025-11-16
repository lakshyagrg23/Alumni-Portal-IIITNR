import 'dotenv/config';
import db from './src/config/database.js';

(async () => {
  try {
    console.log("\n🗑️  Clearing invalid/dummy public keys...\n");

    // Get all public keys
    const keys = await db.query("SELECT user_id, public_key FROM public_keys");
    console.log(`Found ${keys.rows.length} public keys in database`);

    let invalidCount = 0;
    for (const key of keys.rows) {
      // Check if it's a dummy key (starts with "sample_public_key_")
      if (key.public_key.startsWith("sample_public_key_")) {
        console.log(`  ❌ Removing dummy key for user: ${key.user_id}`);
        await db.query("DELETE FROM public_keys WHERE user_id = $1", [
          key.user_id,
        ]);
        invalidCount++;
      } else {
        // Try to validate if it's a proper base64 encoded key
        try {
          atob(key.public_key);
          console.log(`  ✅ Valid key for user: ${key.user_id}`);
        } catch (e) {
          console.log(
            `  ❌ Invalid base64 key for user: ${key.user_id} - removing`
          );
          await db.query("DELETE FROM public_keys WHERE user_id = $1", [
            key.user_id,
          ]);
          invalidCount++;
        }
      }
    }

    console.log(`\n✅ Cleaned up ${invalidCount} invalid public keys`);
    console.log(
      "📝 Users will generate and upload new valid keys when they visit the Messages page"
    );

    // Show remaining keys
    const remaining = await db.query("SELECT COUNT(*) FROM public_keys");
    console.log(`\n📊 Remaining valid keys: ${remaining.rows[0].count}`);

    process.exit(0);
  } catch (err) {
    console.error("❌ Error:", err);
    process.exit(1);
  }
})();
