const { Pool } = require('pg');

const DATABASE_URL = 'postgresql://akcb_bank_user:IlcndVR943byznoByTRzN1zBQS3gB9lI@dpg-d4u410ali9vc73am148g-a.oregon-postgres.render.com/akcb_bank';

console.log('Testing connection to:', DATABASE_URL.replace(/:[^:@]+@/, ':***@'));

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 30000
});

pool.on('error', (err) => {
  console.error('Pool error:', err.message);
});

pool.on('connect', () => {
  console.log('✓ Pool connected');
});

async function test() {
  try {
    console.log('Getting client...');
    const client = await pool.connect();
    console.log('✓ Client acquired');
    
    console.log('Running query...');
    const result = await client.query('SELECT NOW() as now');
    console.log('✓ Query result:', result.rows[0]);
    
    client.release();
    console.log('✓ Client released');
    
    await pool.end();
    console.log('✓ Pool ended');
    
  } catch (err) {
    console.error('✗ Error:', err.message);
    console.error('Stack:', err.stack);
    process.exit(1);
  }
}

test();
