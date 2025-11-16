import 'dotenv/config';
import db from './src/config/database.js';

(async () => {
  try {
    console.log('\n🔍 Checking User & Alumni Profile Status\n');
    
    // Check all users and their profiles
    const allUsers = await db.query(`
      SELECT 
        u.id as user_id,
        u.email,
        ap.id as alumni_profile_id,
        ap.first_name,
        ap.last_name,
        CASE WHEN pk.id IS NOT NULL THEN 'YES' ELSE 'NO' END as has_public_key
      FROM users u
      LEFT JOIN alumni_profiles ap ON u.id = ap.user_id
      LEFT JOIN public_keys pk ON u.id = pk.user_id
      ORDER BY u.email
    `);
    
    console.log('📊 All Users Status:\n');
    console.log('Email'.padEnd(35), '| Has Profile | Has Public Key | Profile ID');
    console.log('-'.repeat(100));
    
    let usersWithoutProfiles = [];
    
    allUsers.rows.forEach(user => {
      const hasProfile = user.alumni_profile_id ? '✅ YES' : '❌ NO';
      const hasKey = user.has_public_key === 'YES' ? '✅ YES' : '❌ NO';
      const profileId = user.alumni_profile_id || 'N/A';
      
      console.log(
        user.email.padEnd(35),
        '|',
        hasProfile.padEnd(10),
        '|',
        hasKey.padEnd(13),
        '|',
        profileId
      );
      
      if (!user.alumni_profile_id) {
        usersWithoutProfiles.push(user);
      }
    });
    
    if (usersWithoutProfiles.length > 0) {
      console.log('\n⚠️  WARNING: Some users don\'t have alumni profiles!');
      console.log('Users without profiles cannot send or receive messages.\n');
      console.log('Users without alumni profiles:');
      usersWithoutProfiles.forEach(u => {
        console.log(`  - ${u.email} (${u.user_id})`);
      });
    } else {
      console.log('\n✅ All users have alumni profiles!');
    }
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
})();
