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
  accountTitle?: string;      // Customer name from CSV
  category?: string;          // Account type from CSV
  coCode?: string;            // Branch code from CSV
}

export interface UpdateResult {
  success: boolean;
  totalRecords: number;
  successCount: number;
  errorCount: number;
  errors: string[];
  summary: string;
  customersCreated?: number;  // Track how many new customers were created
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
        // Flexible field mapping - handles various CSV formats from core banking
        const accountNumber = 
          row['ACCOUNT.ID'] ||           // Core banking export format
          row['Account Number'] || 
          row['account_number'] || 
          row['AccountNumber'] || 
          row['ACCOUNT_NUMBER'] ||
          row['Account No'] ||
          row['account_no'];
        
        const ledgerBalance = 
          row['WORKING.BALANCE'] ||      // Core banking export format
          row['ONLINE.ACTUAL.BAL'] ||    // Core banking alternative
          row['Ledger Balance'] || 
          row['ledger_balance'] || 
          row['LedgerBalance'] || 
          row['Balance'] || 
          row['balance'] ||
          row['BALANCE'] ||
          '0.00';
        
        const availableBalance = 
          row['ONLINE.CLEARED.BAL'] ||   // Core banking export format
          row['ONLINE.ACTUAL.BAL'] ||    // Core banking alternative
          row['Available Balance'] || 
          row['available_balance'] || 
          row['AvailableBalance'] || 
          row['Available'] ||
          ledgerBalance; // Default to ledger if not provided
        
        // Extract customer information from CSV (for auto-creation)
        const accountTitle = 
          row['ACCOUNT.TITLE.1'] ||      // Core banking export format
          row['Account Title'] ||
          row['account_title'] ||
          row['Customer Name'] ||
          row['customer_name'] ||
          row['Name'] ||
          '';
        
        const category = 
          row['CATEGORY'] ||              // Core banking export format
          row['Account Type'] ||
          row['account_type'] ||
          row['Type'] ||
          '';
        
        const coCode = 
          row['CO.CODE'] ||               // Core banking export format
          row['Branch Code'] ||
          row['branch_code'] ||
          row['Branch'] ||
          '';
        
        if (accountNumber) {
          updates.push({
            accountNumber: accountNumber.toString().trim(),
            ledgerBalance: parseFloat(ledgerBalance.toString().replace(/,/g, '')) || 0,
            availableBalance: parseFloat(availableBalance.toString().replace(/,/g, '')) || 0,
            accountTitle: accountTitle.toString().trim(),
            category: category.toString().trim(),
            coCode: coCode.toString().trim()
          });
        }
      })
      .on('end', () => resolve(updates))
      .on('error', (error: any) => reject(error));
  });
}

/**
 * Update balances in database
 * Automatically creates customer records if they don't exist
 */
export async function updateBalances(updates: BalanceUpdate[]): Promise<UpdateResult> {
  const result: UpdateResult = {
    success: false,
    totalRecords: updates.length,
    successCount: 0,
    errorCount: 0,
    errors: [],
    summary: '',
    customersCreated: 0
  };

  if (updates.length === 0) {
    result.summary = 'No valid records found in CSV file';
    return result;
  }

  // Prepare customer upsert query based on database type
  const customerQuery = DB_TYPE === 'postgres'
    ? `INSERT INTO customers (account_number, account_name, account_type, branch_code)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (account_number) 
       DO UPDATE SET 
         account_name = COALESCE(EXCLUDED.account_name, customers.account_name),
         account_type = COALESCE(EXCLUDED.account_type, customers.account_type),
         branch_code = COALESCE(EXCLUDED.branch_code, customers.branch_code)`
    : `INSERT INTO customers (account_number, account_name, account_type, branch_code)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE 
         account_name = COALESCE(VALUES(account_name), account_name),
         account_type = COALESCE(VALUES(account_type), account_type),
         branch_code = COALESCE(VALUES(branch_code), branch_code)`;

  // Prepare balance upsert query based on database type
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

  // Process each update
  for (const update of updates) {
    try {
      // Step 1: Create or update customer record if we have customer data
      if (update.accountTitle) {
        try {
          if (DB_TYPE === 'postgres') {
            const customerResult = await executeQuery(customerQuery, [
              update.accountNumber,
              update.accountTitle || null,
              update.category || null,
              update.coCode || null
            ]);
            // Check if this was an insert (new customer)
            if ((customerResult as any).rowCount > 0) {
              result.customersCreated!++;
            }
          } else {
            const customerResult = await executeQuery(customerQuery, [
              update.accountNumber,
              update.accountTitle || null,
              update.category || null,
              update.coCode || null
            ]);
            // Check if this was an insert (affectedRows will be 1 for new, 2 for update in MySQL)
            if ((customerResult as any).affectedRows === 1) {
              result.customersCreated!++;
            }
          }
        } catch (customerError: any) {
          // Log customer creation error but continue with balance update
          console.warn(`[BalanceUpdater] Customer creation warning for ${update.accountNumber}: ${customerError.message}`);
        }
      }

      // Step 2: Update balance (this will now succeed because customer exists)
      if (DB_TYPE === 'postgres') {
        await executeQuery(balanceQuery, [
          update.accountNumber,
          update.ledgerBalance,
          update.availableBalance
        ]);
      } else {
        await executeQuery(balanceQuery, [
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
  
  if (result.customersCreated! > 0) {
    result.summary += ` (${result.customersCreated} new customers created)`;
  }
  
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
