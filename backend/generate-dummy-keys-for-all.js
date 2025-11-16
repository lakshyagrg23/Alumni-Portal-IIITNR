import 'dotenv/config';
import db from './src/config/database.js';
import crypto from 'crypto';

/**
 * Generate a dummy but valid base64-encoded ECDH P-256 public key for testing
 * Note: These are NOT real keys and should only be used for testing purposes
 * Real keys should be generated in the browser using Web Crypto API
 */
function generateDummyECDHPublicKey() {
  // Generate a random 65-byte array (uncompressed ECDH P-256 public key format)
  // Byte 0: 0x04 (uncompressed point indicator)
  // Bytes 1-32: X coordinate
  // Bytes 33-64: Y coordinate
  const keyBytes = Buffer.alloc(65);
  keyBytes[0] = 0x04; // Uncompressed point indicator
  
  // Fill remaining bytes with random data
  for (let i = 1; i < 65; i++) {
    keyBytes[i] = crypto.randomBytes(1)[0];
  }
  
  return keyBytes.toString('base64');
}

(async () => {
  try {
    console.log('\n🔑 Generating Public Keys for Users\n');
    console.log('⚠️  WARNING: These are DUMMY keys for testing only!');
    console.log('⚠️  Real users should generate their own keys in the browser.\n');
    
    // Get all users without public keys
    const usersWithoutKeys = await db.query(`
      SELECT u.id, u.email 
      FROM users u
      LEFT JOIN public_keys pk ON u.id = pk.user_id
      WHERE pk.id IS NULL
      ORDER BY u.email
    `);
    
    if (usersWithoutKeys.rows.length === 0) {
      console.log('✅ All users already have public keys!');
      process.exit(0);
    }
    
    console.log(`Found ${usersWithoutKeys.rows.length} users without public keys:\n`);
    
    let added = 0;
    for (const user of usersWithoutKeys.rows) {
      console.log(`  Adding key for: ${user.email} (${user.id})`);
      
      const publicKey = generateDummyECDHPublicKey();
      
      try {
        await db.query(
          'INSERT INTO public_keys (user_id, public_key, algorithm) VALUES ($1, $2, $3)',
          [user.id, publicKey, 'ECDH-P256-DUMMY']
        );
        added++;
        console.log(`    ✅ Added (${publicKey.substring(0, 20)}...)`);
      } catch (err) {
        console.log(`    ❌ Failed: ${err.message}`);
      }
    }
    
    console.log(`\n✅ Done! Added ${added} public keys.`);
    console.log('\n📋 Summary:');
    
    // Show final stats
    const stats = await db.query(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(pk.id) as users_with_keys,
        COUNT(*) - COUNT(pk.id) as users_without_keys
      FROM users u
      LEFT JOIN public_keys pk ON u.id = pk.user_id
    `);
    
    const { total_users, users_with_keys, users_without_keys } = stats.rows[0];
    console.log(`  Total users: ${total_users}`);
    console.log(`  Users with keys: ${users_with_keys}`);
    console.log(`  Users without keys: ${users_without_keys}`);
    
    if (parseInt(users_without_keys) === 0) {
      console.log('\n🎉 All users now have public keys!');
      console.log('\n⚠️  IMPORTANT: These are DUMMY keys!');
      console.log('Users should visit the Messages page to generate real keys.');
      console.log('Real keys will automatically replace dummy keys on first Messages page visit.');
    }
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
})();
