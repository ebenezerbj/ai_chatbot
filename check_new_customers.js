const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

(async () => {
  try {
    const recent = await pool.query('SELECT COUNT(*) as total_customers FROM customers');
    console.log('Total customers:', recent.rows[0].total_customers);

    const noTx = await pool.query(`
      SELECT COUNT(*) as count FROM account_balances ab
      WHERE ab.ledger_balance <> 0
        AND NOT EXISTS (
          SELECT 1 FROM transactions t WHERE t.account_number = ab.account_number
        )
    `);
    console.log('Accounts needing opening balance backfill:', noTx.rows[0].count);

    const totalBal = await pool.query('SELECT COUNT(*) as count FROM account_balances');
    console.log('Total account_balances records:', totalBal.rows[0].count);

    const noBal = await pool.query(`
      SELECT COUNT(*) as count FROM customers c
      WHERE NOT EXISTS (
        SELECT 1 FROM account_balances ab WHERE ab.account_number = c.account_number
      )
    `);
    console.log('Customers without balance records:', noBal.rows[0].count);

    const cols = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name='customers' ORDER BY ordinal_position");
    console.log('\nCustomer columns:', cols.rows.map(r => r.column_name).join(', '));

    const last10 = await pool.query('SELECT * FROM customers ORDER BY created_at DESC LIMIT 10');
    console.log('\nLast 10 customers added:');
    last10.rows.forEach(r => {
      const name = r.full_name || r.customer_name || r.name || r.first_name || 'N/A';
      console.log('  ' + r.account_number + ' - ' + name + ' (' + r.created_at + ')');
    });

    await pool.end();
  } catch(e) { console.error(e.message); await pool.end(); }
})();
