/**
 * Diagnose session message count issues
 */

const { Pool } = require('pg');
require('dotenv').config();

async function diagnoseSessions() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false }
  });

  try {
    console.log('=== Session Message Count Diagnosis ===\n');
    
    // Get recent sessions
    const sessionsQuery = `
      SELECT 
        session_id,
        start_time,
        total_messages,
        user_messages,
        bot_messages,
        (SELECT COUNT(*) FROM conversation_logs WHERE session_id = cs.session_id) as actual_message_count
      FROM chat_sessions cs
      ORDER BY start_time DESC
      LIMIT 10
    `;
    
    const result = await pool.query(sessionsQuery);
    
    console.log(`Found ${result.rows.length} recent sessions:\n`);
    
    result.rows.forEach((session, index) => {
      console.log(`Session ${index + 1}:`);
      console.log(`  ID: ${session.session_id}`);
      console.log(`  Start Time: ${session.start_time}`);
      console.log(`  Total Messages (counter): ${session.total_messages}`);
      console.log(`  User Messages: ${session.user_messages}`);
      console.log(`  Bot Messages: ${session.bot_messages}`);
      console.log(`  Actual Messages (from logs): ${session.actual_message_count}`);
      
      if (session.total_messages !== parseInt(session.actual_message_count)) {
        console.log(`  ⚠ MISMATCH: Counter shows ${session.total_messages} but logs show ${session.actual_message_count}`);
      } else {
        console.log(`  ✓ Counts match`);
      }
      console.log('');
    });
    
    // Check for sessions with messages but zero count
    const mismatchQuery = `
      SELECT 
        cs.session_id,
        cs.total_messages,
        COUNT(cl.id) as actual_count
      FROM chat_sessions cs
      LEFT JOIN conversation_logs cl ON cs.session_id = cl.session_id
      GROUP BY cs.session_id, cs.total_messages
      HAVING COUNT(cl.id) != COALESCE(cs.total_messages, 0)
      LIMIT 20
    `;
    
    const mismatchResult = await pool.query(mismatchQuery);
    
    if (mismatchResult.rows.length > 0) {
      console.log(`\n=== Found ${mismatchResult.rows.length} sessions with mismatched counts ===\n`);
      mismatchResult.rows.forEach(row => {
        console.log(`  Session: ${row.session_id}`);
        console.log(`    Counter: ${row.total_messages}`);
        console.log(`    Actual: ${row.actual_count}`);
      });
    } else {
      console.log('\n✓ No mismatched sessions found');
    }
    
    await pool.end();
    
  } catch (error) {
    console.error('Error:', error);
    await pool.end();
    process.exit(1);
  }
}

diagnoseSessions();
