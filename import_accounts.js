/**
 * Import Accounts from CSV to Database
 * Populates customers, account_balances, and transactions tables
 */

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function importAccounts() {
  console.log('='.repeat(50));
  console.log('AKCB Accounts Import');
  console.log('='.repeat(50));

  // Connect to database
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'akcb_bank',
    port: process.env.DB_PORT || 3306
  });

  console.log('[1/5] Connected to database');

  // Clear existing data
  console.log('[2/5] Clearing existing data...');
  await connection.execute('DELETE FROM transactions');
  await connection.execute('DELETE FROM account_balances');
  await connection.execute('DELETE FROM customers');
  console.log('      Tables cleared');

  // Read CSV file
  console.log('[3/5] Reading CSV file...');
  const csvPath = path.join(__dirname, 'Accounts.csv');
  const csvData = fs.readFileSync(csvPath, 'utf-8');
  const lines = csvData.split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  
  console.log(`      Found ${lines.length - 1} accounts`);

  // Parse CSV and insert data
  console.log('[4/5] Importing accounts...');
  let successCount = 0;
  let skipCount = 0;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Parse CSV line (handle commas in quoted fields)
    const values = parseCSVLine(line);
    
    // Debug first few rows
    if (i <= 3) {
      console.log(`      Row ${i}: ${values.length} columns, Account: ${values[0]}`);
    }
    
    if (values.length < 22) {
      if (i <= 3) {
        console.log(`      SKIPPED: Only ${values.length} columns (need 22)`);
      }
      skipCount++;
      continue;
    }

    const accountNumber = values[0];
    const customerType = values[1];
    const title = values[2];
    const firstName = values[3];
    const middleName = values[4];
    const surname = values[5];
    const gender = values[6];
    const idType = values[7];
    const idNumber = values[8];
    const dob = values[9];
    const homeAddress = values[10];
    const postalAddress = values[11];
    const country = values[12];
    const email = values[13];
    const mobilePhone = values[14];
    const accountType = values[15];
    const accountByOwnership = values[16];
    const productName = values[17];
    const status = values[18];
    const branch = values[19];
    const currency = values[20];
    const balance = values[21];

    // Skip if no account number or invalid
    if (!accountNumber || accountNumber.length < 10) {
      skipCount++;
      continue;
    }

    // Build customer name
    let accountName = '';
    if (customerType === 'Corporate') {
      accountName = firstName || surname || 'Corporate Account';
    } else {
      const parts = [firstName, middleName, surname].filter(p => p && p.trim());
      accountName = parts.join(' ') || 'Unknown Customer';
    }

    // Clean phone number (remove spaces, keep all digits)
    let cleanPhone = (mobilePhone || '').replace(/\s+/g, '').replace(/\D/g, '');
    
    // Format phone number to Ghana standard
    if (cleanPhone) {
      // Remove leading + if present
      if (cleanPhone.startsWith('+')) cleanPhone = cleanPhone.substring(1);
      
      // If starts with 233, keep as is (international format)
      // If starts with 0, keep as is (local format)
      // Otherwise, add 0 prefix
      if (!cleanPhone.startsWith('233') && !cleanPhone.startsWith('0')) {
        cleanPhone = '0' + cleanPhone;
      }
    }
    
    // If no valid phone, use placeholder
    if (!cleanPhone || cleanPhone.length < 10) {
      cleanPhone = '0200000000'; // Placeholder
    }

    // Parse date of birth
    let dateOfBirth = null;
    if (dob) {
      dateOfBirth = parseDateString(dob);
    }

    // Parse balance
    let accountBalance = 0;
    if (balance) {
      accountBalance = parseFloat(balance.replace(/,/g, '')) || 0;
    }

    // Determine account status
    let accountStatus = 'Active';
    if (status && status.toLowerCase().includes('dormant')) {
      accountStatus = 'Dormant';
    } else if (status && status.toLowerCase().includes('closed')) {
      accountStatus = 'Closed';
    }

    try {
      // Insert into customers table
      await connection.execute(
        `INSERT INTO customers (
          account_number, account_name, phone_number, date_of_birth,
          email, account_type, branch_code, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
        ON DUPLICATE KEY UPDATE
          account_name = VALUES(account_name),
          phone_number = VALUES(phone_number)`,
        [
          accountNumber,
          accountName.substring(0, 100),
          cleanPhone,
          dateOfBirth,
          email || null,
          accountType || 'Current Account',
          branch || 'Unknown',
          accountStatus
        ]
      );

      // Insert into account_balances table
      await connection.execute(
        `INSERT INTO account_balances (
          account_number, ledger_balance, available_balance, currency, last_updated
        ) VALUES (?, ?, ?, ?, NOW())
        ON DUPLICATE KEY UPDATE
          ledger_balance = VALUES(ledger_balance),
          available_balance = VALUES(available_balance),
          last_updated = NOW()`,
        [
          accountNumber,
          accountBalance,
          accountBalance, // Same as ledger for now
          currency || 'GHS'
        ]
      );

      // Insert a sample opening balance transaction
      if (accountBalance > 0) {
        await connection.execute(
          `INSERT INTO transactions (
            account_number, transaction_date, description,
            credit_amount, debit_amount, balance_after, reference_number
          ) VALUES (?, CURDATE(), ?, ?, 0, ?, ?)`,
          [
            accountNumber,
            'Opening Balance',
            accountBalance,
            accountBalance,
            `OB${accountNumber}`
          ]
        );
      }

      successCount++;
      if (successCount % 100 === 0) {
        console.log(`      Processed ${successCount} accounts...`);
      }
    } catch (error) {
      // Log first few errors
      if (skipCount < 3) {
        console.log(`      ERROR on account ${accountNumber}: ${error.message}`);
      }
      skipCount++;
    }
  }

  console.log('[5/5] Import complete!');
  console.log('');
  console.log('Summary:');
  console.log(`  Successfully imported: ${successCount} accounts`);
  console.log(`  Skipped/Errors: ${skipCount}`);
  console.log('');

  // Show sample data
  const [sampleCustomers] = await connection.execute(
    'SELECT account_number, account_name, phone_number, status FROM customers LIMIT 5'
  );
  console.log('Sample accounts:');
  console.table(sampleCustomers);

  await connection.end();
  console.log('');
  console.log('Database connection closed.');
  console.log('='.repeat(50));
}

/**
 * Parse CSV line handling quoted fields with commas
 */
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}

/**
 * Parse date string in various formats to MySQL date format
 */
function parseDateString(dateStr) {
  if (!dateStr || dateStr.trim() === '') return null;
  
  // Try DD/MM/YYYY format (common in the CSV)
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    const day = parts[0].padStart(2, '0');
    const month = parts[1].padStart(2, '0');
    const year = parts[2];
    
    // Validate
    const d = parseInt(day);
    const m = parseInt(month);
    const y = parseInt(year);
    
    if (d > 0 && d <= 31 && m > 0 && m <= 12 && y > 1900 && y < 2100) {
      return `${year}-${month}-${day}`;
    }
  }
  
  return null;
}

// Run import
importAccounts()
  .then(() => {
    console.log('✓ Import completed successfully!');
    process.exit(0);
  })
  .catch(error => {
    console.error('✗ Import failed:', error.message);
    process.exit(1);
  });
