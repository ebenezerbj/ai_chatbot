const { spawn } = require('child_process');
const path = require('path');

const testScript = path.join(__dirname, 'test-with-session.js');
const proc = spawn('node', [testScript], {
  cwd: __dirname,
  stdio: 'inherit'
});

proc.on('close', (code) => {
  process.exit(code);
});
