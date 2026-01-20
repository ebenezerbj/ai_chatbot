const { Client } = require('pg');
require('dotenv').config();

async function checkSentimentEscalation() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('   CHECKING SENTIMENT ESCALATION IN PRODUCTION DATABASE');
  console.log('═══════════════════════════════════════════════════════════\n');

  try {
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false
      }
    });

    await client.connect();
    console.log('✅ Connected to production PostgreSQL database\n');

    // Check most recent sentiment analysis
    const sentimentQuery = await client.query(
      `SELECT session_id, sentiment, score, needs_escalation, emotion_tags, timestamp 
       FROM sentiment_analysis 
       WHERE session_id LIKE 'sentiment-test-%'
       ORDER BY timestamp DESC 
       LIMIT 5`
    );

    console.log('📊 RECENT SENTIMENT ESCALATIONS (Test Sessions):');
    if (sentimentQuery.rows.length > 0) {
      sentimentQuery.rows.forEach((row, idx) => {
        console.log(`\n${idx + 1}. Session: ${row.session_id}`);
        console.log(`   Sentiment: ${row.sentiment}`);
        console.log(`   Score: ${row.score}`);
        console.log(`   Needs Escalation: ${row.needs_escalation ? '✅ YES' : '❌ NO'}`);
        console.log(`   Emotions: ${row.emotion_tags}`);
        console.log(`   Timestamp: ${row.timestamp}`);
        
        if (row.needs_escalation) {
          console.log('   🚨 ESCALATION DETECTED - SMS should have been sent!');
        }
      });
    } else {
      console.log('   No test sentiment records found yet.');
      console.log('   (Sentiment analysis may still be processing...)');
    }

    console.log('\n');
    console.log('📊 ALL ESCALATIONS NEEDING ATTENTION:');
    const allEscalations = await client.query(
      `SELECT session_id, sentiment, score, timestamp 
       FROM sentiment_analysis 
       WHERE needs_escalation = TRUE 
       ORDER BY timestamp DESC 
       LIMIT 10`
    );

    if (allEscalations.rows.length > 0) {
      console.log(`   Total: ${allEscalations.rows.length} escalations`);
      allEscalations.rows.forEach((row, idx) => {
        console.log(`\n${idx + 1}. ${row.session_id.substring(0, 30)}...`);
        console.log(`   Sentiment: ${row.sentiment}, Score: ${row.score}`);
        console.log(`   Time: ${row.timestamp}`);
      });
    } else {
      console.log('   No escalations found in database');
    }

    await client.end();

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('   VERIFICATION CHECKLIST:');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
    console.log('✓ Check if sentiment analysis was performed');
    console.log('✓ Check if needs_escalation = TRUE');
    console.log('✓ Check your phone (0243082750) for SMS');
    console.log('✓ Check Render logs for SMS sending confirmation');
    console.log('');
    console.log('If sentiment analysis is not showing yet:');
    console.log('- Wait 1-2 minutes for async processing');
    console.log('- Run this script again');
    console.log('- Check Render logs for any errors');
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkSentimentEscalation();
