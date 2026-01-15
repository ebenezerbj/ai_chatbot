/**
 * Migration script to update transaction_type check constraint
 * to allow 'Opening Balance' as a valid transaction type
 */
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes('render.com') ? { rejectUnauthorized: false } : false
});

async function fixTransactionTypeConstraint() {
  const client = await pool.connect();
  
  try {
    console.log('Starting transaction_type constraint update...\n');
    
    // Drop the old constraint
    console.log('Step 1: Dropping old constraint...');
    await client.query(`
      ALTER TABLE transactions 
      DROP CONSTRAINT IF EXISTS transactions_transaction_type_check
    `);
    console.log('✅ Old constraint dropped\n');
    
    // Add the new constraint with 'Opening Balance' included
    console.log('Step 2: Adding new constraint with "Opening Balance"...');
    await client.query(`
      ALTER TABLE transactions 
      ADD CONSTRAINT transactions_transaction_type_check 
      CHECK (transaction_type IN (
        'Deposit', 
        'Withdrawal', 
        'Transfer', 
        'Fee', 
        'Interest', 
        'Reversal', 
        'Opening Balance', 
        'Other'
      ))
    `);
    console.log('✅ New constraint added\n');
    
    // Verify the constraint
    console.log('Step 3: Verifying constraint...');
    const result = await client.query(`
      SELECT conname, pg_get_constraintdef(oid) as definition
      FROM pg_constraint
      WHERE conname = 'transactions_transaction_type_check'
    `);
    
    if (result.rows.length > 0) {
      console.log('✅ Constraint verified:');
      console.log(`   Name: ${result.rows[0].conname}`);
      console.log(`   Definition: ${result.rows[0].definition}\n`);
    }
    
    console.log('='.repeat(60));
    console.log('✅ Migration completed successfully!');
    console.log('='.repeat(60));
    console.log('\nYou can now run backfill_opening_balances.js\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

fixTransactionTypeConstraint();
