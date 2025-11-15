require('dotenv').config({ path: '.env' });
const pool = require('./src/config/database');

async function testProfileData() {
    try {
        // Check if we have profiles with user linkage
        const profiles = await pool.query(`
            SELECT 
                u.id as user_id,
                u.name,
                u.email,
                u.role,
                ap.first_name,
                ap.last_name,
                ap.graduation_year,
                ap.branch,
                ap.employment_status,
                ap.consent_for_accreditation
            FROM users u
            LEFT JOIN alumni_profiles ap ON ap.user_id = u.id
            WHERE u.role = 'alumni'
            ORDER BY u.created_at DESC
            LIMIT 5
        `);

        console.log('\n📊 Sample User-Profile Mappings:');
        console.log('═'.repeat(80));
        
        profiles.rows.forEach((row, i) => {
            console.log(`\n${i + 1}. User: ${row.name} (${row.email})`);
            console.log(`   User ID: ${row.user_id}`);
            if (row.first_name) {
                console.log(`   ✓ Profile exists: ${row.first_name} ${row.last_name}`);
                console.log(`   Branch: ${row.branch || 'Not set'}`);
                console.log(`   Year: ${row.graduation_year || 'Not set'}`);
                console.log(`   Employment: ${row.employment_status || 'Not set'}`);
                console.log(`   Consent: ${row.consent_for_accreditation ? 'Yes' : 'No'}`);
            } else {
                console.log(`   ✗ No profile found`);
            }
        });

        console.log('\n' + '═'.repeat(80));
        console.log(`Total alumni users: ${profiles.rows.length}`);
        console.log(`With profiles: ${profiles.rows.filter(r => r.first_name).length}`);
        console.log(`Without profiles: ${profiles.rows.filter(r => !r.first_name).length}`);

        await pool.end();
    } catch (err) {
        console.error('Error:', err.message);
        await pool.end();
        process.exit(1);
    }
}

testProfileData();
