const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes('render.com') ? { rejectUnauthorized: false } : false
});

async function checkBalanceUploadTransactions() {
  try {
    console.log('Connecting to PostgreSQL database...\n');
    
    // Get total count
    const totalResult = await pool.query('SELECT COUNT(*) as count FROM transactions');
    console.log('Total transactions:', totalResult.rows[0].count);
    
    // Get count of balance upload transactions
    const countResult = await pool.query(
      "SELECT COUNT(*) as count FROM transactions WHERE reference_number LIKE 'BAL-%'"
    );
    console.log('Balance Upload transactions:', countResult.rows[0].count);
    
    // Get balance upload transactions
    const result = await pool.query(`
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
      WHERE reference_number LIKE 'BAL-%'
      ORDER BY transaction_date DESC, created_at DESC
      LIMIT 50
    `);
    
    if (result.rows.length === 0) {
      console.log('\n❌ No balance upload transactions found.');
      console.log('The automatic transaction recording may not have been triggered during the upload.');
    } else {
      console.log(`\n✅ Found ${result.rows.length} Balance Upload Transactions:\n`);
      console.log('='.repeat(130));
      
      result.rows.forEach(t => {
        const transDate = new Date(t.transaction_date).toLocaleString();
        const createdDate = new Date(t.created_at).toLocaleString();
        console.log(`ID: ${t.id} | Account: ${t.account_number}`);
        console.log(`  Transaction Date: ${transDate}`);
        console.log(`  Created At: ${createdDate}`);
        console.log(`  Description: ${t.description}`);
        console.log(`  Debit: GHS ${parseFloat(t.debit_amount).toFixed(2)} | Credit: GHS ${parseFloat(t.credit_amount).toFixed(2)}`);
        console.log(`  Balance After: GHS ${parseFloat(t.balance_after).toFixed(2)}`);
        console.log(`  Type: ${t.transaction_type} | Channel: ${t.channel}`);
        console.log(`  Reference: ${t.reference_number}`);
        console.log('-'.repeat(130));
      });
    }
    
    // Check for any transactions created today
    const todayResult = await pool.query(`
      SELECT COUNT(*) as count 
      FROM transactions 
      WHERE DATE(created_at) = CURRENT_DATE
    `);
    console.log(`\n📊 Transactions created today: ${todayResult.rows[0].count}`);
    
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error(err.stack);
    await pool.end();
    process.exit(1);
  }
}

checkBalanceUploadTransactions();
