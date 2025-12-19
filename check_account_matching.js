const fs = require('fs');

const customerCsvPath = 'C:\\Users\\Ebenezerbj\\Desktop\\Latest_Acc.csv';
const balanceCsvPath = 'C:\\Users\\Ebenezerbj\\Desktop\\R20_CUSTOMER_BAL_AKF18.csv';

console.log('=== DETAILED ACCOUNT MATCHING ANALYSIS ===\n');

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
const customerAccountsRaw = [];
const customerAccountsNormalized = new Map(); // normalized -> original

for (let i = customerHeaderLine + 1; i < customerLines.length; i++) {
  if (!customerLines[i].trim()) continue;
  const fields = customerLines[i].split(',').map(f => f.trim());
  const acc = fields[customerAccIndex];
  if (acc && acc.length >= 13) {
    customerAccountsRaw.push(acc);
    // Normalize: remove all non-digits
    const normalized = acc.replace(/\D/g, '');
    if (!customerAccountsNormalized.has(normalized)) {
      customerAccountsNormalized.set(normalized, []);
    }
    customerAccountsNormalized.get(normalized).push(acc);
  }
}

console.log(`Customer file: ${customerAccountsRaw.length} accounts`);
console.log(`Customer file (unique normalized): ${customerAccountsNormalized.size} accounts\n`);

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
const balanceAccountsRaw = [];
const balanceAccountsNormalized = new Map(); // normalized -> original

for (let i = balanceHeaderLine + 1; i < balanceLines.length; i++) {
  if (!balanceLines[i].trim()) continue;
  const fields = balanceLines[i].split(',').map(f => f.trim());
  const acc = fields[balanceAccIndex];
  if (acc && acc.length >= 13) {
    balanceAccountsRaw.push(acc);
    const normalized = acc.replace(/\D/g, '');
    if (!balanceAccountsNormalized.has(normalized)) {
      balanceAccountsNormalized.set(normalized, []);
    }
    balanceAccountsNormalized.get(normalized).push(acc);
  }
}

console.log(`Balance file: ${balanceAccountsRaw.length} accounts`);
console.log(`Balance file (unique normalized): ${balanceAccountsNormalized.size} accounts\n`);

console.log('='.repeat(80) + '\n');

// Check for formatting differences
console.log('📋 SAMPLE ACCOUNT FORMATS:\n');
console.log('Customer file samples:');
customerAccountsRaw.slice(0, 5).forEach((acc, i) => {
  console.log(`  ${i + 1}. "${acc}" (length: ${acc.length}, digits: ${acc.replace(/\D/g, '').length})`);
});

console.log('\nBalance file samples:');
balanceAccountsRaw.slice(0, 5).forEach((acc, i) => {
  console.log(`  ${i + 1}. "${acc}" (length: ${acc.length}, digits: ${acc.replace(/\D/g, '').length})`);
});

console.log('\n' + '='.repeat(80) + '\n');

// Check for matches with normalization
const missingAfterNormalization = [];
const foundAfterNormalization = [];

for (const [normalized, originals] of balanceAccountsNormalized) {
  if (customerAccountsNormalized.has(normalized)) {
    foundAfterNormalization.push({
      balance: originals[0],
      customer: customerAccountsNormalized.get(normalized)[0],
      normalized
    });
  } else {
    missingAfterNormalization.push({
      balance: originals[0],
      normalized
    });
  }
}

console.log('🔍 MATCHING ANALYSIS (with normalization):\n');
console.log(`Accounts found in both files: ${foundAfterNormalization.length}`);
console.log(`Accounts ONLY in balance file: ${missingAfterNormalization.length}`);
console.log(`Accounts ONLY in customer file: ${customerAccountsNormalized.size - foundAfterNormalization.length}`);

console.log('\n' + '='.repeat(80) + '\n');

// Check if the missing accounts are truly missing or just formatted differently
console.log('❓ MISSING ACCOUNTS ANALYSIS:\n');
if (missingAfterNormalization.length > 0) {
  console.log(`First 10 accounts that are ONLY in balance file:\n`);
  missingAfterNormalization.slice(0, 10).forEach((item, i) => {
    console.log(`${i + 1}. ${item.balance} (normalized: ${item.normalized})`);
  });
  
  console.log('\n' + '='.repeat(80) + '\n');
  console.log('✅ CONCLUSION:\n');
  console.log(`These ${missingAfterNormalization.length} accounts are truly missing from the customer file.`);
  console.log('They will be AUTO-CREATED during balance upload with names from the CSV.');
} else {
  console.log('✅ All balance accounts exist in customer file!\n');
  console.log('The issue was just formatting differences, which normalization handles.');
}

// Check for formatting pattern differences
console.log('\n' + '='.repeat(80) + '\n');
console.log('📊 FORMAT COMPARISON:\n');

const customerHasSpaces = customerAccountsRaw.some(acc => acc.includes(' '));
const customerHasDashes = customerAccountsRaw.some(acc => acc.includes('-'));
const balanceHasSpaces = balanceAccountsRaw.some(acc => acc.includes(' '));
const balanceHasDashes = balanceAccountsRaw.some(acc => acc.includes('-'));

console.log(`Customer file has spaces: ${customerHasSpaces ? '✓' : '✗'}`);
console.log(`Customer file has dashes: ${customerHasDashes ? '✓' : '✗'}`);
console.log(`Balance file has spaces: ${balanceHasSpaces ? '✓' : '✗'}`);
console.log(`Balance file has dashes: ${balanceHasDashes ? '✓' : '✗'}`);

if (customerHasSpaces || customerHasDashes || balanceHasSpaces || balanceHasDashes) {
  console.log('\n⚠️  Files have different formatting. System normalizes to digits-only for matching.');
} else {
  console.log('\n✅ Both files use digits-only format (good!)');
}
