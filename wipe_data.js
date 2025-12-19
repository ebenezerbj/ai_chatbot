/**
 * Quick script to wipe customer data from Postgres
 * Usage: node wipe_data.js
 */

const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://akcb_bank_user:IlcndVR943byznoByTRzN1zBQS3gB9lI@dpg-d4u410ali9vc73am148g-a.oregon-postgres.render.com/akcb_bank';

const TABLES = ['transactions', 'account_balances', 'customers', 'loans'];

async function wipeData() {
  console.log('[wipe] Connecting to Postgres...');
  
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 3,
    connectionTimeoutMillis: 30000,
    idleTimeoutMillis: 30000,
    allowExitOnIdle: false
  });

  // Test connection first
  let client;
  try {
    console.log('[wipe] Getting client...');
    client = await pool.connect();
    console.log('[wipe] Connected successfully');
    
    console.log('[wipe] Checking tables...');
    const result = await client.query(
      `SELECT table_name 
       FROM information_schema.tables 
       WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`
    );
    client.release();
    
    const existing = new Set(result.rows.map(r => r.table_name));
    const toDelete = TABLES.filter(t => existing.has(t));
    
    if (toDelete.length === 0) {
      console.log('[wipe] No target tables found');
      return;
    }
    
    console.log('[wipe] Found tables:', toDelete.join(', '));
    console.log('[wipe] Deleting data...');
    
    // Delete in reverse order to respect FK constraints
    for (const table of toDelete.reverse()) {
      console.log(`[wipe] Clearing ${table}...`);
      const deleteClient = await pool.connect();
      try {
        await deleteClient.query(`DELETE FROM "${table}"`);
        const count = await deleteClient.query(`SELECT COUNT(*) as count FROM "${table}"`);
        console.log(`[wipe] ${table}: ${count.rows[0].count} rows remaining`);
      } finally {
        deleteClient.release();
      }
    }
    
    console.log('[wipe] ✓ All data deleted');
  } catch (error) {
    console.error('[wipe] Error:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

wipeData().then(() => {
  console.log('[wipe] Done');
  process.exit(0);
}).catch(err => {
  console.error('[wipe] Failed:', err.message);
  process.exit(1);
});
