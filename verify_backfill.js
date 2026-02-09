const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

(async () => {
  try {
    console.log('=== POST-BACKFILL VERIFICATION ===\n');

    const customers = await pool.query('SELECT COUNT(*) as count FROM customers');
    console.log('Total customers:', customers.rows[0].count);

    const balances = await pool.query('SELECT COUNT(*) as count FROM account_balances');
    console.log('Total account_balances:', balances.rows[0].count);

    const transactions = await pool.query('SELECT COUNT(*) as count FROM transactions');
    console.log('Total transactions:', transactions.rows[0].count);

    // Accounts still needing backfill
    const needsBackfill = await pool.query(`
      SELECT COUNT(*) as count FROM account_balances ab
      WHERE ab.ledger_balance <> 0
        AND NOT EXISTS (
          SELECT 1 FROM transactions t WHERE t.account_number = ab.account_number
        )
    `);
    console.log('\nAccounts still needing backfill:', needsBackfill.rows[0].count);

    // Customers without balance records (account matching gap)
    const noBalance = await pool.query(`
      SELECT COUNT(*) as count FROM customers c
      WHERE NOT EXISTS (
        SELECT 1 FROM account_balances ab WHERE ab.account_number = c.account_number
      )
    `);
    console.log('Customers without balance records:', noBalance.rows[0].count);

    // Customers with balances but NOT in customers table
    const orphanBalances = await pool.query(`
      SELECT COUNT(*) as count FROM account_balances ab
      WHERE NOT EXISTS (
        SELECT 1 FROM customers c WHERE c.account_number = ab.account_number
      )
    `);
    console.log('Balance records without matching customer:', orphanBalances.rows[0].count);

    // Show some unmatched examples
    if (parseInt(noBalance.rows[0].count) > 0) {
      const unmatched = await pool.query(`
        SELECT c.account_number, c.account_name, c.account_type, c.created_at
        FROM customers c
        WHERE NOT EXISTS (
          SELECT 1 FROM account_balances ab WHERE ab.account_number = c.account_number
        )
        ORDER BY c.created_at DESC
        LIMIT 10
      `);
      console.log('\nSample customers without balances:');
      unmatched.rows.forEach(r => {
        console.log('  ' + r.account_number + ' - ' + (r.account_name || 'N/A') + ' (' + r.account_type + ') - ' + r.created_at);
      });
    }

    // Summary of today's opening balance transactions
    const todayOB = await pool.query(`
      SELECT COUNT(*) as count FROM transactions
      WHERE transaction_type = 'Opening Balance'
        AND transaction_date >= CURRENT_DATE
    `);
    console.log('\nOpening Balance transactions created today:', todayOB.rows[0].count);

    console.log('\n=== ACCOUNT MATCHING SUMMARY ===');
    const totalCust = parseInt(customers.rows[0].count);
    const totalBal = parseInt(balances.rows[0].count);
    const matched = totalCust - parseInt(noBalance.rows[0].count);
    const matchRate = ((matched / totalCust) * 100).toFixed(1);
    console.log(`Customers matched to balances: ${matched}/${totalCust} (${matchRate}%)`);
    console.log(`Unmatched customers: ${noBalance.rows[0].count}`);
    console.log(`Orphan balance records: ${orphanBalances.rows[0].count}`);

    await pool.end();
  } catch(e) {
    console.error('Error:', e.message);
    await pool.end();
  }
})();
