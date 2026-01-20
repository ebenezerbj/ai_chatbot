const axios = require('axios');

async function testProductionEscalation() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('   TESTING PRODUCTION ESCALATION SMS FUNCTIONALITY');
  console.log('═══════════════════════════════════════════════════════════\n');

  const escalationData = {
    sessionId: 'prod-escalation-test-' + Date.now(),
    name: 'Kwame Mensah',
    phone: '0501234567',
    message: 'I urgently need help with my loan application. It has been pending for too long and I need this resolved immediately!',
    lat: 6.6880,  // Near Kejetia branch
    lng: -1.6229
  };

  console.log('📋 Escalation Request Details:');
  console.log('   Customer Name:', escalationData.name);
  console.log('   Customer Phone:', escalationData.phone);
  console.log('   Location:', `${escalationData.lat}, ${escalationData.lng} (Near Kejetia)`);
  console.log('   Message:', escalationData.message);
  console.log('');

  try {
    console.log('📤 Submitting escalation to production server...\n');
    
    const response = await axios.post(
      'http://localhost:4000/api/handover',
      escalationData,
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    console.log('✅ ESCALATION SUBMITTED SUCCESSFULLY!\n');
    console.log('Response Details:');
    console.log('   Ticket ID:', response.data.ticketId);
    console.log('   Target Branch:', response.data.targetBranch);
    console.log('   Message:', response.data.message);
    console.log('');
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log('   EXPECTED SMS NOTIFICATIONS:');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
    console.log('📱 SMS #1: Branch Notification');
    console.log('   To: Kejetia Branch (+233248698267)');
    console.log('   Content: AKCB ESCALATION with ticket details');
    console.log('');
    console.log('📱 SMS #2: Admin Alert');
    console.log('   To: 0243082750 (Admin)');
    console.log('   Content: [AKCB BOT ALERT] Customer escalation submitted');
    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
    console.log('⏰ Please check:');
    console.log('   1. Your phone (0243082750) for admin alert SMS');
    console.log('   2. Branch phone (+233248698267) for branch notification');
    console.log('   3. Server console for SMS sending logs');
    console.log('');
    console.log('🔍 Look for these log messages:');
    console.log('   [SMS] Notification sent to Kejetia Branch');
    console.log('   [AdminAlert] Alert SMS sent successfully');
    console.log('');

  } catch (error) {
    console.log('❌ ESCALATION FAILED!\n');
    
    if (error.response) {
      console.log('Server Error Details:');
      console.log('   Status:', error.response.status);
      console.log('   Error:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.log('Network Error:');
      console.log('   No response received from server');
      console.log('   Error:', error.message);
    } else {
      console.log('Request Error:');
      console.log('   Error:', error.message);
    }
    
    console.log('');
    console.log('💡 Troubleshooting:');
    console.log('   1. Verify server is running: Test-NetConnection localhost -Port 4000');
    console.log('   2. Check server logs for errors');
    console.log('   3. Verify SMS_ONLINE_API_KEY is configured in .env');
    console.log('');
  }
}

testProductionEscalation();
