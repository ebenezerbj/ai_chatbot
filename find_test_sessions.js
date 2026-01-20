const { Client } = require('pg');
require('dotenv').config();

async function findTestSessions() {
  try {
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });

    await client.connect();
    console.log('Looking for test sessions...\n');

    // Check chat_sessions for our test sessions
    const sessions = await client.query(
      `SELECT session_id, created_at 
       FROM chat_sessions 
       WHERE session_id LIKE '%sentiment-test%'
       ORDER BY created_at DESC 
       LIMIT 10`
    );

    console.log('📋 Test Sessions in chat_sessions:');
    if (sessions.rows.length > 0) {
      sessions.rows.forEach(row => {
        console.log(`  - ${row.session_id} (${row.created_at})`);
      });
    } else {
      console.log('  No test sessions found in chat_sessions table');
    }

    // Check message logs for test sessions (supports different table names)
    const messageTables = ['conversation_logs', 'chat_messages', 'live_chat_messages'];
    const tableResult = await client.query(
      `SELECT table_name
       FROM information_schema.tables
       WHERE table_schema = 'public'
         AND table_name = ANY($1::text[])
       ORDER BY array_position($1::text[], table_name)
       LIMIT 1`,
      [messageTables]
    );

    console.log('\n💬 Test Messages:');
    if (tableResult.rows.length === 0) {
      console.log('  No message table found (expected conversation_logs, chat_messages, or live_chat_messages)');
    } else {
      const messageTable = tableResult.rows[0].table_name;
      let messagesQuery = '';

      if (messageTable === 'conversation_logs') {
        messagesQuery = `SELECT session_id, content AS message, role AS sender, timestamp
                         FROM conversation_logs
                         WHERE session_id LIKE '%sentiment-test%'
                         ORDER BY timestamp DESC
                         LIMIT 5`;
      } else if (messageTable === 'chat_messages') {
        messagesQuery = `SELECT session_id, message, sender, timestamp
                         FROM chat_messages
                         WHERE session_id LIKE '%sentiment-test%'
                         ORDER BY timestamp DESC
                         LIMIT 5`;
      } else {
        messagesQuery = `SELECT session_id, message, sender, timestamp
                         FROM live_chat_messages
                         WHERE session_id LIKE '%sentiment-test%'
                         ORDER BY timestamp DESC
                         LIMIT 5`;
      }

      const messages = await client.query(messagesQuery);
      if (messages.rows.length > 0) {
        messages.rows.forEach(msg => {
          console.log(`\n  Session: ${msg.session_id}`);
          console.log(`  From: ${msg.sender}`);
          console.log(`  Message: ${msg.message.substring(0, 60)}...`);
          console.log(`  Time: ${msg.timestamp}`);
        });
      } else {
        console.log('  No test messages found');
      }
    }

    // Check sentiment for test sessions
    const sentiment = await client.query(
      `SELECT session_id, sentiment, score, needs_escalation, timestamp 
       FROM sentiment_analysis 
       WHERE session_id LIKE '%sentiment-test%'
       ORDER BY timestamp DESC 
       LIMIT 5`
    );

    console.log('\n📊 Test Sentiment Analysis:');
    if (sentiment.rows.length > 0) {
      sentiment.rows.forEach(row => {
        console.log(`\n  Session: ${row.session_id}`);
        console.log(`  Sentiment: ${row.sentiment}, Score: ${row.score}`);
        console.log(`  Escalation: ${row.needs_escalation ? 'YES ⚠️' : 'NO'}`);
        console.log(`  Time: ${row.timestamp}`);
      });
    } else {
      console.log('  No sentiment analysis for test sessions!');
      console.log('  This means sentiment analysis is not running for these sessions.');
    }

    await client.end();

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

findTestSessions();
