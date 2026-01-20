const axios = require('axios');

async function simpleTest() {
  try {
    console.log('Testing simple handover...');
    const response = await axios.post('http://localhost:4000/api/handover', {
      sessionId: 'simple-test-' + Date.now(),
      name: 'John Doe',
      phone: '0501234567',
      message: 'Need help',
      lat: 6.6880,
      lng: -1.6229
    });
    console.log('Success:', response.data);
  } catch (err) {
    console.error('Error:', err.response ? err.response.data : err.message);
    console.error('Status:', err.response ? err.response.status : 'N/A');
  }
}

simpleTest();
