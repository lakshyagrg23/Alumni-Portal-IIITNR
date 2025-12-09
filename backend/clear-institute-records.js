/**
 * Clear Institute Records Table
 * Deletes all existing data from institute_records table
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

async function clearTable() {
    try {
        // First, get current count
        const countResult = await pool.query('SELECT COUNT(*) FROM institute_records');
        const currentCount = parseInt(countResult.rows[0].count);

        console.log('\n⚠️  WARNING: This will delete all data from institute_records table');
        console.log(`📊 Current records: ${currentCount}\n`);

        if (currentCount === 0) {
            console.log('ℹ️  Table is already empty. Nothing to delete.\n');
            await pool.end();
            rl.close();
            process.exit(0);
            return;
        }

        rl.question('Are you sure you want to delete all records? (yes/no): ', async (answer) => {
            if (answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y') {
                console.log('\n🗑️  Deleting all records...');
                
                // First, check for foreign key references
                const refCount = await pool.query(
                    'SELECT COUNT(*) FROM users WHERE institute_record_id IS NOT NULL'
                );
                const referencedCount = parseInt(refCount.rows[0].count);
                
                if (referencedCount > 0) {
                    console.log(`⚠️  Found ${referencedCount} users linked to institute records`);
                    console.log('🔄 Unlinking users from institute records...');
                    await pool.query('UPDATE users SET institute_record_id = NULL WHERE institute_record_id IS NOT NULL');
                    console.log('✅ Users unlinked');
                }
                
                // Now delete the records
                await pool.query('DELETE FROM institute_records');
                
                const newCount = await pool.query('SELECT COUNT(*) FROM institute_records');
                console.log(`✅ Deleted ${currentCount} records`);
                console.log(`📊 Records remaining: ${newCount.rows[0].count}\n`);
                console.log('✅ Table cleared successfully!\n');
                console.log('💡 You can now import your actual data using:');
                console.log('   npm run records:import data/your-file.xlsx\n');
            } else {
                console.log('\n❌ Operation cancelled. No data was deleted.\n');
            }
            
            await pool.end();
            rl.close();
            process.exit(0);
        });

    } catch (error) {
        console.error('❌ Error clearing table:', error.message);
        await pool.end();
        rl.close();
        process.exit(1);
    }
}

clearTable();
