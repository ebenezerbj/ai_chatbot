const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL not found!');
  process.exit(1);
}

async function testDirectConnection() {
  // Try multiple connection configurations
  const configs = [
    {
      name: 'With SSL (rejectUnauthorized: false)',
      config: {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 15000
      }
    },
    {
      name: 'With SSL (require mode)',
      config: {
        connectionString: process.env.DATABASE_URL + '?sslmode=require',
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 15000
      }
    }
  ];

  for (const { name, config } of configs) {
    const client = new Client(config);
    
    try {
      console.log(`\nTrying: ${name}...`);
      
      await client.connect();
      console.log('✅ Connected successfully!\n');
    
    // Test query 1: Database info
    console.log('Running test queries...\n');
    const dbInfo = await client.query('SELECT current_database() as db, current_user as user, version() as version');
    console.log('Database Info:');
    console.log(`  Database: ${dbInfo.rows[0].db}`);
    console.log(`  User: ${dbInfo.rows[0].user}`);
    console.log(`  Version: ${dbInfo.rows[0].version.substring(0, 50)}...\n`);
    
    // Test query 2: Count tables
    console.log('Table Counts:');
    
    const customers = await client.query('SELECT COUNT(*) as count FROM customers');
    console.log(`  customers: ${customers.rows[0].count}`);
    
    const balances = await client.query('SELECT COUNT(*) as count FROM account_balances');
    console.log(`  account_balances: ${balances.rows[0].count}`);
    
    const transactions = await client.query('SELECT COUNT(*) as count FROM transactions');
    console.log(`  transactions: ${transactions.rows[0].count}`);
    
    const loans = await client.query('SELECT COUNT(*) as count FROM loans');
    console.log(`  loans: ${loans.rows[0].count}\n`);
    
    // Test query 3: Check BAL-* transactions
    const balTransactions = await client.query(`
      SELECT COUNT(*) as count 
      FROM transactions 
      WHERE reference_number LIKE 'BAL-%'
    `);
    console.log(`Balance Upload Transactions: ${balTransactions.rows[0].count}\n`);
    
    // Test query 4: Check recent balance updates
    const recentUpdates = await client.query(`
      SELECT COUNT(*) as count 
      FROM account_balances 
      WHERE DATE(last_updated) = CURRENT_DATE
    `);
    console.log(`Accounts Updated Today: ${recentUpdates.rows[0].count}\n`);
    
    await client.end();
    console.log('✅ All queries completed successfully!');
    process.exit(0);
    
  } catch (err) {
    console.error(`❌ Failed with ${name}:`, err.message);
    try {
      await client.end();
    } catch (e) {
      // ignore
    }
  }
}

console.log('\n❌ All connection methods failed.');
process.exit(1);
}

testDirectConnection();
