const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

(async () => {
  try {
    const r = await pool.query(`
      SELECT c.account_number, c.account_name, c.account_type, c.branch_name, c.created_at
      FROM customers c
      WHERE NOT EXISTS (
        SELECT 1 FROM account_balances ab WHERE ab.account_number = c.account_number
      )
      ORDER BY c.created_at DESC
    `);

    console.log('Account Number      | Account Name                         | Type             | Branch              | Created');
    console.log('-'.repeat(130));
    r.rows.forEach(x => {
      const acct = (x.account_number || '').padEnd(19);
      const name = (x.account_name || 'N/A').substring(0, 36).padEnd(36);
      const type = (x.account_type || 'N/A').padEnd(16);
      const branch = (x.branch_name || 'N/A').substring(0, 20).padEnd(20);
      const date = x.created_at ? new Date(x.created_at).toISOString().slice(0, 10) : 'N/A';
      console.log(`${acct} | ${name} | ${type} | ${branch} | ${date}`);
    });
    console.log('\nTotal: ' + r.rows.length + ' unmatched customers');

    await pool.end();
  } catch(e) {
    console.error('Error:', e.message);
    await pool.end();
  }
})();
