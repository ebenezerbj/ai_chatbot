const { Pool } = require('pg');
require('dotenv').config();
const fs = require('fs');
const path = require('path');

const DATABASE_URL = 'postgresql://akcb_bank_user:IlcndVR943byznoByTRzN1zBQS3gB9lI@dpg-d4u410ali9vc73am148g-a/akcb_bank';

console.log('=== DATABASE MIGRATION: Enhanced Customer Demographics ===\n');

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('[Migration] Connected to database');
    
    // Read migration SQL
    const sqlPath = path.join(__dirname, 'migrations', '001_enhance_customer_demographics.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');
    
    console.log('[Migration] Executing schema updates...\n');
    
    // Execute migration
    await client.query(sql);
    
    console.log('✅ Migration completed successfully!\n');
    
    // Verify new columns
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'customers'
      ORDER BY ordinal_position
    `);
    
    console.log('📋 Current customer table structure:\n');
    result.rows.forEach(row => {
      console.log(`  ${row.column_name.padEnd(25)} ${row.data_type.padEnd(20)} ${row.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });
    
    console.log(`\nTotal columns: ${result.rows.length}`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
