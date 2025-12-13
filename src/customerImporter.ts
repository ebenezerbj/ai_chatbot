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

  try {
    // Parse CSV
    const records: any[] = [];
    const stream = Readable.from(buffer.toString());
    
    await new Promise<void>((resolve, reject) => {
      stream
        .pipe(csv())
        .on('data', (row: any) => {
          const accountNumber = row['ACCOUNT.ID'];
          if (accountNumber) {
            records.push({
              accountNumber: accountNumber.toString().trim(),
              accountTitle: (row['ACCOUNT.TITLE.1'] || '').toString().trim(),
              category: (row['CATEGORY'] || '').toString().trim(),
              accountOfficer: (row['ACCOUNT.OFFICER'] || '').toString().trim(),
              coCode: (row['CO.CODE'] || '').toString().trim(),
              smsSubscribe: (row['SMS.SUBSCRIBE'] || '').toString().trim(),
              workingBalance: parseFloat((row['WORKING.BALANCE'] || '0').toString().replace(/,/g, '')) || 0,
              clearedBalance: parseFloat((row['ONLINE.CLEARED.BAL'] || row['WORKING.BALANCE'] || '0').toString().replace(/,/g, '')) || 0,
              actualBalance: parseFloat((row['ONLINE.ACTUAL.BAL'] || row['WORKING.BALANCE'] || '0').toString().replace(/,/g, '')) || 0
            });
          }
        })
        .on('end', () => resolve())
        .on('error', (error: any) => reject(error));
    });

    result.totalRecords = records.length;

    if (records.length === 0) {
      result.summary = 'No valid records found in CSV file';
      return result;
    }

    // Process each record
    for (const record of records) {
      try {
        // First, insert/update customer
        const customerQuery = DB_TYPE === 'postgres'
          ? `INSERT INTO customers (account_number, full_name, account_type, branch_code)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (account_number) 
             DO UPDATE SET 
               full_name = EXCLUDED.full_name,
               account_type = EXCLUDED.account_type,
               branch_code = EXCLUDED.branch_code`
          : `INSERT INTO customers (account_number, full_name, account_type, branch_code)
             VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE 
               full_name = VALUES(full_name),
               account_type = VALUES(account_type),
               branch_code = VALUES(branch_code)`;

        await executeQuery(customerQuery, [
          record.accountNumber,
          record.accountTitle,
          record.category,
          record.coCode
        ]);

        // Then, insert/update balance
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

        await executeQuery(balanceQuery, [
          record.accountNumber,
          record.workingBalance,
          record.clearedBalance
        ]);

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
    result.errors.push(`Import failed: ${error.message}`);
    result.summary = `Import failed: ${error.message}`;
    return result;
  }
}
