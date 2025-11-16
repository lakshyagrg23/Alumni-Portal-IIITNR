import 'dotenv/config';
import pool from './src/config/database.js';

async function createMissingProfiles() {
  const client = await pool.getClient();
  try {
    await client.query('BEGIN');

    const res = await client.query(`
      SELECT id, email
      FROM users u
      WHERE role = 'alumni' AND is_approved = true
        AND NOT EXISTS (SELECT 1 FROM alumni_profiles ap WHERE ap.user_id = u.id)
      FOR UPDATE SKIP LOCKED
    `);

    if (!res.rows.length) {
      console.log('No missing profiles found for approved users.');
      await client.query('COMMIT');
      await pool.end();
      return;
    }

    console.log('Creating', res.rows.length, 'missing profiles...');

    let inserted = 0;
    for (const u of res.rows) {
      const email = u.email || '';
      const local = email.split('@')[0] || 'alumni';
      const parts = local.split(/[^a-zA-Z0-9]+/).filter(Boolean);
      const first_name = parts[0] ? capitalize(parts[0]) : 'Alumni';
      const last_name = parts.length > 1 ? parts.slice(1).join(' ') : '';

      const insertQuery = `
        INSERT INTO alumni_profiles (user_id, first_name, last_name, created_at, updated_at)
        VALUES ($1, $2, $3, NOW(), NOW())
        RETURNING id
      `;

      const insertRes = await client.query(insertQuery, [u.id, first_name, last_name]);
      if (insertRes.rows && insertRes.rows[0]) inserted++;
    }

    await client.query('COMMIT');
    console.log(`Inserted ${inserted} profile(s) for approved users.`);
    await pool.end();
  } catch (err) {
    console.error('Error creating missing profiles:', err.message);
    try { await client.query('ROLLBACK'); } catch(e){}
    try { await pool.end(); } catch(e){}
    process.exit(1);
  }
}

function capitalize(s){
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

createMissingProfiles();
