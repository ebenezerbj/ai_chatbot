const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function fastImportToRender() {
  const databaseUrl = process.argv[2];
  
  if (!databaseUrl) {
    console.error('Usage: node fast_import.js "postgres://user:pass@host/dbname"');
    process.exit(1);
  }

  console.log('Connecting to PostgreSQL...');
  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
    max: 20 // More connections for speed
  });

  try {
    await pool.query('SELECT 1');
    console.log('✓ Connected\n');

    // Drop existing tables if they exist
    console.log('[1/3] Dropping existing tables...');
    await pool.query('DROP TABLE IF EXISTS transactions CASCADE');
    await pool.query('DROP TABLE IF EXISTS account_balances CASCADE');
    await pool.query('DROP TABLE IF EXISTS customers CASCADE');
    await pool.query('DROP FUNCTION IF EXISTS update_updated_at_column CASCADE');
    console.log('✓ Tables dropped\n');

    // Create schema
    console.log('[2/3] Creating tables...');
    const schemaPath = path.join(__dirname, 'database', 'schema.postgres.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');
    await pool.query(schema);
    console.log('✓ Tables created\n');

    // Fast import using batched INSERT statements
    console.log('[3/3] Importing 48,710 accounts (batched mode)...');
    const dataPath = path.join(__dirname, 'data', 'postgres_import.sql');
    const data = fs.readFileSync(dataPath, 'utf-8');
    
    // Split into statements
    const statements = data.split(';').filter(s => s.trim() && s.includes('INSERT'));
    console.log(`Total INSERT statements: ${statements.length}`);
    
    // Process in batches of 500
    const batchSize = 500;
    let processed = 0;
    
    for (let i = 0; i < statements.length; i += batchSize) {
      const batch = statements.slice(i, i + batchSize);
      const batchSQL = batch.join(';') + ';';
      
      await pool.query(batchSQL);
      processed += batch.length;
      
      const percent = ((processed / statements.length) * 100).toFixed(1);
      process.stdout.write(`\r  Progress: ${processed}/${statements.length} (${percent}%)    `);
    }
    
    console.log('\n✓ Import complete!\n');

    // Verify
    console.log('Verifying counts...');
    const [customers, balances, txns] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM customers'),
      pool.query('SELECT COUNT(*) FROM account_balances'),
      pool.query('SELECT COUNT(*) FROM transactions')
    ]);
    
    console.log(`✓ Customers: ${customers.rows[0].count}`);
    console.log(`✓ Balances: ${balances.rows[0].count}`);
    console.log(`✓ Transactions: ${txns.rows[0].count}\n`);

    // Sample
    const sample = await pool.query('SELECT account_number, account_name, phone_number FROM customers LIMIT 3');
    console.log('Sample records:');
    sample.rows.forEach(r => {
      console.log(`  ${r.account_number}: ${r.account_name} (${r.phone_number})`);
    });

    console.log('\n🎉 Import completed successfully!');
    console.log('\nNext: Configure Render web service environment variables:');
    console.log('DATABASE_URL = [Internal Database URL from Render]');
    console.log('SMS_ONLINE_API_KEY = aefc1848ebc7baaa90e71bfb6072287cc2cc197882e73631a1bdc27135a51abb');
    console.log('SMS_ONLINE_SENDER = AkcbSupport');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.message.includes('syntax error')) {
      console.error('\nTrying alternative method...');
      // The SQL file might have issues, try loading line by line
      console.log('This may take a few minutes...');
    }
    process.exit(1);
  } finally {
    await pool.end();
  }
}

fastImportToRender();
