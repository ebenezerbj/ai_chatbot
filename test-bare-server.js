const express = require('express');
const app = express();

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.post('/api/chat', (req, res) => {
  res.json({ reply: 'Test response with KB data' });
});

const port = 4000;
const host = '127.0.0.1';

console.log(`Attempting to listen on http://${host}:${port}`);

const server = app.listen(port, host, () => {
  console.log(`Server listening on http://${host}:${port}`);
}).on('error', (err) => {
  console.error(`Server error: ${err.message}`);
  process.exit(1);
});

// Test if listening
setTimeout(() => {
  const net = require('net');
  const socket = new net.Socket();
  socket.on('error', () => {
    console.log('ERROR: Cannot connect to server');
  });
  socket.on('connect', () => {
    console.log('SUCCESS: Server is listening');
    socket.destroy();
  });
  socket.connect(port, host);
}, 1000);
