import { query } from './src/config/database.js';

async function testProfileFetch() {
  try {
    // Get the first approved user
    const userResult = await query(
      `SELECT id, email, role, is_approved 
       FROM users 
       WHERE is_approved = true 
       LIMIT 1`
    );
    
    if (userResult.rows.length === 0) {
      console.log('No approved users found');
      return;
    }
    
    const user = userResult.rows[0];
    console.log('\n=== USER ===');
    console.log(user);
    
    // Get their profile
    const profileResult = await query(
      `SELECT ap.*, u.email 
       FROM alumni_profiles ap
       JOIN users u ON ap.user_id = u.id
       WHERE ap.user_id = $1`,
      [user.id]
    );
    
    console.log('\n=== PROFILE ===');
    if (profileResult.rows.length > 0) {
      console.log(profileResult.rows[0]);
    } else {
      console.log('No profile found for this user');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testProfileFetch();
