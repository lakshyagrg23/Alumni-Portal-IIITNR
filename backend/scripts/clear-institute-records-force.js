/**
 * Clear Institute Records Table (Force)
 * Deletes all existing data from institute_records table without confirmation
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

async function clearTable() {
    try {
        // Get current count
        const countResult = await pool.query('SELECT COUNT(*) FROM institute_records');
        const currentCount = parseInt(countResult.rows[0].count);

        console.log('\n⚠️  Clearing institute_records table...');
        console.log(`📊 Current records: ${currentCount}\n`);

        if (currentCount === 0) {
            console.log('ℹ️  Table is already empty. Nothing to delete.\n');
            await pool.end();
            process.exit(0);
            return;
        }

        console.log('🗑️  Deleting all records...');
        
        // Check for foreign key references
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
        
        // Delete all records
        await pool.query('DELETE FROM institute_records');
        
        const newCount = await pool.query('SELECT COUNT(*) FROM institute_records');
        console.log(`✅ Deleted ${currentCount} records`);
        console.log(`📊 Records remaining: ${newCount.rows[0].count}\n`);
        console.log('✅ Table cleared successfully!\n');
        console.log('💡 You can now import your actual data using:');
        console.log('   npm run records:import data/dataset.xlsx\n');

        await pool.end();
        process.exit(0);

    } catch (error) {
        console.error('❌ Error clearing table:', error.message);
        await pool.end();
        process.exit(1);
    }
}

clearTable();
