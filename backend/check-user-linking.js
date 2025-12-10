/**
 * Check if current OAuth user has institute_record_id
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

async function checkUser() {
    try {
        // Get all users with their institute_record_id
        const result = await pool.query(`
            SELECT 
                id,
                email,
                provider,
                registration_path,
                institute_record_id,
                created_at
            FROM users
            ORDER BY created_at DESC
            LIMIT 10
        `);

        console.log('\n📊 Recent Users:');
        console.log('='.repeat(80));
        
        result.rows.forEach((user, index) => {
            console.log(`\n${index + 1}. ${user.email}`);
            console.log(`   Provider: ${user.provider}`);
            console.log(`   Registration Path: ${user.registration_path}`);
            console.log(`   Institute Record ID: ${user.institute_record_id || 'NULL (not linked)'}`);
            console.log(`   Created: ${user.created_at}`);
        });

        console.log('\n' + '='.repeat(80));

        // Check institute_records table
        const recordsResult = await pool.query(`
            SELECT COUNT(*) FROM institute_records
        `);
        
        console.log(`\n📋 Total institute_records in database: ${recordsResult.rows[0].count}`);

        // Check how many users are linked
        const linkedResult = await pool.query(`
            SELECT COUNT(*) FROM users WHERE institute_record_id IS NOT NULL
        `);
        
        console.log(`🔗 Users linked to institute_records: ${linkedResult.rows[0].count}`);
        console.log(`👤 Users NOT linked: ${result.rows.length - linkedResult.rows[0].count} (out of ${result.rows.length} recent users)\n`);

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await pool.end();
    }
}

checkUser();
