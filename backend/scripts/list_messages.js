import { query, closePool } from '../src/config/database.js';

async function listRecent(limit = 20) {
  try {
    const res = await query('SELECT id, sender_id, receiver_id, content, sent_at FROM messages ORDER BY sent_at DESC LIMIT $1', [limit]);
    console.log(`Found ${res.rowCount} messages:`);
    res.rows.forEach((r) => {
      console.log(`${r.sent_at.toISOString()} | ${r.id} | from=${r.sender_id} to=${r.receiver_id}`);
      console.log(`  content: ${r.content.slice(0, 200)}${r.content.length > 200 ? '...' : ''}`);
    });
  } catch (err) {
    console.error('Error querying messages table:', err.message || err);
    process.exitCode = 1;
  } finally {
    await closePool();
  }
}

const lim = parseInt(process.argv[2], 10) || 20;
listRecent(lim);
