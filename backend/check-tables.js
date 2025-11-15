require('dotenv').config();
const pool = require('./src/config/database');

async function checkTables() {
  try {
    // Check alumni_contributions
    const contrib = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'alumni_contributions' 
      ORDER BY ordinal_position
    `);
    console.log('\nalumni_contributions columns:', contrib.rows.map(r => r.column_name).join(', '));
    
    // Check alumni_achievements
    const achiev = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'alumni_achievements' 
      ORDER BY ordinal_position
    `);
    console.log('\nalumni_achievements columns:', achiev.rows.map(r => r.column_name).join(', '));
    
    // Check placement_data
    const placement = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'placement_data' 
      ORDER BY ordinal_position
    `);
    console.log('\nplacement_data columns:', placement.rows.map(r => r.column_name).join(', '));
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkTables();
