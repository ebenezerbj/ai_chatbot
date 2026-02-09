/**
 * FAST Import CustomerBook.csv into Render PostgreSQL
 * Uses multi-row VALUES inserts for 10-50x faster processing
 * 
 * Usage: node import_customerbook_fast.js
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const DATABASE_URL = process.env.DATABASE_URL || 
  'postgresql://akcb_bank_user:IlcndVR943byznoByTRzN1zBQS3gB9lI@dpg-d4u410ali9vc73am148g-a.oregon-postgres.render.com/akcb_bank';

const BATCH_SIZE = 100; // rows per multi-row INSERT
const CSV_FILE = path.join(__dirname, 'CustomerBook.csv');

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') { inQuotes = !inQuotes; }
    else if (char === ',' && !inQuotes) { result.push(current.trim()); current = ''; }
    else { current += char; }
  }
  result.push(current.trim());
  return result;
}

function parseDateString(dateStr) {
  if (!dateStr || dateStr.trim() === '') return null;
  const match = dateStr.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (match) {
    const day = match[1].padStart(2, '0');
    const month = match[2].padStart(2, '0');
    const year = match[3];
    if (parseInt(month) >= 1 && parseInt(month) <= 12 && parseInt(day) >= 1 && parseInt(day) <= 31) {
      return `${year}-${month}-${day}`;
    }
  }
  return null;
}

function cleanPhoneNumber(phone) {
  if (!phone) return null;
  let clean = phone.replace(/\s+/g, '').replace(/[^\d+]/g, '');
  if (clean.startsWith('+')) clean = clean.substring(1);
  if (clean.length < 9) return null;
  if (clean.startsWith('233') && clean.length >= 12) return clean;
  if (clean.startsWith('0') && clean.length >= 10) return '233' + clean.substring(1);
  if (clean.length === 9) return '233' + clean;
  return clean;
}

function buildAccountName(customerType, firstName, middleName, surname, companyName) {
  if (customerType === 'Corporate') return companyName || firstName || surname || 'Corporate Account';
  const parts = [firstName, middleName, surname].filter(p => p && p.trim());
  return parts.join(' ') || 'Unknown Customer';
}

function mapStatus(csvStatus) {
  if (!csvStatus) return 'Active';
  const lower = csvStatus.toLowerCase();
  if (lower.includes('dormant')) return 'Dormant';
  if (lower.includes('closed')) return 'Closed';
  if (lower.includes('frozen')) return 'Frozen';
  return 'Active';
}

// Escape a value for safe use in SQL
function sqlVal(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
  if (typeof val === 'number') return String(val);
  // Escape single quotes
  return `'${String(val).replace(/'/g, "''")}'`;
}

async function importCustomerBookFast() {
  console.log('═'.repeat(60));
  console.log('  AKCB CustomerBook FAST Import to Render PostgreSQL');
  console.log('═'.repeat(60));
  console.log('');

  if (!fs.existsSync(CSV_FILE)) {
    console.error(`❌ CSV file not found: ${CSV_FILE}`);
    process.exit(1);
  }

  console.log('[1/5] Connecting to Render PostgreSQL...');
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 5,
    statement_timeout: 120000 // 2 min per statement
  });

  try {
    await pool.query('SELECT 1');
    console.log('  ✓ Connected successfully\n');

    const beforeCount = await pool.query('SELECT COUNT(*) FROM customers');
    console.log(`  Current customers in DB: ${beforeCount.rows[0].count}\n`);

    // Read and parse CSV
    console.log('[2/5] Reading CustomerBook.csv...');
    const csvData = fs.readFileSync(CSV_FILE, 'utf-8');
    const lines = csvData.split('\n');
    console.log(`  Data rows: ${lines.length - 1}\n`);

    // Parse all records
    console.log('[3/5] Parsing records...');
    const records = [];
    let parseErrors = 0;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const v = parseCSVLine(line);
      if (v.length < 24) { parseErrors++; continue; }

      const accountNumber = v[23];
      if (!accountNumber || accountNumber.length < 10) { parseErrors++; continue; }

      const customerType = v[1];
      const firstName = v[3];
      const middleName = v[4];
      const surname = v[5];
      const companyName = v[7];
      const mobilePhone = v[18];
      const mainPhone = v[17];
      const mobileMoneyNumber = v[19];

      records.push({
        accountNumber,
        accountName: buildAccountName(customerType, firstName, middleName, surname, companyName).substring(0, 100),
        customerId: v[0] || null,
        customerType: customerType || null,
        title: v[2] || null,
        firstName: firstName || null,
        middleName: middleName || null,
        surname: surname || null,
        previousName: v[6] || null,
        companyName: companyName || null,
        gender: v[8] || null,
        idType: v[9] || null,
        idNumber: v[10] || null,
        dateOfBirth: parseDateString(v[12]),
        homeAddress: v[13] || null,
        postalAddress: v[14] || null,
        country: v[15] || 'Ghana',
        email: v[16] || null,
        phone: cleanPhoneNumber(mobilePhone) || cleanPhoneNumber(mainPhone) || cleanPhoneNumber(mobileMoneyNumber),
        mobilePhone: cleanPhoneNumber(mobilePhone) || null,
        pepStatus: v[20] === 'Yes',
        accountType: v[21] || 'Savings',
        accountOwnership: v[22] || null,
        productName: v[24] || null,
        status: mapStatus(v[25]),
        accountStatus: v[25] || 'Active',
        exclusionType: v[26] || null,
        branchName: v[27] || null,
        branchCode: v[27] || null,
        currency: v.length > 30 ? (v[30] || 'GHS') : 'GHS',
        exchangeRate: v.length > 32 ? (parseFloat((v[32] || '1').replace(/,/g, '')) || 1.0) : 1.0
      });
    }

    console.log(`  Parsed: ${records.length} valid records`);
    console.log(`  Parse errors/skipped: ${parseErrors}\n`);

    // Create temporary table, bulk insert, then merge
    console.log('[4/5] Bulk importing via temp table strategy...');
    const startTime = Date.now();

    // Step 1: Create temp table
    console.log('  Creating temp table...');
    await pool.query(`
      CREATE TEMP TABLE IF NOT EXISTS customer_import (
        account_number VARCHAR(20),
        account_name VARCHAR(100),
        customer_id VARCHAR(20),
        customer_type VARCHAR(20),
        title VARCHAR(10),
        first_name VARCHAR(50),
        middle_name VARCHAR(50),
        surname VARCHAR(50),
        previous_name VARCHAR(100),
        company_name VARCHAR(150),
        gender VARCHAR(10),
        id_type VARCHAR(30),
        id_number VARCHAR(50),
        date_of_birth DATE,
        home_address TEXT,
        postal_address VARCHAR(150),
        country VARCHAR(50),
        email VARCHAR(100),
        phone_number VARCHAR(20),
        mobile_phone VARCHAR(20),
        pep_status BOOLEAN,
        account_type VARCHAR(50),
        account_ownership VARCHAR(30),
        product_name VARCHAR(100),
        status VARCHAR(20),
        account_status VARCHAR(20),
        exclusion_type VARCHAR(50),
        branch_name VARCHAR(100),
        branch_code VARCHAR(100),
        currency VARCHAR(3),
        exchange_rate DECIMAL(10,4)
      )
    `);
    await pool.query('TRUNCATE customer_import');
    console.log('  ✓ Temp table ready\n');

    // Step 2: Bulk insert into temp table using multi-row VALUES
    console.log(`  Inserting ${records.length} rows into temp table...`);
    let totalInserted = 0;

    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      const batch = records.slice(i, i + BATCH_SIZE);
      
      const valueClauses = batch.map(r => {
        return `(${sqlVal(r.accountNumber)}, ${sqlVal(r.accountName)}, ${sqlVal(r.customerId)}, 
          ${sqlVal(r.customerType)}, ${sqlVal(r.title)}, ${sqlVal(r.firstName)}, ${sqlVal(r.middleName)}, 
          ${sqlVal(r.surname)}, ${sqlVal(r.previousName)}, ${sqlVal(r.companyName)}, ${sqlVal(r.gender)}, 
          ${sqlVal(r.idType)}, ${sqlVal(r.idNumber)}, ${sqlVal(r.dateOfBirth)}, ${sqlVal(r.homeAddress)}, 
          ${sqlVal(r.postalAddress)}, ${sqlVal(r.country)}, ${sqlVal(r.email)}, ${sqlVal(r.phone)}, 
          ${sqlVal(r.mobilePhone)}, ${sqlVal(r.pepStatus)}, ${sqlVal(r.accountType)}, ${sqlVal(r.accountOwnership)}, 
          ${sqlVal(r.productName)}, ${sqlVal(r.status)}, ${sqlVal(r.accountStatus)}, ${sqlVal(r.exclusionType)}, 
          ${sqlVal(r.branchName)}, ${sqlVal(r.branchCode)}, ${sqlVal(r.currency)}, ${sqlVal(r.exchangeRate)})`;
      }).join(',\n');

      const insertSQL = `INSERT INTO customer_import (
        account_number, account_name, customer_id, customer_type, title, first_name, middle_name,
        surname, previous_name, company_name, gender, id_type, id_number, date_of_birth,
        home_address, postal_address, country, email, phone_number, mobile_phone, pep_status,
        account_type, account_ownership, product_name, status, account_status, exclusion_type,
        branch_name, branch_code, currency, exchange_rate
      ) VALUES ${valueClauses}`;

      try {
        await pool.query(insertSQL);
        totalInserted += batch.length;
      } catch (err) {
        // If batch fails, try one by one
        console.error(`\n  Batch at ${i} failed: ${err.message.substring(0, 100)}`);
        for (const r of batch) {
          try {
            await pool.query(`INSERT INTO customer_import (
              account_number, account_name, customer_id, customer_type, title, first_name, middle_name,
              surname, previous_name, company_name, gender, id_type, id_number, date_of_birth,
              home_address, postal_address, country, email, phone_number, mobile_phone, pep_status,
              account_type, account_ownership, product_name, status, account_status, exclusion_type,
              branch_name, branch_code, currency, exchange_rate
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31)`,
            [r.accountNumber, r.accountName, r.customerId, r.customerType, r.title, r.firstName, r.middleName,
             r.surname, r.previousName, r.companyName, r.gender, r.idType, r.idNumber, r.dateOfBirth,
             r.homeAddress, r.postalAddress, r.country, r.email, r.phone, r.mobilePhone, r.pepStatus,
             r.accountType, r.accountOwnership, r.productName, r.status, r.accountStatus, r.exclusionType,
             r.branchName, r.branchCode, r.currency, r.exchangeRate]);
            totalInserted++;
          } catch (e2) {
            // skip individual bad records
          }
        }
      }

      const percent = ((Math.min(i + BATCH_SIZE, records.length) / records.length) * 100).toFixed(1);
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
      process.stdout.write(`\r  Temp insert: ${Math.min(i + BATCH_SIZE, records.length)}/${records.length} (${percent}%) - ${elapsed}s    `);
    }
    console.log(`\n  ✓ Inserted ${totalInserted} rows into temp table\n`);

    // Step 3: Merge from temp table to customers table
    console.log('  Merging into customers table (upsert)...');
    const mergeResult = await pool.query(`
      INSERT INTO customers (
        account_number, account_name, phone_number, email, date_of_birth,
        account_type, branch_code, status,
        customer_id, customer_type, title, first_name, middle_name, surname,
        previous_name, company_name, gender, id_type, id_number,
        home_address, postal_address, country, mobile_phone, pep_status,
        account_ownership, product_name, account_status, exclusion_type,
        branch_name, currency, exchange_rate,
        created_at, updated_at
      )
      SELECT 
        ci.account_number, ci.account_name, ci.phone_number, ci.email, ci.date_of_birth,
        ci.account_type, ci.branch_code, ci.status,
        ci.customer_id, ci.customer_type, ci.title, ci.first_name, ci.middle_name, ci.surname,
        ci.previous_name, ci.company_name, ci.gender, ci.id_type, ci.id_number,
        ci.home_address, ci.postal_address, ci.country, ci.mobile_phone, ci.pep_status,
        ci.account_ownership, ci.product_name, ci.account_status, ci.exclusion_type,
        ci.branch_name, ci.currency, ci.exchange_rate,
        NOW(), NOW()
      FROM customer_import ci
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
    `);
    console.log(`  ✓ Merge complete: ${mergeResult.rowCount} rows affected\n`);

    // Step 4: Update account_balances for new accounts
    console.log('  Updating account_balances for new accounts...');
    const balanceResult = await pool.query(`
      INSERT INTO account_balances (account_number, ledger_balance, available_balance, currency, last_updated)
      SELECT ci.account_number, 0.00, 0.00, ci.currency, NOW()
      FROM customer_import ci
      WHERE NOT EXISTS (
        SELECT 1 FROM account_balances ab WHERE ab.account_number = ci.account_number
      )
      ON CONFLICT (account_number) DO NOTHING
    `);
    console.log(`  ✓ New balance records added: ${balanceResult.rowCount}\n`);

    // Drop temp table
    await pool.query('DROP TABLE IF EXISTS customer_import');

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`  Total import time: ${totalTime}s\n`);

    // Verify
    console.log('[5/5] Verifying results...');
    const afterCustomers = await pool.query('SELECT COUNT(*) FROM customers');
    const afterBalances = await pool.query('SELECT COUNT(*) FROM account_balances');
    
    const prevCount = parseInt(beforeCount.rows[0].count);
    const newCount = parseInt(afterCustomers.rows[0].count);

    console.log(`  Customers before:  ${prevCount}`);
    console.log(`  Customers after:   ${newCount}`);
    console.log(`  Net change:        ${newCount >= prevCount ? '+' : ''}${newCount - prevCount}`);
    console.log(`  Balances:          ${afterBalances.rows[0].count}`);
    console.log('');

    // Show sample
    const sample = await pool.query(`
      SELECT account_number, account_name, phone_number, account_type, status, branch_name 
      FROM customers 
      ORDER BY updated_at DESC 
      LIMIT 5
    `);
    console.log('Sample updated records:');
    console.table(sample.rows);

    console.log('\n✅ CustomerBook FAST import completed successfully!');

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

importCustomerBookFast();
