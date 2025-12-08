#!/usr/bin/env node
/**
 * Simple server test - waits for server to be ready then tests it
 */
const http = require('http');

let attempts = 0;
const maxAttempts = 10;

function testServer() {
  const options = {
    hostname: 'localhost',
    port: 4000,
    path: '/api/health',
    method: 'GET',
    timeout: 2000
  };

  const req = http.request(options, (res) => {
    let body = '';
    res.on('data', (chunk) => body += chunk);
    res.on('end', () => {
      console.log('✓ Server is responding!');
      console.log('Status:', res.statusCode);
      console.log('Body:', body);
      process.exit(0);
    });
  });

  req.on('timeout', () => {
    req.destroy();
    console.error('✗ Request timeout');
    retryOrExit();
  });

  req.on('error', (err) => {
    console.error(`✗ Connection attempt ${attempts + 1}/${maxAttempts} failed:`, err.code);
    retryOrExit();
  });

  req.end();
}

function retryOrExit() {
  attempts++;
  if (attempts < maxAttempts) {
    console.log(`Retrying in 1 second...`);
    setTimeout(testServer, 1000);
  } else {
    console.error('✗ Server did not respond after', maxAttempts, 'attempts');
    process.exit(1);
  }
}

console.log('Testing server at localhost:4000...');
testServer();
