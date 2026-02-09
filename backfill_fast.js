/**
 * Fast batch backfill opening balances using bulk INSERT
 */
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  statement_timeout: 300000,
  idle_in_transaction_session_timeout: 300000
});

async function backfillFast() {
  const client = await pool.connect();
  try {
    console.log('Starting FAST Opening Balance backfill...\n');

    const result = await client.query(`
      SELECT ab.account_number, ab.ledger_balance
      FROM account_balances ab
      WHERE ab.ledger_balance <> 0
        AND NOT EXISTS (
          SELECT 1 FROM transactions t WHERE t.account_number = ab.account_number
        )
      ORDER BY ab.account_number
    `);

    console.log(`Found ${result.rows.length} accounts needing backfill\n`);
    if (result.rows.length === 0) {
      console.log('All accounts are up to date!');
      return;
    }

    // Process in batches of 500 using multi-row INSERT
    const batchSize = 500;
    let totalProcessed = 0;

    for (let i = 0; i < result.rows.length; i += batchSize) {
      const batch = result.rows.slice(i, i + batchSize);
      const values = [];
      const placeholders = [];

      batch.forEach((account, idx) => {
        const offset = idx * 8;
        const balance = parseFloat(account.ledger_balance);
        const refNum = `OB-${account.account_number}-${Date.now() + idx}`;
        placeholders.push(`($${offset+1}, CURRENT_TIMESTAMP, $${offset+2}, $${offset+3}, $${offset+4}, $${offset+5}, $${offset+6}, $${offset+7}, $${offset+8})`);
        values.push(
          account.account_number,
          `Opening Balance - GHS ${balance.toFixed(2)}`,
          0,
          balance,
          balance,
          refNum,
          'Opening Balance',
          'Internal'
        );
      });

      await client.query(`
        INSERT INTO transactions (
          account_number, transaction_date, description,
          debit_amount, credit_amount, balance_after,
          reference_number, transaction_type, channel
        ) VALUES ${placeholders.join(', ')}
      `, values);

      totalProcessed += batch.length;
      console.log(`Progress: ${totalProcessed}/${result.rows.length} accounts processed`);
    }

    console.log(`\n============================================================`);
    console.log(`Backfill Complete!`);
    console.log(`============================================================`);
    console.log(`Successfully created: ${totalProcessed} opening balance transactions`);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

backfillFast();
