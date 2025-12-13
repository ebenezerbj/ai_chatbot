const { Pool } = require('pg');

async function checkRecords() {
  const databaseUrl = process.argv[2];
  
  if (!databaseUrl) {
    console.error('Usage: node check_postgres.js "postgres://user:pass@host/dbname"');
    console.error('\nUse your External Database URL from Render');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('Connecting to PostgreSQL...\n');
    
    // Check if tables exist
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log('Tables found:', tables.rows.length);
    if (tables.rows.length === 0) {
      console.log('❌ No tables found - database is empty');
      console.log('\nYou need to run the import script first.');
      await pool.end();
      return;
    }
    
    console.log('Table names:', tables.rows.map(r => r.table_name).join(', '));
    console.log('\n' + '='.repeat(50));
    
    // Check record counts
    try {
      const customers = await pool.query('SELECT COUNT(*) as count FROM customers');
      console.log('✓ Customers:', customers.rows[0].count);
    } catch (e) {
      console.log('❌ Customers table: not found or empty');
    }
    
    try {
      const balances = await pool.query('SELECT COUNT(*) as count FROM account_balances');
      console.log('✓ Account Balances:', balances.rows[0].count);
    } catch (e) {
      console.log('❌ Account Balances table: not found or empty');
    }
    
    try {
      const transactions = await pool.query('SELECT COUNT(*) as count FROM transactions');
      console.log('✓ Transactions:', transactions.rows[0].count);
    } catch (e) {
      console.log('❌ Transactions table: not found or empty');
    }
    
    console.log('='.repeat(50));
    
    // Sample data
    try {
      const sample = await pool.query('SELECT account_number, account_name, phone_number FROM customers LIMIT 3');
      if (sample.rows.length > 0) {
        console.log('\nSample customers:');
        sample.rows.forEach(r => {
          console.log(`  - ${r.account_number}: ${r.account_name} (${r.phone_number})`);
        });
      }
    } catch (e) {
      // Ignore if table doesn't exist
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkRecords();
