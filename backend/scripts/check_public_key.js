require('dotenv').config();
const { query } = require('../src/config/database');

const id = process.argv[2];
if (!id) {
  console.error('Usage: node scripts/check_public_key.js <userId>');
  process.exit(1);
}

(async () => {
  try {
    const res = await query('SELECT user_id, public_key, created_at FROM public_keys WHERE user_id = $1', [id]);
    console.log(JSON.stringify(res.rows, null, 2));
    process.exit(0);
  } catch (err) {
    console.error('ERROR', err.message || err);
    process.exit(1);
  }
})();
