/**
 * Check user accounts and institute_record linking
 */

import dotenv from 'dotenv';
import pkg from 'pg';

const { Pool } = pkg;
dotenv.config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
});

async function checkAccounts() {
    try {
        console.log('\n📊 Checking all user accounts...\n');
        
        const result = await pool.query(`
            SELECT 
                u.id,
                u.email,
                u.provider,
                u.registration_path,
                u.institute_record_id,
                u.is_approved,
                u.email_verified,
                ir.roll_number,
                ir.full_name,
                ir.branch
            FROM users u
            LEFT JOIN institute_records ir ON u.institute_record_id = ir.id
            ORDER BY u.created_at DESC
        `);

        console.log(`Found ${result.rows.length} users:\n`);
        console.log('='.repeat(100));
        
        result.rows.forEach((user, index) => {
            console.log(`\n${index + 1}. EMAIL: ${user.email}`);
            console.log(`   User ID: ${user.id}`);
            console.log(`   Provider: ${user.provider}`);
            console.log(`   Registration Path: ${user.registration_path}`);
            console.log(`   Institute Record ID: ${user.institute_record_id || '❌ NULL (NOT LINKED)'}`);
            console.log(`   Approved: ${user.is_approved}`);
            console.log(`   Email Verified: ${user.email_verified}`);
            
            if (user.institute_record_id) {
                console.log(`   ✅ LINKED TO: ${user.full_name} (${user.roll_number}) - ${user.branch}`);
            }
        });

        console.log('\n' + '='.repeat(100));

        // Check for duplicate emails
        const duplicateCheck = await pool.query(`
            SELECT email, COUNT(*) as count
            FROM users
            GROUP BY email
            HAVING COUNT(*) > 1
        `);

        if (duplicateCheck.rows.length > 0) {
            console.log('\n⚠️  DUPLICATE ACCOUNTS FOUND:');
            duplicateCheck.rows.forEach(dup => {
                console.log(`   - ${dup.email} (${dup.count} accounts)`);
            });
        } else {
            console.log('\n✅ No duplicate email accounts');
        }

        await pool.end();
    } catch (error) {
        console.error('❌ Error:', error.message);
        await pool.end();
    }
}

checkAccounts();
