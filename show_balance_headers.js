const fs = require('fs');

const csvPath = 'C:\\Users\\Ebenezerbj\\Desktop\\R20_CUSTOMER_BAL_AKF18.csv';

console.log('=== BALANCE CSV COLUMN HEADERS ===\n');

const content = fs.readFileSync(csvPath, 'utf-8');
const lines = content.split('\n');

// Get first line (header)
const headerLine = lines[0];
console.log('Raw header line:');
console.log(headerLine);
console.log('\n' + '='.repeat(80) + '\n');

// Parse columns
const columns = headerLine.split(',').map(c => c.trim());

console.log(`Total columns: ${columns.length}\n`);
console.log('Column breakdown:');
columns.forEach((col, index) => {
  console.log(`  [${index}] "${col}"`);
});

console.log('\n' + '='.repeat(80) + '\n');

// Show sample data from first 3 rows
console.log('Sample data (first 3 rows):\n');
for (let i = 1; i <= 3 && i < lines.length; i++) {
  const fields = lines[i].split(',').map(f => f.trim());
  console.log(`Row ${i}:`);
  columns.forEach((col, index) => {
    if (fields[index]) {
      console.log(`  ${col}: ${fields[index]}`);
    }
  });
  console.log();
}

console.log('='.repeat(80) + '\n');

// Check what our system expects
console.log('System compatibility check:\n');
console.log('Account Number column:');
const accCandidates = ['ACCOUNT.ID', 'ACCOUNT NUMBER', 'Account Number'];
accCandidates.forEach(candidate => {
  const found = columns.some(c => c.includes(candidate));
  console.log(`  "${candidate}": ${found ? '✅ FOUND' : '❌ not found'}`);
});

console.log('\nBalance column candidates:');
const balCandidates = [
  'WORKING.BALANCE',
  'ONLINE.CLEARED.BAL',
  'ONLINE.ACTUAL.BAL',
  'Account Balance',
  'Balance',
  'BALANCE'
];
balCandidates.forEach(candidate => {
  const found = columns.some(c => c.includes(candidate) || c.toUpperCase().includes(candidate.toUpperCase()));
  console.log(`  "${candidate}": ${found ? '✅ FOUND' : '❌ not found'}`);
});
