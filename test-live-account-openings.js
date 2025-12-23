const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://akcb_bank_user:IlcndVR943byznoByTRzN1zBQS3gB9lI@dpg-d4u410ali9vc73am148g-a.oregon-postgres.render.com/akcb_bank',
  ssl: {
    rejectUnauthorized: false
  }
});

async function testAccountOpenings() {
  try {
    console.log('Connecting to live database...\n');
    await client.connect();
    console.log('Connected!\n');
    
    // Test the exact query used by the application
    console.log('Testing query with LIMIT...');
    const sql = `
      SELECT 
        id,
        session_id as "sessionId",
        full_name as "fullName",
        phone_number as "phoneNumber",
        email,
        ghana_card_number as "ghanaCardNumber",
        account_type as "accountType",
        initial_deposit as "initialDeposit",
        status,
        created_at as "createdAt"
      FROM account_openings
      ORDER BY created_at DESC
      LIMIT $1
    `;
    
    const result = await client.query(sql, [100]);
    console.log(`\nFound ${result.rows.length} account opening(s):\n`);
    
    result.rows.forEach(row => {
      console.log(`ID: ${row.id}`);
      console.log(`Name: ${row.fullName}`);
      console.log(`Email: ${row.email}`);
      console.log(`Phone: ${row.phoneNumber}`);
      console.log(`Account Type: ${row.accountType}`);
      console.log(`Status: ${row.status}`);
      console.log(`Created: ${row.createdAt}`);
      console.log('-'.repeat(60));
    });
    
    if (result.rows.length === 0) {
      console.log('⚠️  No account openings found in live database');
    } else {
      console.log(`✅ ${result.rows.length} account opening(s) should be visible to CS reps`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await client.end();
  }
}

testAccountOpenings();
