const axios = require('axios');

async function testSentimentEscalationLive() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('   TESTING SENTIMENT ESCALATION SMS - LIVE PRODUCTION');
  console.log('═══════════════════════════════════════════════════════════\n');

  const PRODUCTION_URL = 'https://ai-chatbot-1-a596.onrender.com';
  
  // Generate unique session ID
  const sessionId = 'sentiment-test-' + Date.now();
  
  // Send a frustrated message that should trigger escalation
  const frustratedMessage = "I'm extremely angry and frustrated! This service is terrible and I've been waiting for hours! I need help immediately! This is unacceptable!";
  
  console.log('📋 Test Details:');
  console.log('   Session ID:', sessionId);
  console.log('   Message:', frustratedMessage);
  console.log('   Expected: AI detects frustrated sentiment (score < -0.7)');
  console.log('   Expected: SMS sent to admin (0243082750)');
  console.log('');

  try {
    console.log('📤 Sending frustrated message to production chatbot...\n');
    
    const response = await axios.post(
      `${PRODUCTION_URL}/api/chat`,
      {
        message: frustratedMessage,
        sessionId: sessionId
      },
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    console.log('✅ MESSAGE SENT SUCCESSFULLY!\n');
    console.log('Chatbot Response:');
    console.log('─────────────────────────────────────────────────────────');
    console.log(response.data.response || response.data.reply);
    console.log('─────────────────────────────────────────────────────────\n');
    
    console.log('Session ID:', response.data.sessionId);
    console.log('');
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log('   EXPECTED OUTCOME:');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
    console.log('1. 🤖 AI Sentiment Analysis:');
    console.log('   - Sentiment: frustrated');
    console.log('   - Score: < -0.7');
    console.log('   - needs_escalation: TRUE');
    console.log('');
    console.log('2. 📱 SMS Alert to Admin:');
    console.log('   - To: 0243082750');
    console.log('   - From: AkcbSupport');
    console.log('   - Message: [AKCB BOT ALERT]');
    console.log('             Sentiment escalation detected');
    console.log('             Session: ' + sessionId);
    console.log('             Sentiment: frustrated, Score: -0.8x');
    console.log('');
    console.log('3. 📊 Admin Dashboard:');
    console.log('   - Escalation visible in AI/ML Dashboard');
    console.log('   - URL: ' + PRODUCTION_URL + '/admin-portal.html');
    console.log('   - Section: AI/ML Dashboard → Escalation Queue');
    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
    console.log('⏰ CHECK YOUR PHONE NOW!');
    console.log('   You should receive SMS from "AkcbSupport" within 30 seconds');
    console.log('');
    console.log('🔍 To verify in database:');
    console.log('   node test_production_postgres.js');
    console.log('   (Look for session_id: ' + sessionId + ')');
    console.log('');
    console.log('Wait 30-60 seconds for Render deployment to complete,');
    console.log('then check your phone for the SMS alert!');
    console.log('');

  } catch (error) {
    console.log('❌ TEST FAILED!\n');
    
    if (error.response) {
      console.log('Server Response Error:');
      console.log('   Status:', error.response.status);
      console.log('   Error:', JSON.stringify(error.response.data, null, 2));
    } else if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      console.log('Timeout Error:');
      console.log('   Request timed out after 30 seconds');
      console.log('   The server might be processing or starting up');
      console.log('');
      console.log('Possible reasons:');
      console.log('   1. Render service is sleeping (cold start)');
      console.log('   2. Deployment still in progress');
      console.log('   3. OpenAI API is slow');
      console.log('');
      console.log('Try again in a minute.');
    } else {
      console.log('Network Error:');
      console.log('   Error:', error.message);
    }
    console.log('');
  }
}

console.log('');
console.log('Note: This test requires OpenAI API to be configured');
console.log('      and the latest code to be deployed on Render.');
console.log('');

testSentimentEscalationLive();
