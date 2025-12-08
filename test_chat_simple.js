#!/usr/bin/env node
const http = require('http');

async function testChat(query) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      userMessage: query,
      sessionId: 'test-session-123'
    });

    const options = {
      hostname: '127.0.0.1',
      port: 4000,
      path: '/api/chat',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          resolve({ statusCode: res.statusCode, response });
        } catch (e) {
          resolve({ statusCode: res.statusCode, body, error: e.message });
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function main() {
  console.log('Testing KB Retrieval...\n');
  
  const queries = [
    'What are the checking account fees?',
    'Tell me about the bank history',
    'Who is the board chairman?',
    'What savings rate do you offer?',
    'What are the branch managers?'
  ];

  for (const query of queries) {
    try {
      console.log(`Query: "${query}"`);
      const result = await testChat(query);
      
      if (result.response && result.response.reply) {
        const reply = result.response.reply;
        // Check if KB content is in the response
        const hasKBContent = reply.includes('$10 monthly') || reply.includes('history') || reply.includes('manager') || reply.includes('savings') || reply.includes('Richard');
        console.log(`✓ Response (${hasKBContent ? 'KB FOUND' : 'NO KB FOUND'}):`);
        console.log(`  ${reply.substring(0, 150)}...`);
      } else {
        console.log(`✗ No reply in response:`, result.response);
      }
      console.log('');
    } catch (err) {
      console.log(`✗ Error: ${err.message}\n`);
    }
  }
}

main();
