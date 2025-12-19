const { Pool } = require('pg');

const DATABASE_URL = 'postgresql://akcb_bank_user:IlcndVR943byznoByTRzN1zBQS3gB9lI@dpg-d4u410ali9vc73am148g-a.oregon-postgres.render.com/akcb_bank';

async function wipe() {
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 1,
    connectionTimeoutMillis: 30000,
    idleTimeoutMillis: 30000
  });

  try {
    console.log('[wipe] Checking tables...');
    const tables = await pool.query(
      `SELECT table_name FROM information_schema.tables 
       WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`
    );
    console.log('[wipe] Found tables:', tables.rows.map(r => r.table_name).join(', '));
    
    const TARGETS = ['transactions', 'account_balances', 'customers', 'loans'];
    const existing = new Set(tables.rows.map(r => r.table_name));
    const toDelete = TARGETS.filter(t => existing.has(t));
    
    if (toDelete.length === 0) {
      console.log('[wipe] No target tables found');
      await pool.end();
      return;
    }
    
    console.log('[wipe] Deleting from:', toDelete.join(', '));
    
    // Delete in reverse order
    for (const table of toDelete.reverse()) {
      console.log(`[wipe] Clearing ${table}...`);
      await pool.query(`DELETE FROM "${table}"`);
      
      const count = await pool.query(`SELECT COUNT(*) as count FROM "${table}"`);
      console.log(`[wipe]   → ${count.rows[0].count} rows remaining`);
    }
    
    console.log('[wipe] ✓ Complete');
    await pool.end();
    
  } catch (error) {
    console.error('[wipe] ✗ Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

wipe().then(() => process.exit(0));
