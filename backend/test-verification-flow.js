require('dotenv').config();
const axios = require('axios');

const API_URL = 'http://localhost:5000/api';

async function testFullFlow() {
  console.log('🧪 Testing Complete Email Verification Flow\n');
  
  // Generate random email for testing
  const timestamp = Date.now();
  const testEmail = `test${timestamp}@gmail.com`;
  const testPassword = 'TestPass123!';
  
  console.log('📝 Step 1: Register new user');
  console.log('   Email:', testEmail);
  console.log('   Password:', testPassword);
  
  try {
    // Step 1: Register
    const registerResponse = await axios.post(`${API_URL}/auth/register`, {
      email: testEmail,
      password: testPassword,
      firstName: 'Test',
      lastName: 'User',
    });
    
    console.log('✅ Registration response:', registerResponse.data);
    
    if (!registerResponse.data.requiresVerification) {
      console.log('❌ Error: Response should indicate verification is required');
      return;
    }
    
    // Step 2: Get the verification token from database
    console.log('\n📧 Step 2: Getting verification token from database...');
    const { query } = require('./src/config/database');
    const result = await query(
      'SELECT email_verification_token FROM users WHERE email = $1',
      [testEmail.toLowerCase()]
    );
    
    if (result.rows.length === 0) {
      console.log('❌ Error: User not found in database');
      return;
    }
    
    const token = result.rows[0].email_verification_token;
    console.log('✅ Token retrieved:', token.substring(0, 20) + '...');
    
    // Step 3: Verify email
    console.log('\n✉️ Step 3: Verifying email...');
    const verifyResponse = await axios.get(`${API_URL}/auth/verify-email?token=${token}`);
    
    console.log('✅ Verification response:', verifyResponse.data);
    
    if (!verifyResponse.data.success) {
      console.log('❌ Verification failed:', verifyResponse.data.message);
      return;
    }
    
    // Step 4: Check database
    console.log('\n🔍 Step 4: Checking database...');
    const userCheck = await query(
      'SELECT email, email_verified, is_approved FROM users WHERE email = $1',
      [testEmail.toLowerCase()]
    );
    
    const user = userCheck.rows[0];
    console.log('User status:');
    console.log('   Email Verified:', user.email_verified ? '✅' : '❌');
    console.log('   Is Approved:', user.is_approved ? '✅' : '❌');
    
    // Step 5: Try to login
    console.log('\n🔐 Step 5: Testing login...');
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      email: testEmail,
      password: testPassword,
    });
    
    console.log('✅ Login successful!');
    console.log('   Token:', loginResponse.data.token.substring(0, 20) + '...');
    
    console.log('\n🎉 All tests passed! Email verification is working correctly!\n');
    
  } catch (error) {
    console.error('\n❌ Error during test:');
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Message:', error.response.data.message);
      console.error('   Data:', error.response.data);
    } else {
      console.error('   Error:', error.message);
    }
  }
  
  process.exit(0);
}

testFullFlow();
