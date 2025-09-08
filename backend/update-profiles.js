require('dotenv').config();
const { query } = require('./src/config/database');

async function updateUserProfiles() {
  try {
    console.log('🔧 Updating user profiles with proper names...');

    // Update the existing alumni_profiles with proper names
    const updates = [
      {
        email: 'admin@iiitnr.edu.in',
        firstName: 'Admin',
        lastName: 'User'
      },
      {
        email: 'editor@iiitnr.edu.in',
        firstName: 'News',
        lastName: 'Editor'
      },
      {
        email: 'author@iiitnr.edu.in',
        firstName: 'Content',
        lastName: 'Author'
      }
    ];

    for (const update of updates) {
      // First check if the user has an alumni_profile
      const userResult = await query('SELECT id FROM users WHERE email = $1', [update.email]);
      if (userResult.rows.length > 0) {
        const userId = userResult.rows[0].id;
        
        // Check if alumni_profile exists
        const profileResult = await query('SELECT id FROM alumni_profiles WHERE user_id = $1', [userId]);
        
        if (profileResult.rows.length > 0) {
          // Update existing profile
          await query(
            'UPDATE alumni_profiles SET first_name = $1, last_name = $2 WHERE user_id = $3',
            [update.firstName, update.lastName, userId]
          );
          console.log(`✅ Updated profile for ${update.email}`);
        } else {
          // Create new profile
          await query(
            'INSERT INTO alumni_profiles (user_id, first_name, last_name) VALUES ($1, $2, $3)',
            [userId, update.firstName, update.lastName]
          );
          console.log(`✅ Created profile for ${update.email}`);
        }
      } else {
        console.log(`❌ User not found: ${update.email}`);
      }
    }

    console.log('✅ User profiles updated successfully!');

  } catch (error) {
    console.error('❌ Error updating user profiles:', error);
  } finally {
    process.exit(0);
  }
}

updateUserProfiles();
