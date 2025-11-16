import 'dotenv/config';
import pool from './src/config/database.js';

async function checkSchema() {
    try {
        const users = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'users' 
            ORDER BY ordinal_position
        `);
        
        console.log('\n📋 Users table columns:');
        users.rows.forEach(c => console.log(`  - ${c.column_name}`));

        await pool.end();
    } catch (err) {
        console.error('Error:', err.message);
        await pool.end();
    }
}

checkSchema();
