const fs = require('fs');

const csvPath = 'C:\\Users\\Ebenezerbj\\Desktop\\Latest_Acc.csv';

console.log('=== AVAILABLE CSV COLUMNS ===\n');

const content = fs.readFileSync(csvPath, 'utf-8');
const lines = content.split('\n');

// Find header row
let headerLine = -1;
let headers = [];
for (let i = 0; i < Math.min(10, lines.length); i++) {
  const fields = lines[i].split(',').map(f => f.trim());
  if (fields.some(h => h.includes('Account Number'))) {
    headerLine = i;
    headers = fields;
    break;
  }
}

console.log(`Total columns: ${headers.length}\n`);
console.log('Column list:\n');
headers.forEach((col, index) => {
  console.log(`  [${index.toString().padStart(2)}] ${col}`);
});

console.log('\n' + '='.repeat(80) + '\n');

// Sample first 3 data rows
console.log('Sample data (first 3 rows):\n');
for (let i = headerLine + 1; i <= headerLine + 3 && i < lines.length; i++) {
  const fields = lines[i].split(',').map(f => f.trim());
  console.log(`Row ${i - headerLine}:`);
  headers.forEach((col, index) => {
    if (fields[index] && col) {
      console.log(`  ${col}: "${fields[index]}"`);
    }
  });
  console.log();
}

console.log('='.repeat(80) + '\n');

// Categorize fields
console.log('FIELD CATEGORIZATION:\n');

const identification = ['Bank Specific CIN', 'Customer Type', 'ID Type', 'ID Number', 'DOB'];
const names = ['Title', 'First Name', 'Middle Name', 'Surname', 'Company Name'];
const contact = ['Mobile Phone Number', 'Email', 'Home Address', 'Postal Address'];
const location = ['Country', 'Account Branch'];
const account = ['Account Number', 'Account Type', 'Product Name', 'Status Of Account', 'Currency Of Account', 'Account Balance'];
const other = ['Gender', 'Exchange Rate'];

console.log('📋 Identification:');
identification.forEach(field => {
  const found = headers.includes(field);
  console.log(`  ${found ? '✓' : '✗'} ${field}`);
});

console.log('\n👤 Name Components:');
names.forEach(field => {
  const found = headers.includes(field);
  console.log(`  ${found ? '✓' : '✗'} ${field}`);
});

console.log('\n📞 Contact Information:');
contact.forEach(field => {
  const found = headers.includes(field);
  console.log(`  ${found ? '✓' : '✗'} ${field}`);
});

console.log('\n📍 Location:');
location.forEach(field => {
  const found = headers.includes(field);
  console.log(`  ${found ? '✓' : '✗'} ${field}`);
});

console.log('\n💰 Account Details:');
account.forEach(field => {
  const found = headers.includes(field);
  console.log(`  ${found ? '✓' : '✗'} ${field}`);
});

console.log('\n📊 Other:');
other.forEach(field => {
  const found = headers.includes(field);
  console.log(`  ${found ? '✓' : '✗'} ${field}`);
});
