// Minimal test server to debug connection issues
const express = require('express');

const app = express();
const port = 5555;

console.log('Creating Express app...');

// Add detailed request logging
app.use((req, res, next) => {
  console.log(`🔍 Incoming ${req.method} ${req.url}`);
  console.log('Headers:', req.headers);
  console.log('Remote address:', req.connection.remoteAddress);
  next();
});

app.use(express.json());

console.log('Adding routes...');

app.get('/test', (req, res) => {
  console.log('✅ Test route hit!');
  const response = { message: 'Test server is working!', timestamp: new Date().toISOString() };
  console.log('Sending response:', response);
  res.json(response);
});

app.get('/api/health', (req, res) => {
  console.log('✅ Health route hit!');
  res.json({ status: 'ok', message: 'Minimal server health check' });
});

console.log('Starting server...');

// Add process error handlers
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection:', reason);
});

const server = app.listen(port, '0.0.0.0', () => {
  console.log(`✅ Minimal server listening on http://0.0.0.0:${port}`);
  console.log('Address info:', server.address());
}).on('error', (err) => {
  console.error('❌ Server failed to start:', err);
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${port} is already in use`);
  }
});

// Keep the process alive
setInterval(() => {
  console.log('Server still running...', new Date().toISOString());
}, 5000);

console.log('Script execution completed');