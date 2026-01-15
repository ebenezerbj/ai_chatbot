const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes('render.com') ? { rejectUnauthorized: false } : false
});

async function checkUserTransactions() {
  try {
    console.log('Connecting to PostgreSQL database...\n');
    
    // First, find Ebenezer's account number
    const customerResult = await pool.query(
      `SELECT account_number, account_name, phone_number 
       FROM customers 
       WHERE account_name ILIKE '%EBENEZER%' OR account_name ILIKE '%BLANKSON%'
       LIMIT 5`
    );
    
    if (customerResult.rows.length === 0) {
      console.log('❌ No customer found with name containing EBENEZER or BLANKSON');
      await pool.end();
      return;
    }
    
    console.log(`Found ${customerResult.rows.length} matching customer(s):\n`);
    customerResult.rows.forEach(c => {
      console.log(`  Account: ${c.account_number} | Name: ${c.account_name} | Phone: ${c.phone_number}`);
    });
    
    // Check transactions for the first matched account
    const accountNumber = customerResult.rows[0].account_number;
    console.log(`\n\nChecking transactions for account: ${accountNumber}\n`);
    
    // Get transaction count
    const countResult = await pool.query(
      'SELECT COUNT(*) as count FROM transactions WHERE account_number = $1',
      [accountNumber]
    );
    console.log(`Total transactions: ${countResult.rows[0].count}\n`);
    
    // Get recent transactions (last 10)
    const transactionsResult = await pool.query(
      `SELECT 
        TO_CHAR(transaction_date, 'YYYY-MM-DD') as date,
        description,
        CASE 
          WHEN debit_amount > 0 THEN -debit_amount
          ELSE credit_amount
        END as amount,
        balance_after as balance,
        reference_number,
        transaction_type,
        channel,
        created_at
      FROM transactions 
      WHERE account_number = $1
      ORDER BY transaction_date DESC, id DESC
      LIMIT 10`,
      [accountNumber]
    );
    
    if (transactionsResult.rows.length === 0) {
      console.log('❌ No transactions found for this account');
    } else {
      console.log(`✅ Recent Transactions (Last ${transactionsResult.rows.length}):\n`);
      console.log('='.repeat(120));
      
      transactionsResult.rows.forEach(txn => {
        const sign = txn.amount >= 0 ? '+' : '';
        console.log(`Date: ${txn.date} | ${txn.description}`);
        console.log(`  Amount: ${sign}GHS ${parseFloat(txn.amount).toFixed(2)} | Balance: GHS ${parseFloat(txn.balance).toFixed(2)}`);
        console.log(`  Type: ${txn.transaction_type} | Channel: ${txn.channel}`);
        console.log(`  Reference: ${txn.reference_number}`);
        console.log(`  Created: ${new Date(txn.created_at).toLocaleString()}`);
        console.log('-'.repeat(120));
      });
    }
    
    // Check account balance
    const balanceResult = await pool.query(
      'SELECT ledger_balance, available_balance, last_updated FROM account_balances WHERE account_number = $1',
      [accountNumber]
    );
    
    if (balanceResult.rows.length > 0) {
      const bal = balanceResult.rows[0];
      console.log(`\nCurrent Balance:`);
      console.log(`  Ledger: GHS ${parseFloat(bal.ledger_balance).toFixed(2)}`);
      console.log(`  Available: GHS ${parseFloat(bal.available_balance).toFixed(2)}`);
      console.log(`  Last Updated: ${new Date(bal.last_updated).toLocaleString()}`);
    }
    
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error(err.stack);
    await pool.end();
    process.exit(1);
  }
}

checkUserTransactions();
