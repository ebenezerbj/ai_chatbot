/**
 * Customer Import Module
 * Imports customer data from core banking CSV exports
 */

import { Readable } from 'stream';
import csv from 'csv-parser';
import { executeQuery, DB_TYPE } from './database';

export interface CustomerImport {
  accountNumber: string;
  accountTitle: string;
  category: string;
  accountOfficer: string;
  coCode: string;
  smsSubscribe: string;
}

export interface ImportResult {
  success: boolean;
  totalRecords: number;
  successCount: number;
  errorCount: number;
  errors: string[];
  summary: string;
}

function buildCaseInsensitiveKeyMap(row: Record<string, any>): Record<string, string> {
  const map: Record<string, string> = {};
  for (const key of Object.keys(row)) {
    const normalized = key.trim().toLowerCase();
    if (!map[normalized]) {
      map[normalized] = key;
    }
  }
  return map;
}

function pickField(row: Record<string, any>, keyMap: Record<string, string>, candidates: string[]): any {
  for (const candidate of candidates) {
    if (candidate in row) return row[candidate];
    const normalized = candidate.trim().toLowerCase();
    const actualKey = keyMap[normalized];
    if (actualKey && actualKey in row) return row[actualKey];
  }
  return undefined;
}

function parseMoney(raw: any): number | null {
  if (raw === null || raw === undefined) return null;
  const str = String(raw).trim();
  if (!str) return null;
  const cleaned = str.replace(/,/g, '');
  const match = cleaned.match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const value = parseFloat(match[0]);
  return Number.isFinite(value) ? value : null;
}

/**
 * Parse CSV buffer and extract customer data
 */
export async function parseCustomerCSV(buffer: Buffer): Promise<CustomerImport[]> {
  return new Promise((resolve, reject) => {
    const customers: CustomerImport[] = [];
    const stream = Readable.from(buffer.toString());
    
    stream
      .pipe(csv())
      .on('data', (row: any) => {
        const accountNumber = row['ACCOUNT.ID'];
        const accountTitle = row['ACCOUNT.TITLE.1'] || '';
        const category = row['CATEGORY'] || '';
        const accountOfficer = row['ACCOUNT.OFFICER'] || '';
        const coCode = row['CO.CODE'] || '';
        const smsSubscribe = row['SMS.SUBSCRIBE'] || '';
        
        if (accountNumber) {
          customers.push({
            accountNumber: accountNumber.toString().trim(),
            accountTitle: accountTitle.toString().trim(),
            category: category.toString().trim(),
            accountOfficer: accountOfficer.toString().trim(),
            coCode: coCode.toString().trim(),
            smsSubscribe: smsSubscribe.toString().trim()
          });
        }
      })
      .on('end', () => resolve(customers))
      .on('error', (error: any) => reject(error));
  });
}

/**
 * Import customers and their balances in one operation
 */
