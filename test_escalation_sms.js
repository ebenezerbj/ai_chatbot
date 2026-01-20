const axios = require('axios');

async function testEscalation() {
  console.log('Testing Escalation SMS...\n');

  const escalationData = {
    sessionId: 'test-session-' + Date.now(),
    name: 'Test Customer',
    phone: '0501234567',
    message: 'I need urgent help with my loan application. This is taking too long!',
    lat: 6.6893,
    lng: -1.6244
  };

  console.log('Submitting escalation request:');
  console.log(JSON.stringify(escalationData, null, 2));
  console.log('');

  try {
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

    console.log('✅ Escalation submitted successfully!');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    console.log('');
    console.log('Expected SMS recipients:');
    console.log('- Branch phone (based on location)');
    console.log('- Admin alert phone: 0243082750');
    console.log('');
    console.log('Check the server console for SMS sending logs.');
    console.log('Look for messages like:');
    console.log('  [SMS] Notification sent to... Branch');
    console.log('  [AdminAlert] Sending alert to...');
    console.log('  [AdminAlert] Alert SMS sent successfully');
  } catch (error) {
    if (error.response) {
      console.error('❌ Escalation failed!');
      console.error('Status:', error.response.status);
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.error('❌ No response received from server');
      console.error('Error:', error.message);
    } else {
      console.error('❌ Error:', error.message);
    }
  }
}

testEscalation();
