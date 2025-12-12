const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function exportToPostgres() {
  // Connect to MySQL
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    database: 'akcb_bank',
    port: 3306
  });

  console.log('Connected to MySQL database');

  try {
    // Open output file
    const outputPath = path.join(__dirname, 'data', 'postgres_import.sql');
    const writeStream = fs.createWriteStream(outputPath);

    // Export customers
    console.log('Exporting customers...');
    const [customers] = await connection.query('SELECT * FROM customers');
    
    writeStream.write('-- Customers\n');
    for (const customer of customers) {
      const values = [
        customer.id,
        `'${customer.account_number}'`,
        `'${customer.account_name.replace(/'/g, "''")}'`,
        customer.phone_number ? `'${customer.phone_number}'` : 'NULL',
        customer.email ? `'${customer.email}'` : 'NULL',
        customer.date_of_birth ? `'${customer.date_of_birth.toISOString().split('T')[0]}'` : 'NULL',
        customer.account_type ? `'${customer.account_type.replace(/'/g, "''")}'` : 'NULL',
        customer.branch_code ? `'${customer.branch_code.replace(/'/g, "''")}'` : 'NULL',
        customer.status ? `'${customer.status}'` : "'Active'",
        customer.created_at ? `'${customer.created_at.toISOString()}'` : 'CURRENT_TIMESTAMP',
        customer.updated_at ? `'${customer.updated_at.toISOString()}'` : 'CURRENT_TIMESTAMP'
      ].join(', ');
      
      writeStream.write(`INSERT INTO customers (id, account_number, account_name, phone_number, email, date_of_birth, account_type, branch_code, status, created_at, updated_at) VALUES (${values}) ON CONFLICT (account_number) DO NOTHING;\n`);
    }

    // Export account_balances
    console.log('Exporting account balances...');
    const [balances] = await connection.query('SELECT * FROM account_balances');
    
    writeStream.write('\n-- Account Balances\n');
    for (const balance of balances) {
      const values = [
        `'${balance.account_number}'`,
        balance.ledger_balance,
        balance.available_balance,
        balance.currency ? `'${balance.currency}'` : "'GHS'",
        balance.last_updated ? `'${balance.last_updated.toISOString()}'` : 'CURRENT_TIMESTAMP'
      ].join(', ');
      
      writeStream.write(`INSERT INTO account_balances (account_number, ledger_balance, available_balance, currency, last_updated) VALUES (${values}) ON CONFLICT (account_number) DO NOTHING;\n`);
    }

    // Export transactions
    console.log('Exporting transactions...');
    const [transactions] = await connection.query('SELECT * FROM transactions');
    
    writeStream.write('\n-- Transactions\n');
    for (const txn of transactions) {
      const values = [
        txn.id,
        `'${txn.account_number}'`,
        `'${txn.transaction_date.toISOString()}'`,
        txn.description ? `'${txn.description.replace(/'/g, "''")}'` : 'NULL',
        txn.debit_amount || 0,
        txn.credit_amount || 0,
        txn.balance_after,
        txn.reference_number ? `'${txn.reference_number}'` : 'NULL',
        txn.transaction_type ? `'${txn.transaction_type}'` : "'Other'",
        txn.channel ? `'${txn.channel}'` : "'Internal'",
        txn.created_at ? `'${txn.created_at.toISOString()}'` : 'CURRENT_TIMESTAMP'
      ].join(', ');
      
      writeStream.write(`INSERT INTO transactions (id, account_number, transaction_date, description, debit_amount, credit_amount, balance_after, reference_number, transaction_type, channel, created_at) VALUES (${values}) ON CONFLICT (reference_number) DO NOTHING;\n`);
    }

    // Reset sequences
    writeStream.write('\n-- Reset sequences\n');
    writeStream.write(`SELECT setval('customers_id_seq', (SELECT MAX(id) FROM customers));\n`);
    writeStream.write(`SELECT setval('transactions_id_seq', (SELECT MAX(id) FROM transactions));\n`);

    writeStream.end();

    console.log(`\nExport completed!`);
    console.log(`Total customers: ${customers.length}`);
    console.log(`Total balances: ${balances.length}`);
    console.log(`Total transactions: ${transactions.length}`);
    console.log(`\nSQL file saved to: ${outputPath}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
  }
}

exportToPostgres();
