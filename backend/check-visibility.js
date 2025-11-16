import 'dotenv/config';
import pool from './src/config/database.js';

async function check() {
    try {
        const vis = await pool.query('SELECT visibility, is_verified, COUNT(*) FROM alumni_achievements GROUP BY visibility, is_verified');
        console.log('Achievement visibility/verification:');
        vis.rows.forEach(r => console.log(`  ${r.visibility} (verified: ${r.is_verified}): ${r.count}`));
        
        const contrib = await pool.query('SELECT contribution_type, is_verified, COUNT(*) FROM alumni_contributions GROUP BY contribution_type, is_verified');
        console.log('\nContribution types/verification:');
        contrib.rows.forEach(r => console.log(`  ${r.contribution_type} (verified: ${r.is_verified}): ${r.count}`));
        
        await pool.end();
    } catch (err) {
        console.error('Error:', err.message);
        await pool.end();
    }
}

check();
