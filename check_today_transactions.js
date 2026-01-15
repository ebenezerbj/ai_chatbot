const { executeQuery } = require('./dist/database');
require('dotenv').config();

async function checkTodayTransactions() {
  try {
    // Check transactions from today
    const todayResult = await executeQuery(`
      SELECT 
        id, 
        account_number, 
        transaction_date, 
        description, 
        debit_amount, 
        credit_amount, 
        balance_after, 
        reference_number,
        transaction_type,
        channel,
        created_at
      FROM transactions 
      WHERE DATE(created_at) = CURDATE()
      ORDER BY created_at DESC 
      LIMIT 50
    `, []);
    
    console.log('Transactions created today (Jan 15, 2026):', todayResult.length);
    
    if (todayResult.length === 0) {
      console.log('\nNo transactions were created today.');
      console.log('\nThis suggests the balance upload did not trigger transaction recording.');
      console.log('Possible reasons:');
      console.log('1. The balances uploaded were the same as existing balances (no change detected)');
      console.log('2. The accounts in the CSV do not exist in account_balances table yet');
      console.log('3. The feature code is not deployed/running on the server');
    } else {
      console.log('\nTransactions from today:');
      console.log('='.repeat(120));
      
      todayResult.forEach(t => {
        const date = new Date(t.transaction_date).toLocaleString();
        const created = new Date(t.created_at).toLocaleString();
        console.log(`ID: ${t.id} | Account: ${t.account_number}`);
        console.log(`  Transaction Date: ${date} | Created: ${created}`);
        console.log(`  Description: ${t.description}`);
        console.log(`  Debit: GHS ${parseFloat(t.debit_amount).toFixed(2)} | Credit: GHS ${parseFloat(t.credit_amount).toFixed(2)} | Balance: GHS ${parseFloat(t.balance_after).toFixed(2)}`);
        console.log(`  Type: ${t.transaction_type} | Channel: ${t.channel} | Ref: ${t.reference_number}`);
        console.log('-'.repeat(120));
      });
    }
    
    // Also check recent balance updates
    console.log('\n\nChecking recent balance updates...');
    const balanceUpdates = await executeQuery(`
      SELECT account_number, ledger_balance, last_updated
      FROM account_balances 
      ORDER BY last_updated DESC 
      LIMIT 10
    `, []);
    
    console.log('\nRecent balance updates:');
    balanceUpdates.forEach(b => {
      const updated = new Date(b.last_updated).toLocaleString();
      console.log(`Account: ${b.account_number} | Balance: GHS ${parseFloat(b.ledger_balance).toFixed(2)} | Updated: ${updated}`);
    });
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

checkTodayTransactions();
