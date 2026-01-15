const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function checkTransactions() {
  try {
    // Get count
    const countResult = await pool.query('SELECT COUNT(*) FROM transactions');
    console.log('Total transactions:', countResult.rows[0].count);
    
    // Get recent transactions
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
        channel
      FROM transactions 
      ORDER BY transaction_date DESC 
      LIMIT 20
    `);
    
    console.log('\nRecent transactions:');
    console.log('='.repeat(120));
    
    result.rows.forEach(t => {
      const date = new Date(t.transaction_date).toLocaleString();
      console.log(`ID: ${t.id} | Account: ${t.account_number} | Date: ${date}`);
      console.log(`  Description: ${t.description}`);
      console.log(`  Debit: GHS ${parseFloat(t.debit_amount).toFixed(2)} | Credit: GHS ${parseFloat(t.credit_amount).toFixed(2)} | Balance: GHS ${parseFloat(t.balance_after).toFixed(2)}`);
      console.log(`  Type: ${t.transaction_type} | Channel: ${t.channel} | Ref: ${t.reference_number}`);
      console.log('-'.repeat(120));
    });
    
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

checkTransactions();
