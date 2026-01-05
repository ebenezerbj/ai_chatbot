/**
 * Fix NULL message counts in chat_sessions table
 * This script updates any sessions with NULL message counts to 0
 */

const { Pool } = require('pg');
require('dotenv').config();

async function fixNullMessageCounts() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false }
  });

  try {
    console.log('Connecting to database...');
    
    // First, check how many sessions have NULL values
    const checkQuery = `
      SELECT COUNT(*) as null_count 
      FROM chat_sessions 
      WHERE total_messages IS NULL 
         OR user_messages IS NULL 
         OR bot_messages IS NULL
    `;
    
    const checkResult = await pool.query(checkQuery);
    const nullCount = checkResult.rows[0].null_count;
    
    console.log(`Found ${nullCount} sessions with NULL message counts`);
    
    if (nullCount === '0' || nullCount === 0) {
      console.log('✓ No NULL values found. All sessions are properly initialized!');
      await pool.end();
      return;
    }
    
    // Update NULL values to 0
    const updateQuery = `
      UPDATE chat_sessions 
      SET total_messages = COALESCE(total_messages, 0),
          user_messages = COALESCE(user_messages, 0),
          bot_messages = COALESCE(bot_messages, 0)
      WHERE total_messages IS NULL 
         OR user_messages IS NULL 
         OR bot_messages IS NULL
    `;
    
    const updateResult = await pool.query(updateQuery);
    console.log(`✓ Updated ${updateResult.rowCount} sessions`);
    
    // Verify the fix
    const verifyResult = await pool.query(checkQuery);
    const remainingNull = verifyResult.rows[0].null_count;
    
    if (remainingNull === '0' || remainingNull === 0) {
      console.log('✓ All NULL values have been fixed!');
    } else {
      console.log(`⚠ Warning: ${remainingNull} sessions still have NULL values`);
    }
    
    await pool.end();
    console.log('Done!');
    
  } catch (error) {
    console.error('Error fixing message counts:', error);
    await pool.end();
    process.exit(1);
  }
}

fixNullMessageCounts();
