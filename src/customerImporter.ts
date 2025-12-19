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
            
            records.push({
              accountNumber: accountNumber.toString().trim(),
              accountTitle,
              category,
              coCode,
              balance,
              phoneNumber,
              email
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

    // Process each record
    for (const record of records) {
      try {
        // First, insert/update customer
        const customerQuery = DB_TYPE === 'postgres'
          ? `INSERT INTO customers (account_number, account_name, account_type, branch_code, phone_number, email)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (account_number) 
             DO UPDATE SET 
               account_name = EXCLUDED.account_name,
               account_type = EXCLUDED.account_type,
               branch_code = EXCLUDED.branch_code,
               phone_number = COALESCE(EXCLUDED.phone_number, customers.phone_number),
               email = COALESCE(EXCLUDED.email, customers.email)`
          : `INSERT INTO customers (account_number, account_name, account_type, branch_code, phone_number, email)
             VALUES (?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE 
               account_name = VALUES(account_name),
               account_type = VALUES(account_type),
               branch_code = VALUES(branch_code),
               phone_number = COALESCE(VALUES(phone_number), phone_number),
               email = COALESCE(VALUES(email), email)`;

        await executeQuery(customerQuery, [
          record.accountNumber,
          record.accountTitle,
          record.category,
          record.coCode,
          record.phoneNumber || null,
          record.email || null
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
        
        // Only keep first 10 errors
        if (result.errors.length > 10) {
          result.errors = result.errors.slice(0, 10);
          break;
        }
      }
    }

    result.success = result.successCount > 0;
    result.summary = `Imported ${result.successCount} of ${result.totalRecords} accounts (${result.errorCount} errors)`;
    
    if (result.errorCount > 10) {
      result.errors.push(`... and ${result.errorCount - 10} more errors`);
    }

    return result;
  } catch (error: any) {
    console.error('[CustomerImport] Fatal error:', error);
    console.error('[CustomerImport] Error stack:', error.stack);
    result.errors.push(`Import failed: ${error.message}`);
    result.summary = `Import failed: ${error.message}`;
    return result;
  }
}
