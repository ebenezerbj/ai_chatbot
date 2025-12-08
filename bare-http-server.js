#!/usr/bin/env node
// Bare-bones HTTP server using Node.js built-in http module
const http = require('http');
const port = 4000;

const server = http.createServer((req, res) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    message: 'Bare HTTP server working!',
    timestamp: new Date().toISOString(),
    url: req.url
  }));
});

// Bind to the actual machine IP
server.listen(port, '192.168.43.117', () => {
  const addr = server.address();
  console.log(`✅ Bare HTTP server listening`);
  console.log(`   Address: ${addr.address}`);
  console.log(`   Port: ${addr.port}`);
  console.log(`   Family: ${addr.family}`);
});

server.on('error', (err) => {
  console.error('❌ Server error:', err);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught exception:', err);
  process.exit(1);
});

// Heartbeat
const heartbeatInterval = setInterval(() => {
  console.log(`Server running... [${new Date().toISOString()}]`);
  console.error(`Heartbeat check - process.uptime: ${process.uptime()}`);
}, 3000);

process.on('exit', (code) => {
  console.log(`Process exiting with code ${code}`);
});

console.log('Starting bare HTTP server at', new Date().toISOString());
