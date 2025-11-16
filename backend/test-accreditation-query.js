import 'dotenv/config';
import pool from './src/config/database.js';
import { getOverviewKPIs } from './src/utils/reportQueries.js';

async function testQuery() {
  try {
    console.log('Testing getOverviewKPIs query...\n');
    const result = await getOverviewKPIs({});
    console.log('✅ Query executed successfully!');
    console.log('\nResult:', JSON.stringify(result, null, 2));
    process.exit(0);
  } catch (error) {
    console.error('❌ Query failed:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  }
}

testQuery();
