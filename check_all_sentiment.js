const { Client } = require('pg');
require('dotenv').config();

async function checkAllSentiment() {
  try {
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });

    await client.connect();
    console.log('✅ Connected to production database\n');

    // Check ALL sentiment records (not just escalations)
    const allSentiment = await client.query(
      `SELECT session_id, sentiment, score, needs_escalation, timestamp 
       FROM sentiment_analysis 
       ORDER BY timestamp DESC 
       LIMIT 10`
    );

    console.log('📊 ALL RECENT SENTIMENT ANALYSIS (Last 10):');
    if (allSentiment.rows.length > 0) {
      allSentiment.rows.forEach((row, idx) => {
        console.log(`\n${idx + 1}. Session: ${row.session_id.substring(0, 40)}...`);
        console.log(`   Sentiment: ${row.sentiment}, Score: ${row.score}`);
        console.log(`   Escalation: ${row.needs_escalation ? 'YES' : 'NO'}`);
        console.log(`   Time: ${row.timestamp}`);
      });
    } else {
      console.log('   No sentiment records found in database!');
      console.log('   This means sentiment analysis is NOT running at all.');
    }

    // Check table structure
    console.log('\n📋 Checking sentiment_analysis table structure...');
    const structure = await client.query(
      `SELECT column_name, data_type 
       FROM information_schema.columns 
       WHERE table_name = 'sentiment_analysis'
       ORDER BY ordinal_position`
    );
    
    console.log('\nTable columns:');
    structure.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type}`);
    });

    await client.end();

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkAllSentiment();
