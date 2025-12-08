const http = require('http');

function testChat() {
  const data = JSON.stringify({ message: 'hi' });
  
  const options = {
    hostname: 'localhost',
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
    res.on('data', (chunk) => body += chunk);
    res.on('end', () => {
      console.log('Status:', res.statusCode);
      console.log('Response:', body);
      process.exit(0);
    });
  });

  req.on('error', (err) => {
    console.error('Error:', err.message);
    process.exit(1);
  });

  req.write(data);
  req.end();
}

setTimeout(testChat, 2000);
