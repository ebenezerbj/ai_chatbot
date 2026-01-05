/**
 * Check if analytics tables exist and are properly set up
 */

const { Pool } = require('pg');
require('dotenv').config();

async function checkTables() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false }
  });

  try {
    console.log('=== Checking Analytics Tables ===\n');
    
    // Check if tables exist
    const tablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('chat_sessions', 'conversation_logs')
      ORDER BY table_name
    `;
    
    const tablesResult = await pool.query(tablesQuery);
    console.log('Existing tables:');
    tablesResult.rows.forEach(row => console.log(`  ✓ ${row.table_name}`));
    
    if (tablesResult.rows.length < 2) {
      console.log('\n⚠ WARNING: Some analytics tables are missing!');
      console.log('Run: npm run init-analytics or node -e "require(\'./dist/analytics\').initializeAnalyticsTables()"');
    }
    
    // Check chat_sessions structure
    const sessionsStructureQuery = `
      SELECT column_name, data_type, column_default, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'chat_sessions'
      ORDER BY ordinal_position
    `;
    
    const sessionsStructure = await pool.query(sessionsStructureQuery);
    console.log('\n\nchat_sessions table structure:');
    sessionsStructure.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type} ${row.column_default ? `(default: ${row.column_default})` : ''}`);
    });
    
    // Check conversation_logs structure
    const logsStructureQuery = `
      SELECT column_name, data_type, column_default, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'conversation_logs'
      ORDER BY ordinal_position
    `;
    
    const logsStructure = await pool.query(logsStructureQuery);
    console.log('\n\nconversation_logs table structure:');
    logsStructure.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type} ${row.column_default ? `(default: ${row.column_default})` : ''}`);
    });
    
    // Test insert into chat_sessions
    console.log('\n\n=== Testing Insert Operations ===\n');
    const testSessionId = `test_${Date.now()}`;
    
    try {
      await pool.query(
        'INSERT INTO chat_sessions (session_id, ip_address, user_agent, total_messages, user_messages, bot_messages) VALUES ($1, $2, $3, 0, 0, 0)',
        [testSessionId, '127.0.0.1', 'test-agent']
      );
      console.log('✓ Successfully inserted test session');
      
      // Test update
      await pool.query(
        'UPDATE chat_sessions SET total_messages = total_messages + 1, user_messages = user_messages + 1 WHERE session_id = $1',
        [testSessionId]
      );
      console.log('✓ Successfully updated test session');
      
      // Test insert into conversation_logs
      await pool.query(
        'INSERT INTO conversation_logs (session_id, message_index, role, content) VALUES ($1, $2, $3, $4)',
        [testSessionId, 0, 'user', 'test message']
      );
      console.log('✓ Successfully inserted test message');
      
      // Verify
      const verifyResult = await pool.query(
        'SELECT total_messages, user_messages FROM chat_sessions WHERE session_id = $1',
        [testSessionId]
      );
      
      if (verifyResult.rows[0].total_messages === 1 && verifyResult.rows[0].user_messages === 1) {
        console.log('✓ Message counters working correctly');
      } else {
        console.log(`⚠ Counter mismatch: total=${verifyResult.rows[0].total_messages}, user=${verifyResult.rows[0].user_messages}`);
      }
      
      // Cleanup
      await pool.query('DELETE FROM chat_sessions WHERE session_id = $1', [testSessionId]);
      console.log('✓ Test cleanup complete');
      
    } catch (error) {
      console.error('✗ Error during test:', error.message);
    }
    
    await pool.end();
    console.log('\n=== Check Complete ===');
    
  } catch (error) {
    console.error('Error:', error);
    await pool.end();
    process.exit(1);
  }
}

checkTables();
