const fs = require('fs');

const customerCsvPath = 'C:\\Users\\Ebenezerbj\\Desktop\\Latest_Acc.csv';
const balanceCsvPath = 'C:\\Users\\Ebenezerbj\\Desktop\\R20_CUSTOMER_BAL_AKF18.csv';

console.log('=== ACCOUNT MISMATCH CHECKER ===\n');

// Read customer accounts
const customerContent = fs.readFileSync(customerCsvPath, 'utf-8');
const customerLines = customerContent.split('\n');

let customerHeaderLine = -1;
let customerHeaders = [];
for (let i = 0; i < Math.min(10, customerLines.length); i++) {
  const fields = customerLines[i].split(',').map(f => f.trim());
  if (fields.some(h => h.includes('Account Number'))) {
    customerHeaderLine = i;
    customerHeaders = fields;
    break;
  }
}

const customerAccIndex = customerHeaders.findIndex(h => h.includes('Account Number'));
const customerAccounts = new Set();

for (let i = customerHeaderLine + 1; i < customerLines.length; i++) {
  if (!customerLines[i].trim()) continue;
  const fields = customerLines[i].split(',').map(f => f.trim());
  const acc = fields[customerAccIndex];
  if (acc && acc.length >= 13) {
    customerAccounts.add(acc);
  }
}

console.log(`✓ Customer file has ${customerAccounts.size} accounts\n`);

// Read balance accounts
const balanceContent = fs.readFileSync(balanceCsvPath, 'utf-8');
const balanceLines = balanceContent.split('\n');

let balanceHeaderLine = -1;
let balanceHeaders = [];
for (let i = 0; i < Math.min(10, balanceLines.length); i++) {
  const fields = balanceLines[i].split(',').map(f => f.trim());
  if (fields.some(h => h.includes('ACCOUNT NUMBER') || h.includes('Account Number'))) {
    balanceHeaderLine = i;
    balanceHeaders = fields;
    break;
  }
}

const balanceAccIndex = balanceHeaders.findIndex(h => h.includes('ACCOUNT NUMBER') || h.includes('Account Number'));
const balanceAccounts = new Set();
const missingAccounts = [];

for (let i = balanceHeaderLine + 1; i < balanceLines.length; i++) {
  if (!balanceLines[i].trim()) continue;
  const fields = balanceLines[i].split(',').map(f => f.trim());
  const acc = fields[balanceAccIndex];
  if (acc && acc.length >= 13) {
    balanceAccounts.add(acc);
    if (!customerAccounts.has(acc)) {
      const balanceValue = fields[5] || ''; // Account Balance column
      missingAccounts.push({ acc, balance: balanceValue });
    }
  }
}

console.log(`✓ Balance file has ${balanceAccounts.size} accounts\n`);

console.log('='.repeat(80));
console.log('\n📊 COMPARISON RESULTS:\n');

const commonAccounts = [...balanceAccounts].filter(acc => customerAccounts.has(acc));
console.log(`Accounts in BOTH files: ${commonAccounts.length}`);
console.log(`Accounts ONLY in balance file: ${missingAccounts.length}`);
console.log(`Accounts ONLY in customer file: ${[...customerAccounts].filter(acc => !balanceAccounts.has(acc)).length}`);

if (missingAccounts.length > 0) {
  console.log('\n' + '='.repeat(80));
  console.log('\n❌ ACCOUNTS IN BALANCE FILE BUT NOT IN CUSTOMER FILE:\n');
  console.log(`Total: ${missingAccounts.length} accounts\n`);
  
  missingAccounts.slice(0, 20).forEach((item, i) => {
    console.log(`${i + 1}. ${item.acc} → Balance: ${item.balance}`);
  });
  
  if (missingAccounts.length > 20) {
    console.log(`\n... and ${missingAccounts.length - 20} more`);
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('\n💡 SOLUTIONS:\n');
  console.log('Option 1: Upload these missing accounts to the customer table first');
  console.log('Option 2: Modify balance updater to skip accounts that don\'t exist');
  console.log('Option 3: Filter the balance CSV to only include accounts from customer file');
} else {
  console.log('\n✅ All balance accounts exist in customer file!');
}
