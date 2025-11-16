import 'dotenv/config';
import { query } from './src/config/database.js';

async function checkProfileData() {
  try {
    // Get user by email
    const userResult = await query(
      `SELECT id, email FROM users WHERE email = $1`,
      ['ash123@iiitnr.edu.in']
    );
    
    if (userResult.rows.length === 0) {
      console.log('User not found');
      return;
    }
    
    const user = userResult.rows[0];
    console.log('\n=== USER ===');
    console.log(user);
    
    // Check if profile exists
    const profileResult = await query(
      `SELECT * FROM alumni_profiles WHERE user_id = $1`,
      [user.id]
    );
    
    console.log('\n=== PROFILE ===');
    if (profileResult.rows.length > 0) {
      console.log(profileResult.rows[0]);
    } else {
      console.log('No profile found - creating one...');
      
      // Create profile with name from email
      const insertResult = await query(
        `INSERT INTO alumni_profiles 
         (user_id, first_name, last_name, email, created_at, updated_at)
         VALUES ($1, $2, $3, $4, NOW(), NOW())
         RETURNING *`,
        [user.id, 'Ashutosh', 'Garg', user.email]
      );
      
      console.log('\n=== CREATED PROFILE ===');
      console.log(insertResult.rows[0]);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkProfileData();
