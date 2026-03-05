/**
 * Verify Institute Records
 * 
 * This script queries the institute_records table to show statistics
 * and verify the imported data
 */

import dotenv from 'dotenv';
import pkg from 'pg';

const { Pool } = pkg;
dotenv.config();

// Database connection
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
});

async function verifyRecords() {
    try {
        console.log('\n' + '='.repeat(60));
        console.log('📊 INSTITUTE RECORDS VERIFICATION');
        console.log('='.repeat(60) + '\n');

        // Total count
        const totalResult = await pool.query('SELECT COUNT(*) FROM institute_records');
        const total = parseInt(totalResult.rows[0].count);
        console.log(`✅ Total records in database: ${total}\n`);

        if (total === 0) {
            console.log('⚠️  No records found in the database.');
            console.log('💡 Run the import script to add records.\n');
            return;
        }

        // Records by enrollment year
        console.log('📅 Records by Enrollment Year:');
        console.log('-'.repeat(40));
        const yearResult = await pool.query(`
            SELECT 
                enrollment_year,
                COUNT(*) as count,
                ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
            FROM institute_records
            WHERE enrollment_year IS NOT NULL
            GROUP BY enrollment_year
            ORDER BY enrollment_year DESC
        `);
        
        yearResult.rows.forEach(row => {
            console.log(`   ${row.enrollment_year}: ${row.count} records (${row.percentage}%)`);
        });

        // Records by branch
        console.log('\n🎓 Records by Branch:');
        console.log('-'.repeat(40));
        const branchResult = await pool.query(`
            SELECT 
                COALESCE(branch, 'Not Specified') as branch,
                COUNT(*) as count,
                ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
            FROM institute_records
            GROUP BY branch
            ORDER BY count DESC
        `);
        
        branchResult.rows.forEach(row => {
            const branchName = row.branch.length > 35 
                ? row.branch.substring(0, 32) + '...' 
                : row.branch;
            console.log(`   ${branchName.padEnd(37)}: ${row.count} (${row.percentage}%)`);
        });

        // Records by degree
        console.log('\n🎯 Records by Degree:');
        console.log('-'.repeat(40));
        const degreeResult = await pool.query(`
            SELECT 
                COALESCE(degree, 'Not Specified') as degree,
                COUNT(*) as count
            FROM institute_records
            GROUP BY degree
            ORDER BY count DESC
        `);
        
        degreeResult.rows.forEach(row => {
            console.log(`   ${row.degree.padEnd(15)}: ${row.count} records`);
        });

        // Active vs Inactive
        console.log('\n🔄 Status:');
        console.log('-'.repeat(40));
        const statusResult = await pool.query(`
            SELECT 
                is_active,
                COUNT(*) as count
            FROM institute_records
            GROUP BY is_active
            ORDER BY is_active DESC
        `);
        
        statusResult.rows.forEach(row => {
            const status = row.is_active ? 'Active' : 'Inactive';
            console.log(`   ${status.padEnd(10)}: ${row.count} records`);
        });

        // Data completeness
        console.log('\n📋 Data Completeness:');
        console.log('-'.repeat(40));
        const completenessResult = await pool.query(`
            SELECT 
                COUNT(*) FILTER (WHERE institute_email IS NOT NULL AND institute_email != '') as with_email,
                COUNT(*) FILTER (WHERE enrollment_year IS NOT NULL) as with_year,
                COUNT(*) FILTER (WHERE branch IS NOT NULL AND branch != '') as with_branch,
                COUNT(*) FILTER (WHERE degree IS NOT NULL AND degree != '') as with_degree,
                COUNT(*) FILTER (WHERE contact_number IS NOT NULL AND contact_number != '') as with_contact,
                COUNT(*) as total
            FROM institute_records
        `);
        
        const comp = completenessResult.rows[0];
        console.log(`   Email provided    : ${comp.with_email}/${comp.total} (${((comp.with_email/comp.total)*100).toFixed(1)}%)`);
        console.log(`   Enrollment year   : ${comp.with_year}/${comp.total} (${((comp.with_year/comp.total)*100).toFixed(1)}%)`);
        console.log(`   Branch specified  : ${comp.with_branch}/${comp.total} (${((comp.with_branch/comp.total)*100).toFixed(1)}%)`);
        console.log(`   Degree specified  : ${comp.with_degree}/${comp.total} (${((comp.with_degree/comp.total)*100).toFixed(1)}%)`);
        console.log(`   Contact number    : ${comp.with_contact}/${comp.total} (${((comp.with_contact/comp.total)*100).toFixed(1)}%)`);

        // Sample records
        console.log('\n📝 Sample Records (Latest 5):');
        console.log('-'.repeat(60));
        const sampleResult = await pool.query(`
            SELECT 
                roll_number,
                full_name,
                TO_CHAR(date_of_birth, 'DD/MM/YYYY') as dob,
                enrollment_year,
                branch,
                contact_number
            FROM institute_records
            ORDER BY created_at DESC
            LIMIT 5
        `);
        
        sampleResult.rows.forEach((row, index) => {
            console.log(`\n${index + 1}. ${row.full_name}`);
            console.log(`   Roll No: ${row.roll_number}`);
            console.log(`   DOB: ${row.dob}`);
            console.log(`   Enrollment Year: ${row.enrollment_year || 'N/A'}`);
            console.log(`   Branch: ${row.branch || 'N/A'}`);
            console.log(`   Contact: ${row.contact_number || 'N/A'}`);
        });

        // Recent updates
        console.log('\n\n🕐 Recently Updated:');
        console.log('-'.repeat(40));
        const recentResult = await pool.query(`
            SELECT 
                COUNT(*) FILTER (WHERE updated_at > NOW() - INTERVAL '1 hour') as last_hour,
                COUNT(*) FILTER (WHERE updated_at > NOW() - INTERVAL '1 day') as last_day,
                COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '1 day') as created_today
            FROM institute_records
        `);
        
        const recent = recentResult.rows[0];
        console.log(`   Updated in last hour : ${recent.last_hour}`);
        console.log(`   Updated in last day  : ${recent.last_day}`);
        console.log(`   Created today        : ${recent.created_today}`);

        console.log('\n' + '='.repeat(60) + '\n');

    } catch (error) {
        console.error('❌ Error verifying records:', error.message);
        throw error;
    } finally {
        await pool.end();
    }
}

// Run verification
verifyRecords()
    .then(() => {
        console.log('✅ Verification completed!\n');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Verification failed:', error);
        process.exit(1);
    });
