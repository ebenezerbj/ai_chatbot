const http = require('http');

// Test various queries to see if KB retrieval is working
const queries = [
  'What are your branch locations?',
  'Where is the nearest branch?',
  'Tell me about loans',
  'What products do you offer?',
  'How can I contact you?'
];

async function testChat() {
  // First create a session
  const createSessionReq = http.request({
    hostname: 'localhost',
    port: 4000,
    path: '/api/session',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', async () => {
      const { sessionId } = JSON.parse(data);
      console.log(`✓ Created session: ${sessionId}\n`);
      
      // Now test each query
      for (const query of queries) {
        await testQuery(sessionId, query);
      }
    });
  });
  
  createSessionReq.end();
}

async function testQuery(sessionId, query) {
  return new Promise((resolve) => {
    const postData = JSON.stringify({ sessionId, message: query });
    
    const chatReq = http.request({
      hostname: 'localhost',
      port: 4000,
      path: '/api/chat',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          console.log(`Query: "${query}"`);
          console.log(`Reply: ${result.reply.substring(0, 150)}...`);
          console.log('---');
        } catch (e) {
          console.log(`Query: "${query}" - ERROR parsing response`);
        }
        resolve();
      });
    });
    
    chatReq.on('error', (e) => {
      console.log(`Query: "${query}" - Network error: ${e.message}`);
      resolve();
    });
    
    chatReq.write(postData);
    chatReq.end();
  });
}

testChat().catch(console.error);
