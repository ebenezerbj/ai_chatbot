const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function importToRenderPostgres() {
  // Get DATABASE_URL from command line argument
  const databaseUrl = process.argv[2];
  
  if (!databaseUrl) {
    console.error('Usage: node import_to_render.js "postgres://user:pass@host/dbname"');
    console.error('\nGet your External Database URL from Render PostgreSQL dashboard');
    process.exit(1);
  }

  console.log('Connecting to PostgreSQL...');
  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    // Test connection
    await pool.query('SELECT 1');
    console.log('✓ Connected successfully\n');

    // Drop and recreate tables
    console.log('[1/3] Dropping existing tables...');
    await pool.query('DROP TABLE IF EXISTS transactions CASCADE');
    await pool.query('DROP TABLE IF EXISTS account_balances CASCADE');
    await pool.query('DROP TABLE IF EXISTS customers CASCADE');
    await pool.query('DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE');
    console.log('✓ Tables dropped\n');

    // Import schema
    console.log('[2/3] Creating tables...');
    const schemaPath = path.join(__dirname, 'database', 'schema.postgres.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');
    
    // Execute entire schema at once (handles functions with $$ properly)
    await pool.query(schema);
    console.log('✓ Tables created\n');

    // Import data
    console.log('[3/3] Importing customer data (48,710 accounts)...');
    console.log('This may take 2-3 minutes...\n');
    
    const dataPath = path.join(__dirname, 'data', 'postgres_import.sql');
    const dataContent = fs.readFileSync(dataPath, 'utf-8');
    
    // Remove comments and split by newlines to process INSERT statements
    const lines = dataContent.split('\n');
    let currentStatement = '';
    let processed = 0;
    let totalInserts = 0;
    
    for (const line of lines) {
      // Skip comments and empty lines
      if (line.trim().startsWith('--') || line.trim() === '') {
        continue;
      }
      
      currentStatement += line + '\n';
      
      // Execute when we hit a semicolon (end of statement)
      if (line.trim().endsWith(';')) {
        if (currentStatement.trim()) {
          try {
            await pool.query(currentStatement);
            if (currentStatement.includes('INSERT')) {
              totalInserts++;
              processed++;
              if (processed % 500 === 0) {
                console.log(`  Processed ${processed} records...`);
              }
            }
          } catch (err) {
            // Skip duplicate key errors (ON CONFLICT clauses)
            if (!err.message.includes('duplicate key') && !err.message.includes('already exists')) {
              console.error('Error executing statement:', err.message);
            }
          }
        }
        currentStatement = '';
      }
    }
    
    console.log(`✓ Imported ${totalInserts} records\n`);

    // Verify counts
    console.log('Verifying import...');
    const customerCount = await pool.query('SELECT COUNT(*) as count FROM customers');
    const balanceCount = await pool.query('SELECT COUNT(*) as count FROM account_balances');
    const txnCount = await pool.query('SELECT COUNT(*) as count FROM transactions');
    
    console.log(`✓ Customers: ${customerCount.rows[0].count}`);
    console.log(`✓ Balances: ${balanceCount.rows[0].count}`);
    console.log(`✓ Transactions: ${txnCount.rows[0].count}`);
    
    console.log('\n🎉 Import completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Go to Render dashboard → your web service');
    console.log('2. Add environment variable: DATABASE_URL = [Internal Database URL]');
    console.log('3. Add: SMS_ONLINE_API_KEY and OPENAI_API_KEY');
    console.log('4. Render will auto-deploy with database connected');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('\nTroubleshooting:');
    console.error('- Make sure you copied the full External Database URL from Render');
    console.error('- Check that the database is created and running on Render');
    console.error('- Verify your IP is allowed (Render usually allows all IPs)');
    process.exit(1);
  } finally {
    await pool.end();
  }
}

importToRenderPostgres();
