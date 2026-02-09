/**
 * Import CustomerBook.csv into Render PostgreSQL
 * 
 * Reads the CustomerBook.csv file and upserts customer data into the 
 * production Render PostgreSQL database. Updates existing records and
 * inserts new ones. Also updates account_balances table.
 * 
 * Usage: node import_customerbook.js
 * 
 * CSV Columns (CustomerBook.csv):
 *   0: Bank Specific CIN
 *   1: Customer Type
 *   2: Title
 *   3: First Name
 *   4: Middle Name
 *   5: Surname
 *   6: Previous Name
 *   7: Company Name
 *   8: Gender
 *   9: ID Type
 *  10: ID Number
 *  11: Company Number (If Any)
 *  12: DOB
 *  13: Home Address
 *  14: Postal Address
 *  15: Country
 *  16: Email
 *  17: Main Phone Number
 *  18: Mobile Phone Number
 *  19: Mobile Money Number
 *  20: Politically Exposed Person (Yes/No)
 *  21: Account Type
 *  22: Account By Ownership
 *  23: Account Number
 *  24: Product Name
 *  25: Status Of Account
 *  26: Exclusion Type
 *  27: Account Branch
 *  28: (empty)
 *  29: Auth. Negative Balance
 *  30: Currency Of Account
 *  31: (empty)
 *  32: Exchange Rate
 *  33: (empty)
 *  34: Deduct Overdue Loans
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Database URL - uses .env or falls back to the Render external URL
const DATABASE_URL = process.env.DATABASE_URL || 
  'postgresql://akcb_bank_user:IlcndVR943byznoByTRzN1zBQS3gB9lI@dpg-d4u410ali9vc73am148g-a.oregon-postgres.render.com/akcb_bank';

const BATCH_SIZE = 500;
const CSV_FILE = path.join(__dirname, 'CustomerBook.csv');

/**
 * Parse a CSV line handling quoted fields with commas
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
 * Parse date string in DD/MM/YYYY format to YYYY-MM-DD
 */
function parseDateString(dateStr) {
  if (!dateStr || dateStr.trim() === '') return null;
  
  const cleaned = dateStr.trim();
  
  // DD/MM/YYYY format
  const match = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (match) {
    const day = match[1].padStart(2, '0');
    const month = match[2].padStart(2, '0');
    const year = match[3];
    
    // Basic validation
    const monthNum = parseInt(month);
    const dayNum = parseInt(day);
    if (monthNum >= 1 && monthNum <= 12 && dayNum >= 1 && dayNum <= 31) {
      return `${year}-${month}-${day}`;
    }
  }
  
  return null;
}

/**
 * Clean and format phone number to Ghana standard
 */
function cleanPhoneNumber(phone) {
  if (!phone) return null;
  
  let clean = phone.replace(/\s+/g, '').replace(/[^\d+]/g, '');
  
  // Remove leading +
  if (clean.startsWith('+')) clean = clean.substring(1);
  
  // Must be at least 9 digits
  if (clean.length < 9) return null;
  
  // Already in international format (233...)
  if (clean.startsWith('233') && clean.length >= 12) {
    return clean;
  }
  
  // Local format starting with 0
  if (clean.startsWith('0') && clean.length >= 10) {
    return '233' + clean.substring(1);
  }
  
  // Assume Ghana number without prefix
  if (clean.length === 9) {
    return '233' + clean;
  }
  
  return clean;
}

/**
 * Build account name from customer data
 */
function buildAccountName(customerType, firstName, middleName, surname, companyName) {
  if (customerType === 'Corporate') {
    return companyName || firstName || surname || 'Corporate Account';
  }
  
  const parts = [firstName, middleName, surname].filter(p => p && p.trim());
  return parts.join(' ') || 'Unknown Customer';
}

/**
 * Map account status from CSV to database enum
 */
function mapStatus(csvStatus) {
  if (!csvStatus) return 'Active';
  const lower = csvStatus.toLowerCase();
  if (lower.includes('dormant')) return 'Dormant';
  if (lower.includes('closed')) return 'Closed';
  if (lower.includes('frozen')) return 'Frozen';
  return 'Active';
}

