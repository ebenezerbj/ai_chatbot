const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

(async () => {
  try {
    // Get account_balances columns
    const cols = await pool.query("SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name='account_balances' ORDER BY ordinal_position");
    console.log('account_balances columns:');
    cols.rows.forEach(r => console.log('  ' + r.column_name + ' (' + r.data_type + ', nullable: ' + r.is_nullable + ')'));

    // Get a sample row
    const sample = await pool.query('SELECT * FROM account_balances LIMIT 1');
    console.log('\nSample row:', JSON.stringify(sample.rows[0], null, 2));

    // Insert zero-balance records for all 975 unmatched customers
    console.log('\nCreating zero-balance records for unmatched customers...');
    const result = await pool.query(`
      INSERT INTO account_balances (account_number, ledger_balance, available_balance, last_updated)
      SELECT c.account_number, 0, 0, NOW()
      FROM customers c
      WHERE NOT EXISTS (
        SELECT 1 FROM account_balances ab WHERE ab.account_number = c.account_number
      )
    `);
    console.log('Inserted ' + result.rowCount + ' zero-balance records');

    // Verify
    const check = await pool.query(`
      SELECT COUNT(*) as count FROM customers c
      WHERE NOT EXISTS (
        SELECT 1 FROM account_balances ab WHERE ab.account_number = c.account_number
      )
    `);
    console.log('Remaining unmatched customers: ' + check.rows[0].count);

    const total = await pool.query('SELECT COUNT(*) as count FROM account_balances');
    console.log('Total account_balances records now: ' + total.rows[0].count);

    await pool.end();
  } catch(e) {
    console.error('Error:', e.message);
    await pool.end();
  }
})();
