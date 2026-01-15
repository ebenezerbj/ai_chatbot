const { executeQuery } = require('./dist/database');
require('dotenv').config();

async function checkBalanceUploadTransactions() {
  try {
    // Get count of balance upload transactions
    const countResult = await executeQuery(
      "SELECT COUNT(*) as count FROM transactions WHERE reference_number LIKE 'BAL-%'", 
      []
    );
    console.log('Balance Upload transactions:', countResult[0].count);
    
    // Get balance upload transactions
    const result = await executeQuery(`
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
        channel
      FROM transactions 
      WHERE reference_number LIKE 'BAL-%'
      ORDER BY transaction_date DESC 
      LIMIT 20
    `, []);
    
    if (result.length === 0) {
      console.log('\nNo balance upload transactions found.');
      console.log('These are transactions automatically created when uploading new balances.');
    } else {
      console.log('\nBalance Upload Transactions:');
      console.log('='.repeat(120));
      
      result.forEach(t => {
        const date = new Date(t.transaction_date).toLocaleString();
        console.log(`ID: ${t.id} | Account: ${t.account_number} | Date: ${date}`);
        console.log(`  Description: ${t.description}`);
        console.log(`  Debit: GHS ${parseFloat(t.debit_amount).toFixed(2)} | Credit: GHS ${parseFloat(t.credit_amount).toFixed(2)} | Balance: GHS ${parseFloat(t.balance_after).toFixed(2)}`);
        console.log(`  Type: ${t.transaction_type} | Channel: ${t.channel} | Ref: ${t.reference_number}`);
        console.log('-'.repeat(120));
      });
    }
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

checkBalanceUploadTransactions();
