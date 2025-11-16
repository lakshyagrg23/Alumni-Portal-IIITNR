import 'dotenv/config';
import pool from './src/config/database.js';

async function runChecks(){
  try{
    const q = async (text, params=[]) => {
      const res = await pool.query(text, params);
      return res.rows[0] ? Object.values(res.rows[0])[0] : null;
    }

    const totalUsers = await q("SELECT COUNT(*) FROM users WHERE role='alumni'");
    const approvedUsers = await q("SELECT COUNT(*) FROM users WHERE role='alumni' AND is_approved = true");
    const notApprovedUsers = await q("SELECT COUNT(*) FROM users WHERE role='alumni' AND is_approved = false");
    const adminUsers = await q("SELECT COUNT(*) FROM users WHERE role='admin'");

    const totalProfiles = await q("SELECT COUNT(*) FROM alumni_profiles");
    const profilesWithUser = await q("SELECT COUNT(*) FROM alumni_profiles ap JOIN users u ON ap.user_id = u.id WHERE u.role='alumni'");
    const profilesLinkedToApprovedUsers = await q("SELECT COUNT(*) FROM alumni_profiles ap JOIN users u ON ap.user_id = u.id WHERE u.role='alumni' AND u.is_approved = true");

    // Users that don't have profiles
    const usersWithoutProfilesRes = await pool.query("SELECT id, email, is_approved FROM users u WHERE u.role='alumni' AND NOT EXISTS (SELECT 1 FROM alumni_profiles ap WHERE ap.user_id = u.id)");

    // Profiles without user_id or with missing user
    const profilesWithoutUserRes = await pool.query("SELECT id, user_id, first_name, last_name FROM alumni_profiles WHERE user_id IS NULL OR NOT EXISTS (SELECT 1 FROM users u WHERE u.id = alumni_profiles.user_id)");

    console.log('\n=== Counts ===');
    console.log('totalUsers (role=alumni):', totalUsers);
    console.log('approvedUsers (role=alumni, is_approved):', approvedUsers);
    console.log('notApprovedUsers (role=alumni, NOT is_approved):', notApprovedUsers);
    console.log('adminUsers (role=admin):', adminUsers);
    console.log('totalProfiles (alumni_profiles rows):', totalProfiles);
    console.log('profilesWithUser (profiles joined to users.role=alumni):', profilesWithUser);
    console.log('profilesLinkedToApprovedUsers:', profilesLinkedToApprovedUsers);

    console.log('\n=== Users without profiles (sample) ===');
    console.table(usersWithoutProfilesRes.rows);

    console.log('\n=== Profiles without user or with missing user (sample) ===');
    console.table(profilesWithoutUserRes.rows);

    // Also show what the overview query counts
    const overviewCount = await q('SELECT COUNT(*) FROM alumni_profiles');
    console.log('\nOverview (dashboard) total_alumni query counts rows in alumni_profiles:', overviewCount);

    await pool.end();
    process.exit(0);
  }catch(err){
    console.error('Error running checks:', err.message);
    console.error(err.stack);
    try{ await pool.end(); }catch(e){}
    process.exit(1);
  }
}

runChecks();
