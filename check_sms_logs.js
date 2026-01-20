const fs = require('fs');
const path = require('path');

// Try to find and read recent server logs
console.log('Checking for SMS sending logs...\n');

// Check if there's a log file
const logFiles = ['server.log', 'app.log', 'output.log'];
let found = false;

for (const logFile of logFiles) {
  const logPath = path.join(__dirname, logFile);
  if (fs.existsSync(logPath)) {
    console.log(`Found log file: ${logFile}`);
    const content = fs.readFileSync(logPath, 'utf-8');
    const lines = content.split('\n').slice(-50); // Last 50 lines
    
    const smsLines = lines.filter(line => 
      line.includes('[SMS]') || 
      line.includes('[AdminAlert]') || 
      line.includes('[Handover]')
    );
    
    if (smsLines.length > 0) {
      console.log('\nRecent SMS-related logs:');
      smsLines.forEach(line => console.log(line));
      found = true;
    }
  }
}

if (!found) {
  console.log('No log files found in current directory.');
  console.log('\nTo check server logs:');
  console.log('1. Look at the server console window (minimized PowerShell)');
  console.log('2. Or run: Get-Process -Name powershell | Where-Object {$_.MainWindowTitle -like "*ai_chatbot*"}');
}

console.log('\n═══════════════════════════════════════════════════════════');
console.log('To manually verify SMS was sent:');
console.log('═══════════════════════════════════════════════════════════');
console.log('1. Check your phone (0243082750) for SMS from "AkcbSupport"');
console.log('2. The SMS should contain: "[AKCB BOT ALERT] Customer escalation submitted"');
console.log('3. Check the escalations table in database:');
console.log('   mysql -u root akcb_bank -e "SELECT * FROM escalations ORDER BY created_at DESC LIMIT 1"');
console.log('');
