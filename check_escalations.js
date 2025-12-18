// Quick script to check escalations in database
const { executeQuery } = require('./dist/database');

async function checkEscalations() {
  try {
    console.log('Checking sentiment analysis data...\n');
    
    // Check all sentiment data
    const allSentiment = await executeQuery(
      `SELECT sentiment, needs_escalation, COUNT(*) as count 
       FROM sentiment_analysis 
       GROUP BY sentiment, needs_escalation`,
      []
    );
    console.log('Sentiment distribution:');
    console.table(allSentiment);
    
    // Check escalations
    const escalations = await executeQuery(
      `SELECT * FROM sentiment_analysis WHERE needs_escalation = 1 LIMIT 5`,
      []
    );
    console.log('\nRecords with needs_escalation = 1:');
    console.table(escalations);
    
    // Check if session exists
    if (escalations.length > 0) {
      const sessionId = escalations[0].session_id;
      const session = await executeQuery(
        `SELECT * FROM chat_sessions WHERE session_id = ?`,
        [sessionId]
      );
      console.log('\nCorresponding session:');
      console.table(session);
    }
    
    // Try the actual escalation query
    const queue = await executeQuery(
      `SELECT DISTINCT cs.session_id, cs.start_time, sa.sentiment, sa.score, sa.emotion_tags
       FROM sentiment_analysis sa
       JOIN chat_sessions cs ON sa.session_id = cs.session_id
       WHERE sa.needs_escalation = 1
       ORDER BY sa.timestamp DESC
       LIMIT 50`,
      []
    );
    console.log('\nEscalation queue (JOIN result):');
    console.table(queue);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkEscalations();
