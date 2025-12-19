const fs = require('fs');

const csvFile = 'C:\\Users\\Ebenezerbj\\Desktop\\Latest_Accounts.csv';
const content = fs.readFileSync(csvFile, 'utf8');
const lines = content.split('\n');

console.log('=== CSV FILE ANALYSIS ===\n');

// Find header row
let headerLine = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('Account Number') && lines[i].includes('First Name')) {
    headerLine = i;
    console.log('✓ Found header at line', i + 1);
    break;
  }
}

if (headerLine === -1) {
  console.log('ERROR: Could not find header row');
  process.exit(1);
}

// Count rows with scientific notation
let totalRows = 0;
let accountsWithScientific = 0;
let phonesWithScientific = 0;

const headers = lines[headerLine].split(',');
const accountNumIndex = headers.findIndex(h => h.includes('Account Number'));
const phoneIndex = headers.findIndex(h => h.includes('Mobile Phone'));

console.log('Account Number column index:', accountNumIndex);
console.log('Mobile Phone column index:', phoneIndex);
console.log('');

for (let i = headerLine + 1; i < lines.length; i++) {
  if (!lines[i].trim()) continue;
  
  const fields = lines[i].split(',');
  if (fields.length < accountNumIndex) continue;
  
  totalRows++;
  
  const accountNum = fields[accountNumIndex] || '';
  const phone = fields[phoneIndex] || '';
  
  // Check for scientific notation (E+ or e+)
  if (/[eE][+-]?\d+/.test(accountNum)) {
    accountsWithScientific++;
    if (accountsWithScientific <= 5) {
      console.log(`Example ${accountsWithScientific}: Account Number = "${accountNum}"`);
    }
  }
  
  if (/[eE][+-]?\d+/.test(phone)) {
    phonesWithScientific++;
  }
}

console.log('');
console.log('=== RESULTS ===');
console.log('Total data rows:', totalRows);
console.log('');
console.log('❌ Accounts with scientific notation:', accountsWithScientific, `(${Math.round(accountsWithScientific/totalRows*100)}%)`);
console.log('❌ Phone numbers with scientific notation:', phonesWithScientific, `(${Math.round(phonesWithScientific/totalRows*100)}%)`);
console.log('');

if (accountsWithScientific > 0) {
  console.log('🛑 THIS FILE WILL FAIL TO IMPORT!');
  console.log('');
  console.log('HOW TO FIX:');
  console.log('1. Open the source file in Excel');
  console.log('2. Select the "Account Number" column');
  console.log('3. Format → Cells → Number → Text (or Custom: 0)');
  console.log('4. Select the "Mobile Phone Number" column');
  console.log('5. Format → Cells → Number → Text');
  console.log('6. Save as CSV again');
  console.log('');
  console.log('OR use "Import from Text" wizard in Excel:');
  console.log('- Set Account Number and Phone columns to TEXT format during import');
} else {
  console.log('✓ File is ready for import!');
}
