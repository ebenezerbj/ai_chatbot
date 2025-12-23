const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://akcb_bank_user:IlcndVR943byznoByTRzN1zBQS3gB9lI@dpg-d4u410ali9vc73am148g-a.oregon-postgres.render.com/akcb_bank',
  ssl: {
    rejectUnauthorized: false
  }
});

async function checkLoanTable() {
  try {
    await client.connect();
    
    // Check table structure
    console.log('Loan Applications Table Structure:\n');
    const structure = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'loan_applications'
      ORDER BY ordinal_position
    `);
    
    structure.rows.forEach(col => {
      console.log(`  ${col.column_name} (${col.data_type})`);
    });
    
    // Get sample data
    console.log('\n' + '='.repeat(70));
    console.log('\nSample Loan Application Data:\n');
    const sample = await client.query('SELECT * FROM loan_applications LIMIT 1');
    
    if (sample.rows.length > 0) {
      Object.keys(sample.rows[0]).forEach(key => {
        console.log(`  ${key}: ${sample.rows[0][key]}`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

checkLoanTable();
