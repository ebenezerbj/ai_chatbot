const mysql = require('mysql2/promise');

(async () => {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'akcb_bank'
    });

    console.log('Connected to database');

    // Check ALL sentiment_analysis records with escalation flag
    const [allEscalations] = await connection.query(
      'SELECT session_id, sentiment, score, needs_escalation, timestamp FROM sentiment_analysis WHERE needs_escalation = 1'
    );

    console.log('\n=== ALL ESCALATIONS (NO TIME FILTER) ===');
    console.log('Count:', allEscalations.length);
    if (allEscalations.length > 0) {
      console.log('\nAll records:');
      allEscalations.forEach((rec, i) => {
        console.log(`${i + 1}.`, rec.session_id, '|', rec.sentiment, '|', rec.score, '|', rec.timestamp);
      });
    }

    // Check the sentiment distribution query
    const [distribution] = await connection.query(`
      SELECT 
        sentiment,
        COUNT(*) as count,
        AVG(score) as avg_score,
        COUNT(CASE WHEN needs_escalation = 1 THEN 1 END) as escalations
      FROM sentiment_analysis
      WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY sentiment
      ORDER BY count DESC
    `);

    console.log('\n=== SENTIMENT DISTRIBUTION (WHAT FRONTEND SEES) ===');
    console.log(JSON.stringify(distribution, null, 2));

    await connection.end();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
})();
