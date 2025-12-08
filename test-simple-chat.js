#!/usr/bin/env node
const http = require('http');

const testQueries = [
  { msg: 'hi', expected: 'greeting' },
  { msg: 'hello', expected: 'greeting' },
  { msg: 'What are the checking account fees?', expected: 'KB content' }
];

let completed = 0;

function testQuery(message) {
  return new Promise((resolve) => {
    const body = JSON.stringify({
      message,
      sessionId: 'test-' + Date.now()
    });

    const req = http.request({
      hostname: 'localhost',
      port: 4000,
      path: '/api/chat',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ success: true, reply: json.reply });
        } catch (e) {
          resolve({ success: false, error: 'Parse error', data });
        }
      });
    });

    req.on('error', (err) => {
      resolve({ success: false, error: err.message });
    });

    req.write(body);
    req.end();
  });
}

async function runTests() {
  console.log('Testing Chatbot Responses\n');
  console.log('=========================\n');
  
  for (const test of testQueries) {
    console.log(`Test: "${test.msg}"`);
    const result = await testQuery(test.msg);
    
    if (result.success) {
      console.log(`✓ Success`);
      console.log(`  Reply: ${result.reply.substring(0, 150)}...`);
    } else {
      console.log(`✗ Failed: ${result.error}`);
      if (result.data) console.log(`  Data: ${result.data.substring(0, 100)}`);
    }
    console.log('');
  }
}

// Wait for server to be ready
setTimeout(runTests, 500);
