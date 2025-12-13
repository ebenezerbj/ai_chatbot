/**
 * Daily Balance Update Script
 * Updates account balances from CSV file exported from core banking system
 * 
 * Usage:
 *   Local MySQL:  node update_balances.js data/daily_balances.csv
 *   Render PG:    node update_balances.js data/daily_balances.csv "postgresql://..."
 */

const fs = require('fs');
const csv = require('csv-parser');
const mysql = require('mysql2/promise');
const { Pool } = require('pg');

// Parse command line arguments
const csvFilePath = process.argv[2];
const databaseUrl = process.argv[3];

if (!csvFilePath) {
  console.error('❌ Usage: node update_balances.js <csv_file> [database_url]');
  console.error('   Example: node update_balances.js data/daily_balances.csv');
  console.error('   Example: node update_balances.js data/daily_balances.csv "postgresql://..."');
  process.exit(1);
}

if (!fs.existsSync(csvFilePath)) {
  console.error(`❌ File not found: ${csvFilePath}`);
  process.exit(1);
}

// Determine database type
const isPostgres = !!databaseUrl;

// Database connection
let db;

async function connectDatabase() {
  if (isPostgres) {
    console.log('[DB] Connecting to PostgreSQL...');
    db = new Pool({
      connectionString: databaseUrl,
      ssl: { rejectUnauthorized: false }
    });
    await db.query('SELECT 1');
    console.log('✓ PostgreSQL connected\n');
  } else {
    console.log('[DB] Connecting to MySQL...');
    db = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'akcb_bank'
    });
    console.log('✓ MySQL connected\n');
  }
}

async function executeQuery(query, params) {
  if (isPostgres) {
    // Convert ? to $1, $2, etc.
    let pgQuery = query;
    let paramIndex = 1;
    pgQuery = pgQuery.replace(/\?/g, () => `$${paramIndex++}`);
    return await db.query(pgQuery, params);
  } else {
    return await db.execute(query, params);
  }
}

async function updateBalance(accountNumber, ledgerBalance, availableBalance) {
  const query = `
    UPDATE account_balances 
    SET 
      ledger_balance = ?,
      available_balance = ?,
      last_updated = CURRENT_TIMESTAMP
    WHERE account_number = ?`;
  
  return await executeQuery(query, [ledgerBalance, availableBalance, accountNumber]);
}

async function insertBalance(accountNumber, ledgerBalance, availableBalance) {
  const query = `
    INSERT INTO account_balances (account_number, ledger_balance, available_balance, currency)
    VALUES (?, ?, ?, 'GHS')
    ${isPostgres ? 'ON CONFLICT (account_number) DO UPDATE SET ledger_balance = EXCLUDED.ledger_balance, available_balance = EXCLUDED.available_balance, last_updated = CURRENT_TIMESTAMP' : 'ON DUPLICATE KEY UPDATE ledger_balance = VALUES(ledger_balance), available_balance = VALUES(available_balance), last_updated = CURRENT_TIMESTAMP'}`;
  
  return await executeQuery(query, [accountNumber, ledgerBalance, availableBalance]);
}

async function processCSV() {
  const updates = [];
  
  return new Promise((resolve, reject) => {
    fs.createReadStream(csvFilePath)
      .pipe(csv())
      .on('data', (row) => {
        // Flexible field mapping - adjust based on your CSV format
        const accountNumber = row['Account Number'] || row['account_number'] || row['AccountNumber'] || row['ACCOUNT_NUMBER'];
        const ledgerBalance = row['Ledger Balance'] || row['ledger_balance'] || row['LedgerBalance'] || row['Balance'] || row['balance'] || '0.00';
        const availableBalance = row['Available Balance'] || row['available_balance'] || row['AvailableBalance'] || ledgerBalance;
        
        if (accountNumber) {
          updates.push({
            accountNumber: accountNumber.trim(),
            ledgerBalance: parseFloat(ledgerBalance.toString().replace(/,/g, '')) || 0,
            availableBalance: parseFloat(availableBalance.toString().replace(/,/g, '')) || 0
          });
        }
      })
      .on('end', () => resolve(updates))
      .on('error', (error) => reject(error));
  });
}

async function main() {
  console.log('='.repeat(60));
  console.log('Daily Balance Update');
  console.log('='.repeat(60));
  console.log(`CSV File: ${csvFilePath}`);
  console.log(`Database: ${isPostgres ? 'PostgreSQL (Render)' : 'MySQL (Local)'}`);
  console.log('='.repeat(60));
  console.log('');

  try {
    // Connect to database
    await connectDatabase();

    // Read CSV file
    console.log('[1/3] Reading CSV file...');
    const updates = await processCSV();
    console.log(`✓ Found ${updates.length} accounts to update\n`);

    if (updates.length === 0) {
      console.log('⚠ No valid records found in CSV file');
      console.log('');
      console.log('Expected CSV format (one of these):');
      console.log('  Account Number, Ledger Balance, Available Balance');
      console.log('  account_number, ledger_balance, available_balance');
      console.log('  AccountNumber, Balance');
      process.exit(0);
    }

    // Show sample
    console.log('Sample records:');
    updates.slice(0, 3).forEach((u, i) => {
      console.log(`  ${i + 1}. ${u.accountNumber}: GHS ${u.ledgerBalance.toFixed(2)} / ${u.availableBalance.toFixed(2)}`);
    });
    console.log('');

    // Update balances
    console.log('[2/3] Updating balances...');
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < updates.length; i++) {
      const { accountNumber, ledgerBalance, availableBalance } = updates[i];
      
      try {
        await insertBalance(accountNumber, ledgerBalance, availableBalance);
        successCount++;
        
        // Progress indicator
        if ((i + 1) % 100 === 0) {
          const percent = ((i + 1) / updates.length * 100).toFixed(1);
          process.stdout.write(`\r  Progress: ${i + 1}/${updates.length} (${percent}%)    `);
        }
      } catch (error) {
        errorCount++;
        console.error(`\n  ❌ Error updating ${accountNumber}:`, error.message);
      }
    }
    
    console.log(`\r  Progress: ${updates.length}/${updates.length} (100.0%)    `);
    console.log('');
    console.log(`✓ Successfully updated: ${successCount}`);
    if (errorCount > 0) {
      console.log(`❌ Errors: ${errorCount}`);
    }
    console.log('');

    // Verify update
    console.log('[3/3] Verifying update...');
    const verifyQuery = 'SELECT COUNT(*) as count, MAX(last_updated) as last_update FROM account_balances';
    const result = await executeQuery(verifyQuery, []);
    const row = isPostgres ? result.rows[0] : result[0][0];
    
    console.log(`✓ Total balances in database: ${row.count}`);
    console.log(`✓ Last update timestamp: ${row.last_update}`);
    console.log('');

    console.log('='.repeat(60));
    console.log('🎉 Balance update completed successfully!');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    // Close connection
    if (isPostgres) {
      await db.end();
    } else {
      await db.end();
    }
  }
}

main();
