const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Check if DATABASE_URL is loaded
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in environment variables!');
  console.error('Please check your .env file.');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  },
  connectionTimeoutMillis: 30000,
  query_timeout: 30000,
  max: 1,
  idleTimeoutMillis: 30000
});

async function testConnection() {
  try {
    console.log('Testing PostgreSQL connection to Render...\n');
    const maskedUrl = process.env.DATABASE_URL.replace(/:[^:@]+@/, ':****@');
    console.log('Database URL:', maskedUrl, '\n');
    
    // Test connection
    const client = await pool.connect();
    console.log('✅ Successfully connected to PostgreSQL!\n');
    
    // Get database info
    const dbInfo = await client.query(`
      SELECT 
        current_database() as database_name,
        current_user as user_name,
        version() as version
    `);
    
    console.log('Database Information:');
    console.log(`  Database: ${dbInfo.rows[0].database_name}`);
    console.log(`  User: ${dbInfo.rows[0].user_name}`);
    console.log(`  Version: ${dbInfo.rows[0].version.split(',')[0]}\n`);
    
    // Get table counts
    const tables = ['customers', 'account_balances', 'transactions', 'loans'];
    console.log('Table Record Counts:');
    
    for (const table of tables) {
      try {
        const result = await client.query(`SELECT COUNT(*) as count FROM ${table}`);
        console.log(`  ${table}: ${result.rows[0].count} records`);
      } catch (err) {
        console.log(`  ${table}: ❌ Error (${err.message})`);
      }
    }
    
    client.release();
    await pool.end();
    
    console.log('\n✅ Connection test completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Connection failed:', err.message);
    console.error('\nFull error:', err);
    await pool.end();
    process.exit(1);
  }
}

testConnection();
