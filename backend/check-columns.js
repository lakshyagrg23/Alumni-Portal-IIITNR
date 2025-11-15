require('dotenv').config({ path: '.env' });
const pool = require('./src/config/database');

async function checkColumns() {
    try {
        // Check contributions columns
        const contrib = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'alumni_contributions' 
            ORDER BY ordinal_position
        `);
        
        console.log('Alumni Contributions Columns:');
        contrib.rows.forEach(c => console.log(`  ${c.column_name}: ${c.data_type}`));
        
        // Check achievements columns
        const achieve = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'alumni_achievements' 
            ORDER BY ordinal_position
        `);
        
        console.log('\nAlumni Achievements Columns:');
        achieve.rows.forEach(c => console.log(`  ${c.column_name}: ${c.data_type}`));
        
        // Count records
        const contribCount = await pool.query('SELECT COUNT(*) FROM alumni_contributions');
        const achieveCount = await pool.query('SELECT COUNT(*) FROM alumni_achievements');
        
        console.log('\nRecord Counts:');
        console.log(`  Contributions: ${contribCount.rows[0].count}`);
        console.log(`  Achievements: ${achieveCount.rows[0].count}`);
        
        await pool.end();
    } catch (err) {
        console.error('Error:', err.message);
        await pool.end();
        process.exit(1);
    }
}

checkColumns();
