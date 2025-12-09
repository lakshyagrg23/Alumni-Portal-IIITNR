/**
 * Link an existing OAuth user to institute_records
 * This manually links a user account to their institute record for testing
 */

import dotenv from 'dotenv';
import pkg from 'pg';
import readline from 'readline';

const { Pool } = pkg;
dotenv.config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
});

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function linkUser() {
    try {
        console.log('\n🔗 Link User to Institute Record\n');

        // Show recent users
        const users = await pool.query(`
            SELECT id, email, provider, registration_path, institute_record_id
            FROM users
            WHERE institute_record_id IS NULL
            ORDER BY created_at DESC
            LIMIT 10
        `);

        console.log('Users without institute_record link:');
        users.rows.forEach((u, i) => {
            console.log(`${i + 1}. ${u.email} (${u.provider}, ${u.registration_path})`);
        });

        // Show institute records
        const records = await pool.query(`
            SELECT id, roll_number, full_name, branch, enrollment_year
            FROM institute_records
            ORDER BY enrollment_year DESC, roll_number
            LIMIT 20
        `);

        console.log('\n\nAvailable Institute Records:');
        records.rows.forEach((r, i) => {
            console.log(`${i + 1}. ${r.roll_number} - ${r.full_name} (${r.branch}, ${r.enrollment_year})`);
        });

        rl.question('\n\nEnter user email to link: ', async (userEmail) => {
            rl.question('Enter roll number to link to: ', async (rollNumber) => {
                
                // Find user
                const userResult = await pool.query(
                    'SELECT * FROM users WHERE LOWER(email) = LOWER($1)',
                    [userEmail.trim()]
                );

                if (userResult.rows.length === 0) {
                    console.log('❌ User not found');
                    await pool.end();
                    rl.close();
                    return;
                }

                // Find institute record
                const recordResult = await pool.query(
                    'SELECT * FROM institute_records WHERE roll_number = $1',
                    [rollNumber.trim()]
                );

                if (recordResult.rows.length === 0) {
                    console.log('❌ Institute record not found');
                    await pool.end();
                    rl.close();
                    return;
                }

                const user = userResult.rows[0];
                const record = recordResult.rows[0];

                console.log(`\n\nWill link:`);
                console.log(`  User: ${user.email} (ID: ${user.id})`);
                console.log(`  To: ${record.full_name} (${record.roll_number})\n`);

                rl.question('Confirm? (yes/no): ', async (confirm) => {
                    if (confirm.toLowerCase() === 'yes' || confirm.toLowerCase() === 'y') {
                        await pool.query(
                            'UPDATE users SET institute_record_id = $1, registration_path = $2 WHERE id = $3',
                            [record.id, 'personal_email', user.id]
                        );

                        console.log('\n✅ User linked successfully!');
                        console.log('🔄 Now refresh your /complete-profile page to see auto-filled data\n');
                    } else {
                        console.log('\n❌ Cancelled');
                    }

                    await pool.end();
                    rl.close();
                });
            });
        });

    } catch (error) {
        console.error('❌ Error:', error.message);
        await pool.end();
        rl.close();
    }
}

linkUser();
