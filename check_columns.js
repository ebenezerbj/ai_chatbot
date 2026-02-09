const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://akcb_bank_user:IlcndVR943byznoByTRzN1zBQS3gB9lI@dpg-d4u410ali9vc73am148g-a.oregon-postgres.render.com/akcb_bank',
  ssl: { rejectUnauthorized: false }
});

(async () => {
  try {
    const r = await pool.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'customers' ORDER BY ordinal_position`);
    console.log('=== CUSTOMERS TABLE COLUMNS ===');
    r.rows.forEach(c => console.log(`  ${c.column_name} (${c.data_type})`));
    console.log(`\nTotal columns: ${r.rows.length}`);
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await pool.end();
  }
})();
