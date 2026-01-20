const axios = require('axios');
const https = require('https');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

async function testSMSAlert() {
  const apiKey = process.env.SMS_ONLINE_API_KEY;
  const senderName = process.env.SMS_ONLINE_SENDER || 'AKCB';
  const phone = process.env.ADMIN_ALERT_PHONE || '0243082750';

  console.log('Testing SMS Alert...');
  console.log('API Key:', apiKey ? 'SET (' + apiKey.substring(0, 10) + '...)' : 'NOT SET');
  console.log('Sender Name:', senderName);
  console.log('Admin Phone:', phone);

  if (!apiKey) {
    console.error('ERROR: SMS_ONLINE_API_KEY not configured!');
    return;
  }

  // Format phone number
  let formattedPhone = phone;
  if (phone.startsWith('0')) {
    formattedPhone = '233' + phone.substring(1);
  } else if (phone.startsWith('+233')) {
    formattedPhone = phone.substring(1);
  } else if (!phone.startsWith('233')) {
    formattedPhone = '233' + phone;
  }

  console.log('Formatted Phone:', formattedPhone);

  const message = '[AKCB BOT ALERT]\nTest escalation alert\nThis is a test message from the escalation system.';

  const smsData = {
    text: message,
    type: 0,
    sender: senderName,
    destinations: [formattedPhone]
  };

  console.log('\nSMS Data:', JSON.stringify(smsData, null, 2));

  // Create HTTPS agent
  let httpsAgent;
  const cacertPath = path.join(process.cwd(), 'cacert.pem');
  
  try {
    if (fs.existsSync(cacertPath)) {
      const ca = fs.readFileSync(cacertPath);
      httpsAgent = new https.Agent({
        ca: ca,
        rejectUnauthorized: true
      });
      console.log('Using cacert.pem for SSL verification');
    } else {
      httpsAgent = new https.Agent({
        rejectUnauthorized: true
      });
      console.log('Using default SSL certificates');
    }
  } catch (certError) {
    httpsAgent = new https.Agent({
      rejectUnauthorized: true
    });
    console.log('Using default SSL certificates (error reading cacert.pem)');
  }

  // Send SMS
  try {
    console.log('\nSending SMS...');
    const response = await axios.post(
      'https://api.smsonlinegh.com/v5/message/sms/send',
      smsData,
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Host': 'api.smsonlinegh.com',
          'Authorization': `key ${apiKey}`
        },
        httpsAgent,
        timeout: 10000
      }
    );

    console.log('\nResponse Status:', response.status);
    console.log('Response Data:', JSON.stringify(response.data, null, 2));

    if (response.status === 200) {
      if (response.data.handshake?.label === 'HSHK_OK') {
        console.log('\n✅ SMS sent successfully!');
        console.log('Handshake Label:', response.data.handshake.label);
      } else if (response.data.handshake?.id === 0) {
        console.log('\n✅ SMS sent successfully (id=0)!');
      } else {
        console.log('\n⚠️  SMS API returned unexpected response');
        console.log('Handshake:', response.data.handshake);
      }
    } else {
      console.error('\n❌ SMS API returned non-200 status');
    }
  } catch (error) {
    console.error('\n❌ Failed to send SMS:');
    if (error.response) {
      console.error('Response Status:', error.response.status);
      console.error('Response Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Error:', error.message);
    }
  }
}

testSMSAlert();
