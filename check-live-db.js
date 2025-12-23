const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://akcb_bank_user:IlcndVR943byznoByTRzN1zBQS3gB9lI@dpg-d4u410ali9vc73am148g-a.oregon-postgres.render.com/akcb_bank',
  ssl: {
    rejectUnauthorized: false
  }
});

async function checkLiveDatabase() {
  try {
    console.log('Connecting to live database on Render...\n');
    await client.connect();
    console.log('Connected successfully!\n');
    console.log('='.repeat(70));
    
    // Check loan applications
    const loansResult = await client.query('SELECT COUNT(*) as count FROM loan_applications');
    const loansCount = parseInt(loansResult.rows[0].count);
    console.log('\n📋 LOAN APPLICATIONS: ' + loansCount);
    
    if (loansCount > 0) {
      const loansData = await client.query(`
        SELECT id, full_name, status, TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI') as created 
        FROM loan_applications 
        ORDER BY created_at DESC 
        LIMIT 10
      `);
      loansData.rows.forEach(row => {
        console.log(`  - ID ${row.id}: ${row.full_name} [${row.status}] - ${row.created}`);
      });
    }
    
    // Check salary overdrafts
    const overdraftsResult = await client.query('SELECT COUNT(*) as count FROM salary_overdrafts');
    const overdraftsCount = parseInt(overdraftsResult.rows[0].count);
    console.log('\n💰 SALARY OVERDRAFTS: ' + overdraftsCount);
    
    if (overdraftsCount > 0) {
      const overdraftsData = await client.query(`
        SELECT id, full_name, status, TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI') as created 
        FROM salary_overdrafts 
        ORDER BY created_at DESC 
        LIMIT 10
      `);
      overdraftsData.rows.forEach(row => {
        console.log(`  - ID ${row.id}: ${row.full_name} [${row.status}] - ${row.created}`);
      });
    }
    
    // Check account openings
    const accountsResult = await client.query('SELECT COUNT(*) as count FROM account_openings');
    const accountsCount = parseInt(accountsResult.rows[0].count);
    console.log('\n🏦 ACCOUNT OPENINGS: ' + accountsCount);
    
    if (accountsCount > 0) {
      const accountsData = await client.query(`
        SELECT id, full_name, status, TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI') as created 
        FROM account_openings 
        ORDER BY created_at DESC 
        LIMIT 10
      `);
      accountsData.rows.forEach(row => {
        console.log(`  - ID ${row.id}: ${row.full_name} [${row.status}] - ${row.created}`);
      });
    }
    
    console.log('\n' + '='.repeat(70));
    console.log(`\n✅ TOTAL APPLICATIONS: ${loansCount + overdraftsCount + accountsCount}`);
    console.log('\nAll applications should be visible to CS Reps on the dashboard.');
    console.log('Dashboard limit: 100 per endpoint\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

checkLiveDatabase();
