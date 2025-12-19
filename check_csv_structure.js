const fs = require('fs');

const csvFile = 'C:\\Users\\Ebenezerbj\\Desktop\\Latest_Accounts.csv';
const lines = fs.readFileSync(csvFile, 'utf8').split('\n');

console.log('First 10 lines of CSV:');
console.log('================');
for (let i = 0; i < Math.min(10, lines.length); i++) {
  console.log(`Line ${i + 1}: ${lines[i].substring(0, 150)}...`);
}

// Find the header row
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('Account Number') && lines[i].includes('First Name')) {
    console.log('');
    console.log('✓ Found header row at line', i + 1);
    console.log('Headers:', lines[i]);
    console.log('');
    console.log('First data row (line', i + 2, '):');
    console.log(lines[i + 1].substring(0, 200));
    break;
  }
}
