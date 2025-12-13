/**
 * Balance Updater Module
 * Handles CSV parsing and balance updates for daily imports
 */

import { Readable } from 'stream';
import csv from 'csv-parser';
import { executeQuery, DB_TYPE } from './database';

export interface BalanceUpdate {
  accountNumber: string;
  ledgerBalance: number;
  availableBalance: number;
}

export interface UpdateResult {
  success: boolean;
  totalRecords: number;
  successCount: number;
  errorCount: number;
  errors: string[];
  summary: string;
}

/**
 * Parse CSV buffer and extract balance updates
 */
export async function parseCSV(buffer: Buffer): Promise<BalanceUpdate[]> {
  return new Promise((resolve, reject) => {
    const updates: BalanceUpdate[] = [];
    const stream = Readable.from(buffer.toString());
    
    stream
      .pipe(csv())
      .on('data', (row: any) => {
        // Flexible field mapping - handles various CSV formats
        const accountNumber = 
          row['Account Number'] || 
          row['account_number'] || 
          row['AccountNumber'] || 
          row['ACCOUNT_NUMBER'] ||
          row['Account No'] ||
          row['account_no'];
        
        const ledgerBalance = 
          row['Ledger Balance'] || 
          row['ledger_balance'] || 
          row['LedgerBalance'] || 
          row['Balance'] || 
          row['balance'] ||
          row['BALANCE'] ||
          '0.00';
        
        const availableBalance = 
          row['Available Balance'] || 
          row['available_balance'] || 
          row['AvailableBalance'] || 
          row['Available'] ||
          ledgerBalance; // Default to ledger if not provided
        
        if (accountNumber) {
          updates.push({
            accountNumber: accountNumber.toString().trim(),
            ledgerBalance: parseFloat(ledgerBalance.toString().replace(/,/g, '')) || 0,
            availableBalance: parseFloat(availableBalance.toString().replace(/,/g, '')) || 0
          });
        }
      })
      .on('end', () => resolve(updates))
      .on('error', (error: any) => reject(error));
  });
}

/**
 * Update balances in database
 */
export async function updateBalances(updates: BalanceUpdate[]): Promise<UpdateResult> {
  const result: UpdateResult = {
    success: false,
    totalRecords: updates.length,
    successCount: 0,
    errorCount: 0,
    errors: [],
    summary: ''
  };

  if (updates.length === 0) {
    result.summary = 'No valid records found in CSV file';
    return result;
  }

  // Prepare upsert query based on database type
  const query = DB_TYPE === 'postgres'
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

  // Process each update
  for (const update of updates) {
    try {
      if (DB_TYPE === 'postgres') {
        await executeQuery(query, [
          update.accountNumber,
          update.ledgerBalance,
          update.availableBalance
        ]);
      } else {
        await executeQuery(query, [
          update.accountNumber,
          update.ledgerBalance,
          update.availableBalance
        ]);
      }
      result.successCount++;
    } catch (error: any) {
      result.errorCount++;
      const errorMsg = `Account ${update.accountNumber}: ${error.message}`;
      result.errors.push(errorMsg);
      console.error('[BalanceUpdater]', errorMsg);
      
      // Only keep first 10 errors in result
      if (result.errors.length > 10) {
        result.errors = result.errors.slice(0, 10);
        result.errors.push(`... and ${result.errorCount - 10} more errors`);
        break;
      }
    }
  }

  result.success = result.successCount > 0;
  result.summary = `Updated ${result.successCount} of ${result.totalRecords} accounts`;
  
  if (result.errorCount > 0) {
    result.summary += ` (${result.errorCount} errors)`;
  }

  return result;
}

/**
 * Verify update by checking database stats
 */
export async function getUpdateStats(): Promise<{ totalAccounts: number; lastUpdate: Date | null }> {
  try {
    const query = `SELECT COUNT(*) as count, MAX(last_updated) as last_update FROM account_balances`;
    const rows = await executeQuery<any>(query, []);
    const row = rows[0];
    
    return {
      totalAccounts: parseInt(row.count) || 0,
      lastUpdate: row.last_update ? new Date(row.last_update) : null
    };
  } catch (error) {
    console.error('[BalanceUpdater] Error getting stats:', error);
    return { totalAccounts: 0, lastUpdate: null };
  }
}
