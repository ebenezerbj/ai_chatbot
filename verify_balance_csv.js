const fs = require('fs');

const csvPath = 'C:\\Users\\Ebenezerbj\\Desktop\\R20_CUSTOMER_BAL_AKF18.csv';

console.log('=== BALANCE CSV VERIFICATION ===\n');

const content = fs.readFileSync(csvPath, 'utf-8');
const lines = content.split('\n');

// Find header row
let headerLine = -1;
let headers = [];
for (let i = 0; i < Math.min(10, lines.length); i++) {
  const fields = lines[i].split(',').map(f => f.trim());
  if (fields.some(h => h.includes('ACCOUNT NUMBER') || h.includes('ACCOUNT.ID'))) {
    headerLine = i;
    headers = fields;
    break;
  }
}

if (headerLine === -1) {
  console.log('❌ Could not find header row with ACCOUNT NUMBER or ACCOUNT.ID');
  process.exit(1);
}

console.log(`Header row found at line ${headerLine + 1}`);
console.log('Headers:', headers.join(' | '));
console.log();

const accIndex = headers.findIndex(h => h.includes('ACCOUNT NUMBER') || h.includes('ACCOUNT.ID'));
const balIndex = headers.findIndex(h => h.includes('Account Balance') || h.includes('BALANCE') || h.includes('Balance'));

if (accIndex === -1) {
  console.log('❌ Could not find account number column');
  process.exit(1);
}

if (balIndex === -1) {
  console.log('❌ Could not find balance column');
  process.exit(1);
}

console.log(`Account column: "${headers[accIndex]}" (index ${accIndex})`);
console.log(`Balance column: "${headers[balIndex]}" (index ${balIndex})`);
console.log();

// Check samples
let totalRows = 0;
let withScientificAcc = 0;
let withScientificBal = 0;
let samples = [];

for (let i = headerLine + 1; i < lines.length && i < headerLine + 101; i++) {
  if (!lines[i].trim()) continue;
  
  const fields = lines[i].split(',').map(f => f.trim());
  const acc = fields[accIndex] || '';
  const bal = fields[balIndex] || '';
  
  if (!acc) continue;
  
  totalRows++;
  
  if (/[eE][+-]?\d+/.test(acc)) {
    withScientificAcc++;
  }
  
  if (/[eE][+-]?\d+/.test(bal)) {
    withScientificBal++;
  }
  
  if (samples.length < 5) {
    samples.push({
      acc: acc,
      bal: bal,
      accDigits: acc.replace(/\D/g, '').length
    });
  }
}

console.log('Sample account numbers and balances:');
samples.forEach((s, i) => {
  console.log(`  ${i + 1}. ${s.acc} (${s.accDigits} digits) → Balance: ${s.bal}`);
});
console.log();

console.log(`Total rows checked: ${totalRows}`);
console.log(`Account numbers with scientific notation: ${withScientificAcc}`);
console.log(`Balances with scientific notation: ${withScientificBal}`);
console.log();

if (withScientificAcc === 0 && withScientificBal === 0) {
  console.log('✅ FILE IS READY FOR BALANCE UPLOAD!');
  console.log();
  console.log('Next steps:');
  console.log('1. Ensure DATABASE_URL is set in Render Environment');
  console.log('2. Go to: https://ai-chatbot-latest-mnyg.onrender.com/admin');
  console.log('3. Upload this file in the Balance Upload section');
  console.log('4. Wait for the upload to complete');
} else {
  console.log('❌ FILE HAS ISSUES - SCIENTIFIC NOTATION DETECTED!');
  console.log();
  console.log('You need to:');
  console.log('1. Open the CSV in Excel');
  console.log('2. Format account number and balance columns as TEXT');
  console.log('3. Re-export the data');
  console.log('4. Verify again before uploading');
}
