#!/usr/bin/env node
const http = require('http');

const queries = [
  'What are the checking account fees?',
  'Tell me about the bank history',
  'Who is the board chairman?',
  'What savings rate do you offer?',
  'What are the branch managers?'
];

function makeRequest(userMessage) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      userMessage,
      sessionId: 'test-session-' + Date.now()
    });

    const options = {
      hostname: 'localhost',
      port: 4000,
      path: '/api/chat',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          resolve({ reply: response.reply, status: res.statusCode });
        } catch (e) {
          resolve({ error: 'Failed to parse response', body });
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function runTests() {
  console.log('Testing AI Chatbot KB Integration\n');
  console.log('================================\n');

  for (const query of queries) {
    try {
      console.log(`Question: "${query}"`);
      const result = await makeRequest(query);
      
      if (result.error) {
        console.log(`ERROR: ${result.error}`);
        console.log(`Response: ${result.body}\n`);
      } else {
        const reply = result.reply || '(no reply)';
        
        // Check for KB keywords that should appear in responses
        const kbIndicators = [
          '$10 monthly',
          'founded',
          'Richard Owusu',
          'APY',
          'manager'
        ];
        
        const hasKB = kbIndicators.some(indicator => 
          reply.toLowerCase().includes(indicator.toLowerCase())
        );
        
        console.log(`Status: ${result.status}`);
        console.log(`Has KB Content: ${hasKB ? 'YES ✓' : 'NO ✗'}`);
        console.log(`Reply (first 200 chars):`);
        console.log(`  "${reply.substring(0, 200)}..."`);
        console.log('');
      }
    } catch (err) {
      console.log(`ERROR: ${err.message}\n`);
    }
  }
}

// Wait a moment for server to be ready, then run tests
setTimeout(runTests, 1000);
