const axios = require('axios');

async function testLiveProduction() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('   TESTING LIVE PRODUCTION ESCALATION SMS');
  console.log('   (PostgreSQL on Render)');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Use your actual production URL
  const PRODUCTION_URL = 'https://ai-chatbot-1-a596.onrender.com';
  
  console.log('🌐 Production URL:', PRODUCTION_URL);
  console.log('');

  const escalationData = {
    sessionId: 'prod-test-' + Date.now(),
    name: 'Production Test User',
    phone: '0243082750',
    message: 'Testing escalation SMS after fix - Production PostgreSQL',
    lat: 6.6880,
    lng: -1.6229
  };

  console.log('📋 Test Escalation:');
  console.log('   Customer:', escalationData.name);
  console.log('   Phone:', escalationData.phone);
  console.log('   Location: Near Kejetia Branch');
  console.log('');

  try {
    console.log('📤 Submitting to production server...\n');
    
    const response = await axios.post(
      `${PRODUCTION_URL}/api/handover`,
      escalationData,
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    console.log('✅ SUCCESS!\n');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('   EXPECTED SMS NOTIFICATIONS:');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
    console.log('📱 SMS #1: Branch Notification');
    console.log('   To: Kejetia Branch (+233248698267)');
    console.log('   Message: AKCB ESCALATION with ticket details');
    console.log('');
    console.log('📱 SMS #2: Admin Alert');
    console.log('   To: 0243082750 (Your phone)');
    console.log('   Message: [AKCB BOT ALERT] Customer escalation submitted');
    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
    console.log('⏰ CHECK YOUR PHONE NOW!');
    console.log('   You should receive SMS from "AkcbSupport"');
    console.log('');
    console.log('To verify in production database:');
    console.log('   node test_production_postgres.js');
    console.log('');

  } catch (error) {
    console.log('❌ FAILED!\n');
    
    if (error.response) {
      console.log('Server Response:');
      console.log('   Status:', error.response.status);
      console.log('   Error:', JSON.stringify(error.response.data, null, 2));
    } else if (error.code === 'ECONNREFUSED') {
      console.log('Connection Error:');
      console.log('   Cannot connect to', PRODUCTION_URL);
      console.log('');
      console.log('Possible issues:');
      console.log('   1. Render service is sleeping (free tier)');
      console.log('   2. Wrong production URL');
      console.log('   3. Deployment still in progress');
      console.log('');
      console.log('Wait a few minutes for Render to deploy, then try again.');
    } else {
      console.log('Error:', error.message);
    }
    console.log('');
  }
}

// Check if custom URL provided
const customUrl = process.argv[2];
if (customUrl) {
  console.log('Using custom URL:', customUrl);
}

testLiveProduction();
