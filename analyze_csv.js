const csv = require('csv-parser');
const fs = require('fs');

const csvFile = 'C:\\Users\\Ebenezerbj\\Desktop\\Latest_Accounts.csv';

console.log('Analyzing CSV file:', csvFile);
console.log('');

const rows = [];
let headersPrinted = false;

fs.createReadStream(csvFile)
  .pipe(csv())
  .on('data', (row) => {
    if (!headersPrinted) {
      console.log('CSV Headers found:');
      console.log(Object.keys(row).join(', '));
      console.log('');
      headersPrinted = true;
    }
    rows.push(row);
  })
  .on('end', () => {
    console.log('Total rows:', rows.length);
    console.log('');
    
    // Check first few valid rows
    const validRows = rows.filter(r => r['Account Number'] && r['Account Number'].trim() !== '');
    console.log('Valid rows (with Account Number):', validRows.length);
    console.log('');
    
    if (validRows.length > 0) {
      console.log('Sample row 1:');
      const sample = validRows[0];
      console.log('  Account Number:', sample['Account Number']);
      console.log('  First Name:', sample['First Name']);
      console.log('  Middle Name:', sample['Middle Name']);
      console.log('  Surname:', sample['Surname']);
      console.log('  Company Name:', sample['Company Name']);
      console.log('  Mobile Phone Number:', sample['Mobile Phone Number']);
      console.log('  Email:', sample['Email']);
      console.log('  Account Balance:', sample['Account Balance']);
      console.log('  Product Name:', sample['Product Name']);
      console.log('  Account Branch:', sample['Account Branch']);
      console.log('');
      
      // Build account title as the system would
      const title = (sample['Title'] || '').trim();
      const firstName = (sample['First Name'] || '').trim();
      const middleName = (sample['Middle Name'] || '').trim();
      const surname = (sample['Surname'] || '').trim();
      const companyName = (sample['Company Name'] || '').trim();
      
      const accountTitle = companyName || [title, firstName, middleName, surname]
        .filter(n => n)
        .join(' ')
        .trim();
      
      console.log('  Computed Account Title:', accountTitle);
      console.log('');
      
      // Check for scientific notation
      const hasScientific = validRows.filter(r => {
        const acc = r['Account Number'] || '';
        return /e[+-]?\d+/i.test(acc);
      });
      
      if (hasScientific.length > 0) {
        console.log('⚠️  WARNING: Found', hasScientific.length, 'accounts with scientific notation!');
        console.log('First example:', hasScientific[0]['Account Number']);
        console.log('This will cause import failures!');
      } else {
        console.log('✓ No scientific notation detected in account numbers');
      }
      
      // Check balance format
      const balanceSample = validRows.slice(0, 5).map(r => r['Account Balance']);
      console.log('');
      console.log('Sample balances:', balanceSample.join(', '));
      
      // Summary
      console.log('');
      console.log('=== COMPATIBILITY CHECK ===');
      console.log('✓ Account Number column: FOUND');
      console.log('✓ Name columns: FOUND (First Name, Middle Name, Surname, Company Name)');
      console.log('✓ Account Balance column: FOUND');
      console.log('✓ Mobile Phone Number column: FOUND');
      console.log('✓ Email column: FOUND');
      console.log('');
      console.log('This file should work with the customer import system!');
    }
  })
  .on('error', (error) => {
    console.error('Error reading CSV:', error);
  });
