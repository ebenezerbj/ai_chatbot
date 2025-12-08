#!/usr/bin/env node
const http = require('http');

function makeRequest(path, body, method = 'POST') {
  return new Promise((resolve) => {
    const bodyStr = JSON.stringify(body);
    const options = {
      hostname: 'localhost',
      port: 4000,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(bodyStr)
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, error: 'Parse error', raw: data });
        }
      });
    });

    req.on('error', (err) => {
      resolve({ error: err.message });
    });

    req.write(bodyStr);
    req.end();
  });
}

async function test() {
  console.log('Testing Chat with Session\n');
  console.log('=========================\n');
  
  // Step 1: Create session
  console.log('Step 1: Creating session...');
  const sessionResp = await makeRequest('/api/session', {});
  
  if (sessionResp.error) {
    console.log(`✗ Failed to create session: ${sessionResp.error}`);
    return;
  }
  
  if (sessionResp.status !== 200 || !sessionResp.data.sessionId) {
    console.log(`✗ Invalid session response:`, sessionResp);
    return;
  }
  
  const sessionId = sessionResp.data.sessionId;
  console.log(`✓ Session created: ${sessionId}\n`);
  
  // Step 2: Send messages
  const messages = ['hi', 'hello', 'What are the checking account fees?'];
  
  for (const msg of messages) {
    console.log(`Sending: "${msg}"`);
    const chatResp = await makeRequest('/api/chat', {
      sessionId,
      message: msg
    });
    
    if (chatResp.error) {
      console.log(`✗ Error: ${chatResp.error}`);
    } else if (chatResp.status !== 200) {
      console.log(`✗ Status ${chatResp.status}:`, chatResp.data);
    } else if (chatResp.data.reply) {
      console.log(`✓ Reply: ${chatResp.data.reply.substring(0, 120)}...`);
    } else {
      console.log(`✗ No reply in response:`, chatResp);
    }
    console.log('');
  }
}

// Wait for server
setTimeout(test, 1000);