async function importCustomerBook() {
  console.log('═'.repeat(60));
  console.log('  AKCB CustomerBook Import to Render PostgreSQL');
  console.log('═'.repeat(60));
  console.log('');

  // Verify CSV file exists
  if (!fs.existsSync(CSV_FILE)) {
    console.error(`❌ CSV file not found: ${CSV_FILE}`);
    process.exit(1);
  }

  // Connect to database
  console.log('[1/5] Connecting to Render PostgreSQL...');
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 10
  });

  try {
    await pool.query('SELECT 1');
    console.log('  ✓ Connected successfully\n');

    // Get current counts
    const beforeCount = await pool.query('SELECT COUNT(*) FROM customers');
    console.log(`  Current customers in DB: ${beforeCount.rows[0].count}\n`);

    // Read and parse CSV
    console.log('[2/5] Reading CustomerBook.csv...');
    const csvData = fs.readFileSync(CSV_FILE, 'utf-8');
    const lines = csvData.split('\n');
    const headers = parseCSVLine(lines[0]);
    
    console.log(`  Header columns: ${headers.length}`);
    console.log(`  Data rows: ${lines.length - 1}\n`);

    // Parse all records
    console.log('[3/5] Parsing records...');
    const records = [];
    let parseErrors = 0;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = parseCSVLine(line);
      
      // Need at least 28 columns for valid data
      if (values.length < 24) {
        parseErrors++;
        continue;
      }

      const accountNumber = values[23]; // Account Number
      if (!accountNumber || accountNumber.length < 10) {
        parseErrors++;
        continue;
      }

      const customerId = values[0];   // Bank Specific CIN
      const customerType = values[1];  // Customer Type
      const title = values[2];         // Title
      const firstName = values[3];     // First Name
      const middleName = values[4];    // Middle Name
      const surname = values[5];       // Surname
      const previousName = values[6];  // Previous Name
      const companyName = values[7];   // Company Name
      const gender = values[8];        // Gender
      const idType = values[9];        // ID Type
      const idNumber = values[10];     // ID Number
      const dob = values[12];          // DOB
      const homeAddress = values[13];  // Home Address
      const postalAddress = values[14]; // Postal Address
      const country = values[15];      // Country
      const email = values[16];        // Email
      const mainPhone = values[17];    // Main Phone Number
      const mobilePhone = values[18];  // Mobile Phone Number
      const mobileMoneyNumber = values[19]; // Mobile Money Number
      const pepStatus = values[20];    // PEP
      const accountType = values[21];  // Account Type
      const accountOwnership = values[22]; // Account By Ownership
      const productName = values[24];  // Product Name
      const statusOfAccount = values[25]; // Status Of Account
      const exclusionType = values[26]; // Exclusion Type
      const accountBranch = values[27]; // Account Branch
      const currency = values.length > 30 ? values[30] : 'GHS'; // Currency
      const exchangeRate = values.length > 32 ? values[32] : '1.0000'; // Exchange Rate

      // Build account name
      const accountName = buildAccountName(customerType, firstName, middleName, surname, companyName);

      // Pick best phone number
      const phone = cleanPhoneNumber(mobilePhone) || cleanPhoneNumber(mainPhone) || cleanPhoneNumber(mobileMoneyNumber);

      // Parse DOB
      const dateOfBirth = parseDateString(dob);

      // Map status
      const status = mapStatus(statusOfAccount);

      records.push({
        accountNumber,
        accountName: accountName.substring(0, 100),
        customerId: customerId || null,
        customerType: customerType || null,
        title: title || null,
        firstName: firstName || null,
        middleName: middleName || null,
        surname: surname || null,
        previousName: previousName || null,
        companyName: companyName || null,
        gender: gender || null,
        idType: idType || null,
        idNumber: idNumber || null,
        dateOfBirth,
        homeAddress: homeAddress || null,
        postalAddress: postalAddress || null,
        country: country || 'Ghana',
        email: email || null,
        phone: phone || null,
        mobilePhone: cleanPhoneNumber(mobilePhone) || null,
        pepStatus: pepStatus === 'Yes',
        accountType: accountType || 'Savings',
        accountOwnership: accountOwnership || null,
        productName: productName || null,
        status,
        accountStatus: statusOfAccount || 'Active',
        exclusionType: exclusionType || null,
        branchName: accountBranch || null,
        branchCode: accountBranch || null,
        currency: currency || 'GHS',
        exchangeRate: parseFloat((exchangeRate || '1').replace(/,/g, '')) || 1.0
      });
    }

    console.log(`  Parsed: ${records.length} valid records`);
    console.log(`  Parse errors/skipped: ${parseErrors}\n`);

    // Upsert records in batches
    console.log(`[4/5] Importing ${records.length} records in batches of ${BATCH_SIZE}...`);
    let inserted = 0;
    let updated = 0;
    let errors = 0;
    const startTime = Date.now();

    for (let batch = 0; batch < records.length; batch += BATCH_SIZE) {
      const batchRecords = records.slice(batch, batch + BATCH_SIZE);
      
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        for (const rec of batchRecords) {
          try {
            // Upsert customer
            const result = await client.query(`
              INSERT INTO customers (
                account_number, account_name, phone_number, email, date_of_birth,
                account_type, branch_code, status,
                customer_id, customer_type, title, first_name, middle_name, surname,
                previous_name, company_name, gender, id_type, id_number,
                home_address, postal_address, country, mobile_phone, pep_status,
                account_ownership, product_name, account_status, exclusion_type,
                branch_name, currency, exchange_rate,
                created_at, updated_at
              ) VALUES (
                $1, $2, $3, $4, $5,
                $6, $7, $8,
                $9, $10, $11, $12, $13, $14,
                $15, $16, $17, $18, $19,
                $20, $21, $22, $23, $24,
                $25, $26, $27, $28,
                $29, $30, $31,
                NOW(), NOW()
              )
              ON CONFLICT (account_number) DO UPDATE SET
                account_name = EXCLUDED.account_name,
                phone_number = COALESCE(EXCLUDED.phone_number, customers.phone_number),
                email = COALESCE(EXCLUDED.email, customers.email),
                date_of_birth = COALESCE(EXCLUDED.date_of_birth, customers.date_of_birth),
                account_type = EXCLUDED.account_type,
                branch_code = EXCLUDED.branch_code,
                status = EXCLUDED.status,
                customer_id = COALESCE(EXCLUDED.customer_id, customers.customer_id),
                customer_type = EXCLUDED.customer_type,
                title = COALESCE(EXCLUDED.title, customers.title),
                first_name = COALESCE(EXCLUDED.first_name, customers.first_name),
                middle_name = COALESCE(EXCLUDED.middle_name, customers.middle_name),
                surname = COALESCE(EXCLUDED.surname, customers.surname),
                previous_name = COALESCE(EXCLUDED.previous_name, customers.previous_name),
                company_name = COALESCE(EXCLUDED.company_name, customers.company_name),
                gender = COALESCE(EXCLUDED.gender, customers.gender),
                id_type = COALESCE(EXCLUDED.id_type, customers.id_type),
                id_number = COALESCE(EXCLUDED.id_number, customers.id_number),
                home_address = COALESCE(EXCLUDED.home_address, customers.home_address),
                postal_address = COALESCE(EXCLUDED.postal_address, customers.postal_address),
                country = EXCLUDED.country,
                mobile_phone = COALESCE(EXCLUDED.mobile_phone, customers.mobile_phone),
                pep_status = EXCLUDED.pep_status,
                account_ownership = EXCLUDED.account_ownership,
                product_name = EXCLUDED.product_name,
                account_status = EXCLUDED.account_status,
                exclusion_type = EXCLUDED.exclusion_type,
                branch_name = EXCLUDED.branch_name,
                currency = EXCLUDED.currency,
                exchange_rate = EXCLUDED.exchange_rate,
                updated_at = NOW()
            `, [
              rec.accountNumber, rec.accountName, rec.phone, rec.email, rec.dateOfBirth,
              rec.accountType, rec.branchCode, rec.status,
              rec.customerId, rec.customerType, rec.title, rec.firstName, rec.middleName, rec.surname,
              rec.previousName, rec.companyName, rec.gender, rec.idType, rec.idNumber,
              rec.homeAddress, rec.postalAddress, rec.country, rec.mobilePhone, rec.pepStatus,
              rec.accountOwnership, rec.productName, rec.accountStatus, rec.exclusionType,
              rec.branchName, rec.currency, rec.exchangeRate
            ]);

            // Check if it was an insert or update
            // In PostgreSQL, xmax = 0 means INSERT, > 0 means UPDATE
            // But simpler: just count
            inserted++;

            // Also upsert account_balances (set 0 balance for new entries, keep existing for updates)
            await client.query(`
              INSERT INTO account_balances (account_number, ledger_balance, available_balance, currency, last_updated)
              VALUES ($1, 0.00, 0.00, $2, NOW())
              ON CONFLICT (account_number) DO UPDATE SET
                currency = EXCLUDED.currency,
                last_updated = NOW()
            `, [rec.accountNumber, rec.currency]);

          } catch (recError) {
            errors++;
            if (errors <= 5) {
              console.error(`  Error on account ${rec.accountNumber}: ${recError.message}`);
            }
          }
        }

        await client.query('COMMIT');
      } catch (batchError) {
        await client.query('ROLLBACK');
        console.error(`  Batch error at offset ${batch}: ${batchError.message}`);
        errors += batchRecords.length;
      } finally {
        client.release();
      }

      const processed = Math.min(batch + BATCH_SIZE, records.length);
      const percent = ((processed / records.length) * 100).toFixed(1);
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      process.stdout.write(`\r  Progress: ${processed}/${records.length} (${percent}%) - ${elapsed}s elapsed    `);
    }

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n  ✓ Import complete in ${totalTime}s\n`);

    // Verify final counts
    console.log('[5/5] Verifying results...');
    const afterCustomers = await pool.query('SELECT COUNT(*) FROM customers');
    const afterBalances = await pool.query('SELECT COUNT(*) FROM account_balances');
    
    const newCustomers = parseInt(afterCustomers.rows[0].count) - parseInt(beforeCount.rows[0].count);

    console.log(`  Customers before: ${beforeCount.rows[0].count}`);
    console.log(`  Customers after:  ${afterCustomers.rows[0].count}`);
    console.log(`  Net new:          ${newCustomers >= 0 ? '+' : ''}${newCustomers}`);
    console.log(`  Balances:         ${afterBalances.rows[0].count}`);
    console.log(`  Records processed: ${inserted}`);
    console.log(`  Errors:           ${errors}`);
    console.log('');

    // Show sample of updated records
    const sample = await pool.query(`
      SELECT account_number, account_name, phone_number, account_type, status, branch_name 
      FROM customers 
      ORDER BY updated_at DESC 
      LIMIT 5
    `);
    console.log('Sample updated records:');
    console.table(sample.rows);

    console.log('\n✅ CustomerBook import completed successfully!');

  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await pool.end();
    console.log('\nDatabase connection closed.');
    console.log('═'.repeat(60));
  }
}

importCustomerBook();
