require('dotenv').config();
const { query } = require('./src/config/database');

async function checkUsers() {
  try {
    console.log('🔍 Checking users in database...\n');
    
    const result = await query(`
      SELECT 
        id,
        email,
        email_verified,
        is_approved,
        provider,
        email_verification_token,
        email_verification_token_expires,
        created_at
      FROM users
      ORDER BY created_at DESC
      LIMIT 10
    `);
    
    if (result.rows.length === 0) {
      console.log('No users found in database');
      return;
    }
    
    console.log('📊 Recent Users:\n');
    result.rows.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email}`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Email Verified: ${user.email_verified ? '✅' : '❌'}`);
      console.log(`   Approved: ${user.is_approved ? '✅' : '❌'}`);
      console.log(`   Provider: ${user.provider}`);
      console.log(`   Token: ${user.email_verification_token ? user.email_verification_token.substring(0, 20) + '...' : 'None'}`);
      console.log(`   Token Expires: ${user.email_verification_token_expires || 'N/A'}`);
      console.log(`   Created: ${user.created_at}`);
      console.log('');
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkUsers();
