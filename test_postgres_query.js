/**
 * Test PostgreSQL customer lookup directly
 */

const { Pool } = require('pg');
require('dotenv').config();

async function testQuery() {
  const DATABASE_URL = process.argv[2] || process.env.DATABASE_URL;
  
  if (!DATABASE_URL) {
    console.error('❌ No DATABASE_URL provided');
    console.log('Usage: node test_postgres_query.js "postgresql://user:pass@host/db"');
    return;
  }

  console.log('Testing PostgreSQL customer lookup...\n');

  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    // Test connection
    console.log('1. Testing connection...');
    const testResult = await pool.query('SELECT NOW()');
    console.log('✓ Connected to PostgreSQL');
    console.log('  Server time:', testResult.rows[0].now);
    console.log('');

    // Test customer lookup by phone (0501336873 -> 233501336873)
    console.log('2. Testing phone lookup (0501336873)...');
    const phone1 = '0501336873';
    const normalized1 = phone1.replace(/\D/g, '').replace(/^233/, '').replace(/^0/, '').slice(-9);
    
    const query1 = `
      SELECT account_number, account_name, phone_number, status
      FROM customers 
      WHERE phone_number = $1 
         OR RIGHT(phone_number, 9) = $2 
         OR RIGHT(REPLACE(phone_number, '233', ''), 9) = $3
      LIMIT 1`;
    
    console.log('  Query:', query1.replace(/\s+/g, ' ').trim());
    console.log('  Params:', [phone1, normalized1, normalized1]);
    
    const result1 = await pool.query(query1, [phone1, normalized1, normalized1]);
    
    if (result1.rows.length > 0) {
      console.log('✓ Customer found:');
      console.log('  Account:', result1.rows[0].account_number);
      console.log('  Name:', result1.rows[0].account_name);
      console.log('  Phone:', result1.rows[0].phone_number);
      console.log('  Status:', result1.rows[0].status);
    } else {
      console.log('❌ No customer found');
    }
    console.log('');

    // Test customer lookup by phone (233501336873)
    console.log('3. Testing phone lookup (233501336873)...');
    const phone2 = '233501336873';
    const normalized2 = phone2.replace(/\D/g, '').replace(/^233/, '').replace(/^0/, '').slice(-9);
    
    const result2 = await pool.query(query1, [phone2, normalized2, normalized2]);
    
    if (result2.rows.length > 0) {
      console.log('✓ Customer found:');
      console.log('  Account:', result2.rows[0].account_number);
      console.log('  Name:', result2.rows[0].account_name);
      console.log('  Phone:', result2.rows[0].phone_number);
      console.log('  Status:', result2.rows[0].status);
    } else {
      console.log('❌ No customer found');
    }
    console.log('');

    // Count total customers
    console.log('4. Counting total customers...');
    const countResult = await pool.query('SELECT COUNT(*) as count FROM customers');
    console.log('✓ Total customers:', countResult.rows[0].count);
    console.log('');

    // Sample a few customers
    console.log('5. Sample customers:');
    const sampleResult = await pool.query('SELECT account_number, account_name, phone_number FROM customers LIMIT 5');
    sampleResult.rows.forEach((row, i) => {
      console.log(`  ${i + 1}. ${row.account_number} - ${row.account_name} (${row.phone_number})`);
    });

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('Details:', error);
  } finally {
    await pool.end();
  }
}

testQuery();
