/**
 * Test SMS API directly with cacert.pem
 */

const axios = require('axios');
const https = require('https');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function testSMS() {
  const apiKey = process.env.SMS_ONLINE_API_KEY;
  const senderName = process.env.SMS_ONLINE_SENDER || 'AKCB';
  const testPhone = '233501336873'; // Test with the account's phone

  console.log('Testing SMS Online Ghana API...');
  console.log('API Key:', apiKey ? `${apiKey.substring(0, 10)}...` : 'NOT SET');
  console.log('Sender:', senderName);
  console.log('Test Phone:', testPhone);
  console.log('');

  if (!apiKey) {
    console.error('❌ SMS_ONLINE_API_KEY not set in .env file');
    return;
  }

  const testOTP = Math.floor(100000 + Math.random() * 900000).toString();
  const message = `Hello, your AKCB verification code is: ${testOTP}. Valid for 5 minutes. Do not share this code.`;

  const smsData = {
    text: message,
    type: 0,
    sender: senderName,
    destinations: [testPhone]
  };

  // Create HTTPS agent with CA certificate bundle
  let httpsAgent;
  const cacertPath = path.join(__dirname, 'cacert.pem');
  
  try {
    if (fs.existsSync(cacertPath)) {
      const ca = fs.readFileSync(cacertPath);
      httpsAgent = new https.Agent({
        ca: ca,
        rejectUnauthorized: true
      });
      console.log('✓ Using CA certificate bundle from cacert.pem\n');
    } else {
      console.warn('⚠ cacert.pem not found, using default SSL settings\n');
      httpsAgent = new https.Agent({
        rejectUnauthorized: true
      });
    }
  } catch (certError) {
    console.error('❌ Error loading cacert.pem:', certError.message);
    return;
  }

  try {
    console.log('Sending test SMS...');
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
        timeout: 15000
      }
    );

    console.log('\n✓ SMS API Response:');
    console.log('Status:', response.status);
    console.log('Handshake:', response.data.handshake);
    
    if (response.data.data?.destinations) {
      console.log('\nDestinations:');
      response.data.data.destinations.forEach((dest) => {
        console.log(`  ${dest.to}: ${dest.status.label} (ID: ${dest.status.id})`);
      });
    }

    if (response.status === 200 && response.data.handshake?.id === 0) {
      console.log('\n🎉 SUCCESS! Test OTP sent:', testOTP);
      console.log('Check phone', testPhone, 'for the message');
    } else {
      console.log('\n⚠ SMS sent but unexpected response:', response.data);
    }

  } catch (error) {
    console.error('\n❌ Failed to send SMS:');
    if (error.response) {
      console.error('Response Status:', error.response.status);
      console.error('Response Data:', error.response.data);
    } else if (error.request) {
      console.error('No response received from server');
      console.error('Error:', error.message);
    } else {
      console.error('Error:', error.message);
    }
  }
}

testSMS();
