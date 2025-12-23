const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://akcb_bank_user:IlcndVR943byznoByTRzN1zBQS3gB9lI@dpg-d4u410ali9vc73am148g-a.oregon-postgres.render.com/akcb_bank',
  ssl: {
    rejectUnauthorized: false
  }
});

async function checkTableStructure() {
  try {
    console.log('Connecting to live database...\n');
    await client.connect();
    console.log('Connected!\n');
    
    // Check table structure
    console.log('Checking account_openings table structure...\n');
    const structure = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'account_openings'
      ORDER BY ordinal_position
    `);
    
    console.log('Table columns:');
    structure.rows.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
    });
    
    // Check all records
    console.log('\n' + '='.repeat(70));
    console.log('\nAll records in account_openings:\n');
    const allRecords = await client.query('SELECT * FROM account_openings ORDER BY id');
    
    if (allRecords.rows.length === 0) {
      console.log('⚠️  No records found in account_openings table');
    } else {
      allRecords.rows.forEach((row, idx) => {
        console.log(`Record ${idx + 1}:`);
        Object.keys(row).forEach(key => {
          console.log(`  ${key}: ${row[key]}`);
        });
        console.log('-'.repeat(60));
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

checkTableStructure();
