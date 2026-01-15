/**
 * One-time script to create Opening Balance transactions for accounts
 * that have balances but no transaction history
 */
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes('render.com') ? { rejectUnauthorized: false } : false
});

async function backfillOpeningBalances() {
  const client = await pool.connect();
  
  try {
    console.log('Starting Opening Balance backfill...\n');
    
    // Get accounts with balances but no transactions
    console.log('Finding accounts with balances but no transactions...');
    const accountsResult = await client.query(`
      SELECT ab.account_number, ab.ledger_balance
      FROM account_balances ab
      WHERE ab.ledger_balance <> 0
        AND NOT EXISTS (
          SELECT 1 FROM transactions t 
          WHERE t.account_number = ab.account_number
        )
      ORDER BY ab.account_number
    `);
    
    const accountsToProcess = accountsResult.rows;
    console.log(`Found ${accountsToProcess.length} accounts needing Opening Balance transactions\n`);
    
    if (accountsToProcess.length === 0) {
      console.log('No accounts need backfilling. Exiting.');
      return;
    }
    
    // Confirm before proceeding
    console.log('This will create Opening Balance transactions for these accounts.');
    console.log('Press Ctrl+C to cancel, or wait 5 seconds to proceed...\n');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log('Starting transaction creation...\n');
    
    let successCount = 0;
    let errorCount = 0;
    const batchSize = 100;
    
    for (let i = 0; i < accountsToProcess.length; i++) {
      const account = accountsToProcess[i];
      
      try {
        const timestamp = Date.now() + i; // Ensure unique reference numbers
        const referenceNumber = `OB-${account.account_number}-${timestamp}`;
        const balance = parseFloat(account.ledger_balance);
        
        await client.query(`
          INSERT INTO transactions (
            account_number, transaction_date, description,
            debit_amount, credit_amount, balance_after,
            reference_number, transaction_type, channel
          ) VALUES ($1, CURRENT_TIMESTAMP, $2, $3, $4, $5, $6, $7, $8)
        `, [
          account.account_number,
          `Opening Balance - GHS ${balance.toFixed(2)}`,
          0,
          balance,
          balance,
          referenceNumber,
          'Opening Balance',
          'Internal'
        ]);
        
        successCount++;
        
        // Progress update every 100 accounts
        if ((i + 1) % batchSize === 0) {
          console.log(`Progress: ${i + 1}/${accountsToProcess.length} accounts processed`);
        }
        
      } catch (error) {
        errorCount++;
        console.error(`Error processing account ${account.account_number}:`, error.message);
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('Backfill Complete!');
    console.log('='.repeat(60));
    console.log(`✅ Successfully created: ${successCount} transactions`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`📊 Total processed: ${accountsToProcess.length} accounts\n`);
    
  } catch (error) {
    console.error('Fatal error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the backfill
backfillOpeningBalances()
  .then(() => {
    console.log('Script completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('Script failed:', error);
    process.exit(1);
  });
