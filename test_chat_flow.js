/**
 * Test the complete chat flow with message logging
 */

const fetch = require('node-fetch');
const { Pool } = require('pg');
require('dotenv').config();

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

async function testChatFlow() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false }
  });

  try {
    console.log('=== Testing Complete Chat Flow ===\n');
    console.log(`Testing against: ${BASE_URL}\n`);
    
    // Step 1: Create session
    console.log('Step 1: Creating session...');
    const sessionResp = await fetch(`${BASE_URL}/api/session`, {
      method: 'POST'
    });
    
    if (!sessionResp.ok) {
      throw new Error(`Failed to create session: ${sessionResp.status}`);
    }
    
    const sessionData = await sessionResp.json();
    const sessionId = sessionData.sessionId;
    console.log(`✓ Session created: ${sessionId}\n`);
    
    // Step 2: Send first message
    console.log('Step 2: Sending first message...');
    const msg1Resp = await fetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        message: 'Hello',
        messageIndex: 0
      })
    });
    
    if (!msg1Resp.ok) {
      throw new Error(`Failed to send message: ${msg1Resp.status}`);
    }
    
    const msg1Data = await msg1Resp.json();
    console.log(`✓ Bot response: ${msg1Data.response?.substring(0, 100)}...\n`);
    
    // Wait a bit for database to update
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Step 3: Check database
    console.log('Step 3: Checking database...');
    
    const sessionQuery = await pool.query(
      'SELECT * FROM chat_sessions WHERE session_id = $1',
      [sessionId]
    );
    
    if (sessionQuery.rows.length === 0) {
      console.log('✗ Session not found in database!');
      return;
    }
    
    const session = sessionQuery.rows[0];
    console.log('Session data:');
    console.log(`  Total messages: ${session.total_messages}`);
    console.log(`  User messages: ${session.user_messages}`);
    console.log(`  Bot messages: ${session.bot_messages}`);
    
    const logsQuery = await pool.query(
      'SELECT COUNT(*) as count FROM conversation_logs WHERE session_id = $1',
      [sessionId]
    );
    
    const logCount = logsQuery.rows[0].count;
    console.log(`  Actual logs in database: ${logCount}\n`);
    
    if (session.total_messages === 0 && logCount === '0') {
      console.log('⚠ WARNING: Messages were not logged!');
      console.log('This indicates the analytics.logMessage() calls are failing silently.');
      console.log('\nChecking server logs for errors...');
    } else if (session.total_messages > 0) {
      console.log(`✓ SUCCESS: Messages are being logged correctly!`);
      console.log(`  Counter shows: ${session.total_messages} messages`);
      console.log(`  Database has: ${logCount} log entries`);
    }
    
    // Step 4: Send another message to verify increments
    console.log('\nStep 4: Sending second message...');
    const msg2Resp = await fetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        message: 'What are your loan products?',
        messageIndex: 2
      })
    });
    
    if (msg2Resp.ok) {
      console.log('✓ Second message sent');
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const updatedSession = await pool.query(
        'SELECT total_messages, user_messages, bot_messages FROM chat_sessions WHERE session_id = $1',
        [sessionId]
      );
      
      if (updatedSession.rows.length > 0) {
        const updated = updatedSession.rows[0];
        console.log(`  Updated totals: ${updated.total_messages} messages (${updated.user_messages} user, ${updated.bot_messages} bot)`);
      }
    }
    
    await pool.end();
    console.log('\n=== Test Complete ===');
    
  } catch (error) {
    console.error('\n✗ Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

testChatFlow();