export async function importCustomersWithBalances(buffer: Buffer): Promise<ImportResult> {
  const result: ImportResult = {
    success: false,
    totalRecords: 0,
    successCount: 0,
    errorCount: 0,
    errors: [],
    summary: ''
  };

  console.log('[CustomerImport] Starting import, buffer size:', buffer.length);

  try {
    // Parse CSV
    const records: any[] = [];
    const stream = Readable.from(buffer.toString());
    
    console.log('[CustomerImport] Parsing CSV...');
    
    await new Promise<void>((resolve, reject) => {
      stream
        .pipe(csv())
        .on('data', (row: any) => {
          console.log('[CustomerImport] Processing row:', JSON.stringify(row).substring(0, 200));
          const keyMap = buildCaseInsensitiveKeyMap(row);
          // Support multiple CSV formats
          // Format 1: ACCOUNT.ID, ACCOUNT.TITLE.1, etc. (old format)
          // Format 2: Account Number, First Name, etc. (Accounts.csv format)
          
          const accountNumberRaw = pickField(row, keyMap, [
            'ACCOUNT.ID',
            'Account Number',
            'account_number',
            'AccountNumber',
            'ACCOUNT_NUMBER',
            'Account No',
            'account_no'
          ]);
          const accountNumber = accountNumberRaw ? accountNumberRaw.toString().trim() : '';
          
          if (accountNumber) {
            // Handle different CSV formats
            let accountTitle = '';
            let category = '';
            let coCode = '';
            let balance: number | null = null;
            let phoneNumber = '';
            let email = '';

            const isOldFormat = !!pickField(row, keyMap, ['ACCOUNT.ID']);
            
            if (isOldFormat) {
              // Old format
              accountTitle = (pickField(row, keyMap, ['ACCOUNT.TITLE.1']) || '').toString().trim();
              category = (pickField(row, keyMap, ['CATEGORY']) || '').toString().trim();
              coCode = (pickField(row, keyMap, ['CO.CODE']) || '').toString().trim();
              const balRaw = pickField(row, keyMap, ['WORKING.BALANCE', 'ONLINE.CLEARED.BAL', 'ONLINE.ACTUAL.BAL']);
              balance = parseMoney(balRaw);
            } else {
              // Accounts.csv format
              const firstName = (pickField(row, keyMap, ['First Name']) || '').toString().trim();
              const middleName = (pickField(row, keyMap, ['Middle Name']) || '').toString().trim();
              const surname = (pickField(row, keyMap, ['Surname']) || '').toString().trim();
              const title = (pickField(row, keyMap, ['Title']) || '').toString().trim();
              
              // Build full name
              accountTitle = [title, firstName, middleName, surname]
                .filter(n => n)
                .join(' ')
                .trim();
              
              category = (pickField(row, keyMap, ['Account Type', 'Product Name']) || '').toString().trim();
              coCode = (pickField(row, keyMap, ['Account Branch']) || '').toString().trim();

              // Latest_Accounts.csv uses a longer header for balance; support multiple candidates.
              const balRaw = pickField(row, keyMap, [
                'Account Balance',
                'Account Balance (Own Balance Share For Joint Accounts)',
                'Account Balance In Cedis',
                'Account Balance In Original Currency'
              ]);
              balance = parseMoney(balRaw);

              phoneNumber = (pickField(row, keyMap, ['Mobile Phone Number', 'Main Phone Number']) || '').toString().trim();
              email = (pickField(row, keyMap, ['Email']) || '').toString().trim();
            }
            
            // Capture all available demographic fields from CSV
            const customerType = (pickField(row, keyMap, ['Customer Type']) || '').toString().trim();
            const gender = (pickField(row, keyMap, ['Gender']) || '').toString().trim();
            const idType = (pickField(row, keyMap, ['ID Type']) || '').toString().trim();
            const idNumber = (pickField(row, keyMap, ['ID Number']) || '').toString().trim();
            const dob = (pickField(row, keyMap, ['DOB', 'Date of Birth', 'Birth Date']) || '').toString().trim();
            const homeAddress = (pickField(row, keyMap, ['Home Address', 'Residential Address']) || '').toString().trim();
            const postalAddress = (pickField(row, keyMap, ['Postal Address']) || '').toString().trim();
            const country = (pickField(row, keyMap, ['Country']) || 'Ghana').toString().trim();
            const accountOwnership = (pickField(row, keyMap, ['Account By Ownership']) || '').toString().trim();
            const productName = (pickField(row, keyMap, ['Product Name']) || '').toString().trim();
            const accountStatus = (pickField(row, keyMap, ['Status Of Account', 'Status']) || 'Active').toString().trim();
            const currency = (pickField(row, keyMap, ['Currency Of Account', 'Currency']) || 'GHS').toString().trim();
            const firstName = isOldFormat ? '' : (pickField(row, keyMap, ['First Name']) || '').toString().trim();
            const middleName = isOldFormat ? '' : (pickField(row, keyMap, ['Middle Name']) || '').toString().trim();
            const surname = isOldFormat ? '' : (pickField(row, keyMap, ['Surname']) || '').toString().trim();
            const title = isOldFormat ? '' : (pickField(row, keyMap, ['Title']) || '').toString().trim();
            
            records.push({
              accountNumber: accountNumber.toString().trim(),
              accountTitle,
              category,
              coCode,
              balance,
              phoneNumber,
              email,
              // New demographic fields
              customerType,
              title,
              firstName,
              middleName,
              surname,
              gender,
              idType,
              idNumber,
              dob,
              homeAddress,
              postalAddress,
              country,
              accountOwnership,
              productName,
              accountStatus,
              currency
            });
          }
        })
        .on('end', () => {
          console.log('[CustomerImport] CSV parsing complete, total rows:', records.length);
          resolve();
        })
        .on('error', (error: any) => {
          console.error('[CustomerImport] CSV parsing error:', error);
          reject(error);
        });
    });

    result.totalRecords = records.length;
    console.log('[CustomerImport] Processing', result.totalRecords, 'records...');

    if (records.length === 0) {
      result.summary = 'No valid records found in CSV file';
      console.log('[CustomerImport]', result.summary);
      return result;
    }

    // Process records in batches for better performance
    const BATCH_SIZE = 500;
    const totalBatches = Math.ceil(records.length / BATCH_SIZE);
    
    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const start = batchIndex * BATCH_SIZE;
      const end = Math.min(start + BATCH_SIZE, records.length);
      const batch = records.slice(start, end);
      
      console.log(`[CustomerImport] Processing batch ${batchIndex + 1}/${totalBatches} (${batch.length} records)...`);
      
      for (const record of batch) {
      try {
        // Parse date of birth
        let dobDate: string | null = null;
        if (record.dob) {
          try {
            // Handle DD/MM/YYYY format
            const parts = record.dob.split('/');
            if (parts.length === 3) {
              dobDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
            }
          } catch (e) {
            console.warn(`[CustomerImport] Invalid DOB format for ${record.accountNumber}: ${record.dob}`);
          }
        }

        // First, insert/update customer with all demographic fields
        const customerQuery = DB_TYPE === 'postgres'
          ? `INSERT INTO customers (
               account_number, account_name, account_type, branch_code, phone_number, email,
               customer_type, title, first_name, middle_name, surname, gender, 
               id_type, id_number, date_of_birth, home_address, postal_address, country,
               account_ownership, product_name, account_status, currency, mobile_phone, branch_name
             )
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
             ON CONFLICT (account_number) 
             DO UPDATE SET 
               account_name = EXCLUDED.account_name,
               account_type = EXCLUDED.account_type,
               branch_code = EXCLUDED.branch_code,
               phone_number = COALESCE(EXCLUDED.phone_number, customers.phone_number),
               email = COALESCE(EXCLUDED.email, customers.email),
               customer_type = COALESCE(EXCLUDED.customer_type, customers.customer_type),
               title = COALESCE(EXCLUDED.title, customers.title),
               first_name = COALESCE(EXCLUDED.first_name, customers.first_name),
               middle_name = COALESCE(EXCLUDED.middle_name, customers.middle_name),
               surname = COALESCE(EXCLUDED.surname, customers.surname),
               gender = COALESCE(EXCLUDED.gender, customers.gender),
               id_type = COALESCE(EXCLUDED.id_type, customers.id_type),
               id_number = COALESCE(EXCLUDED.id_number, customers.id_number),
               date_of_birth = COALESCE(EXCLUDED.date_of_birth, customers.date_of_birth),
               home_address = COALESCE(EXCLUDED.home_address, customers.home_address),
               postal_address = COALESCE(EXCLUDED.postal_address, customers.postal_address),
               country = COALESCE(EXCLUDED.country, customers.country),
               account_ownership = COALESCE(EXCLUDED.account_ownership, customers.account_ownership),
               product_name = COALESCE(EXCLUDED.product_name, customers.product_name),
               account_status = COALESCE(EXCLUDED.account_status, customers.account_status),
               currency = COALESCE(EXCLUDED.currency, customers.currency),
               mobile_phone = COALESCE(EXCLUDED.mobile_phone, customers.mobile_phone),
               branch_name = COALESCE(EXCLUDED.branch_name, customers.branch_name)`
          : `INSERT INTO customers (
               account_number, account_name, account_type, branch_code, phone_number, email,
               customer_type, title, first_name, middle_name, surname, gender,
               id_type, id_number, date_of_birth, home_address, postal_address, country,
               account_ownership, product_name, account_status, currency, mobile_phone, branch_name
             )
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE 
               account_name = VALUES(account_name),
               account_type = VALUES(account_type),
               branch_code = VALUES(branch_code),
               phone_number = COALESCE(VALUES(phone_number), phone_number),
               email = COALESCE(VALUES(email), email),
               customer_type = COALESCE(VALUES(customer_type), customer_type),
               title = COALESCE(VALUES(title), title),
               first_name = COALESCE(VALUES(first_name), first_name),
               middle_name = COALESCE(VALUES(middle_name), middle_name),
               surname = COALESCE(VALUES(surname), surname),
               gender = COALESCE(VALUES(gender), gender),
               id_type = COALESCE(VALUES(id_type), id_type),
               id_number = COALESCE(VALUES(id_number), id_number),
               date_of_birth = COALESCE(VALUES(date_of_birth), date_of_birth),
               home_address = COALESCE(VALUES(home_address), home_address),
               postal_address = COALESCE(VALUES(postal_address), postal_address),
               country = COALESCE(VALUES(country), country),
               account_ownership = COALESCE(VALUES(account_ownership), account_ownership),
               product_name = COALESCE(VALUES(product_name), product_name),
               account_status = COALESCE(VALUES(account_status), account_status),
               currency = COALESCE(VALUES(currency), currency),
               mobile_phone = COALESCE(VALUES(mobile_phone), mobile_phone),
               branch_name = COALESCE(VALUES(branch_name), branch_name)`;

        await executeQuery(customerQuery, [
          record.accountNumber,
          record.accountTitle,
          record.category,
          record.coCode,
          record.phoneNumber || null,
          record.email || null,
          record.customerType || null,
          record.title || null,
          record.firstName || null,
          record.middleName || null,
          record.surname || null,
          record.gender || null,
          record.idType || null,
          record.idNumber || null,
          dobDate,
          record.homeAddress || null,
          record.postalAddress || null,
          record.country || 'Ghana',
          record.accountOwnership || null,
          record.productName || null,
          record.accountStatus || 'Active',
          record.currency || 'GHS',
          record.phoneNumber || null,
          record.coCode || null
        ]);

        // Then, insert/update balance (only when we have a parsed balance)
        const balanceQuery = DB_TYPE === 'postgres'
          ? `INSERT INTO account_balances (account_number, ledger_balance, available_balance, currency)
             VALUES ($1, $2, $3, 'GHS')
             ON CONFLICT (account_number) 
             DO UPDATE SET 
               ledger_balance = EXCLUDED.ledger_balance, 
               available_balance = EXCLUDED.available_balance, 
               last_updated = CURRENT_TIMESTAMP`
          : `INSERT INTO account_balances (account_number, ledger_balance, available_balance, currency)
             VALUES (?, ?, ?, 'GHS')
             ON DUPLICATE KEY UPDATE 
               ledger_balance = VALUES(ledger_balance), 
               available_balance = VALUES(available_balance), 
               last_updated = CURRENT_TIMESTAMP`;

        // If the CSV didn't contain a parseable balance for this row, do not overwrite existing balances.
        // (This avoids the common "everything becomes 0.00" scenario when headers don't match.)
        if (record.balance !== null) {
          await executeQuery(balanceQuery, [
            record.accountNumber,
            record.balance,
            record.balance
          ]);
        }

        result.successCount++;
      } catch (error: any) {
        result.errorCount++;
        const errorMsg = `Account ${record.accountNumber}: ${error.message}`;
        result.errors.push(errorMsg);
        console.error('[CustomerImport]', errorMsg);
        
        // Only keep first 10 errors per batch
        if (result.errors.length > 100) {
          result.errors = result.errors.slice(0, 100);
        }
      }
    }
    
    // Log batch completion
    console.log(`[CustomerImport] Batch ${batchIndex + 1}/${totalBatches} complete: ${result.successCount} success, ${result.errorCount} errors`);
  }

    result.success = result.successCount > 0;
    result.summary = `Imported ${result.successCount} of ${result.totalRecords} customers`;
    
    if (result.errorCount > 100) {
      result.errors = result.errors.slice(0, 100);
      result.errors.push(`... and ${result.errorCount - 100} more errors (showing first 100)`);
    }

    console.log('[CustomerImport] Import complete:', result.summary);
    return result;
  } catch (error: any) {
    console.error('[CustomerImport] Fatal error:', error);
    console.error('[CustomerImport] Error stack:', error.stack);
    result.errors.push(`Import failed: ${error.message}`);
    result.summary = `Import failed: ${error.message}`;
    return result;
  }
}
