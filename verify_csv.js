const fs = require('fs');

const csvFile = 'C:\\Users\\Ebenezerbj\\Desktop\\Latest_Acc.csv';
const content = fs.readFileSync(csvFile, 'utf8');
const lines = content.split('\n');

console.log('=== QUICK CSV VERIFICATION ===\n');

// Find header
let headerLine = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('Account Number')) {
    headerLine = i;
    break;
  }
}

if (headerLine === -1) {
  console.log('ERROR: No header found');
  process.exit(1);
}

const headers = lines[headerLine].split(',');
const accIndex = headers.findIndex(h => h.includes('Account Number'));
const phoneIndex = headers.findIndex(h => h.includes('Mobile Phone'));

let total = 0;
let withScientific = 0;
let samples = [];

for (let i = headerLine + 1; i < lines.length && i < headerLine + 100; i++) {
  if (!lines[i].trim()) continue;
  const fields = lines[i].split(',');
  if (fields.length <= accIndex) continue;
  
  total++;
  const acc = fields[accIndex] || '';
  
  if (/[eE][+-]?\d+/.test(acc)) {
    withScientific++;
  }
  
  if (samples.length < 5 && acc.trim()) {
    samples.push(acc.trim());
  }
}

console.log('Sample account numbers:');
samples.forEach((s, i) => console.log(`  ${i+1}. ${s} (${s.length} digits)`));
console.log('');
console.log('Total rows checked:', total);
console.log('Scientific notation found:', withScientific);
console.log('');

if (withScientific === 0) {
  console.log('✅ FILE IS READY FOR UPLOAD!');
  console.log('');
  console.log('Next steps:');
  console.log('1. Go to: https://ai-chatbot-latest-mnyg.onrender.com/admin');
  console.log('2. Upload this file in the Customer Upload section');
  console.log('3. Wait for the upload to complete');
} else {
  console.log('❌ Still has scientific notation - need to re-export');
}
