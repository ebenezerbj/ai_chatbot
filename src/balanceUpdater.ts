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
  transactionsCreated?: number; // Track how many transactions were created
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

  // Remove common separators and extract the first number we see.
  const cleaned = str.replace(/,/g, '');
  const match = cleaned.match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;

  const value = parseFloat(match[0]);
  return Number.isFinite(value) ? value : null;
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
        const keyMap = buildCaseInsensitiveKeyMap(row);
        // Flexible field mapping - handles various CSV formats from core banking
        const accountNumberRaw = pickField(row, keyMap, [
          'ACCOUNT.ID',           // Core banking export format
          'Account Number',
          'account_number',
          'AccountNumber',
          'ACCOUNT_NUMBER',
          'Account No',
          'account_no',
          'ACCOUNT NO',
          'ACCOUNT NO.',
          'ACCOUNT.NO',
          'A/C No',
          'A/C NO',
          'ACCT NO'
        ]);
        
        const ledgerBalanceRaw = pickField(row, keyMap, [
          'WORKING.BALANCE',      // Core banking export format
          'ONLINE.ACTUAL.BAL',    // Core banking alternative
          'Ledger Balance',
          'ledger_balance',
          'LedgerBalance',
          'Balance',
          'balance',
          'BALANCE',
          // Accounts exports (e.g., Latest_Accounts.csv)
          'Account Balance',
          'Account Balance (Own Balance Share For Joint Accounts)',
          'Account Balance In Cedis',
          'Account Balance In Original Currency'
        ]);
        
        const availableBalanceRaw = pickField(row, keyMap, [
          'ONLINE.CLEARED.BAL',   // Core banking export format
          'ONLINE.ACTUAL.BAL',    // Core banking alternative
          'Available Balance',
          'available_balance',
          'AvailableBalance',
          'Available'
        ]);
        
        // Extract customer information from CSV (for auto-creation)
        let accountTitle = (pickField(row, keyMap, [
          'ACCOUNT.TITLE.1',      // Core banking export format
          'Account Title',
          'account_title',
          'Customer Name',
          'customer_name',
          'Name'
        ]) || '').toString();
        
        // If no account title, try to build from name components (R20 format)
        if (!accountTitle) {
          const firstName = (pickField(row, keyMap, ['FIRSTNAME', 'First Name', 'first_name']) || '').toString().trim();
          const lastName = (pickField(row, keyMap, ['LASTNAME', 'Last Name', 'last_name', 'Surname']) || '').toString().trim();
          const otherName = (pickField(row, keyMap, ['OTHERNAME', 'Other Name', 'other_name', 'Middle Name']) || '').toString().trim();
          
          const nameParts = [firstName, otherName, lastName].filter(p => p.length > 0);
          if (nameParts.length > 0) {
            accountTitle = nameParts.join(' ');
          }
        }
        
        const category = (pickField(row, keyMap, [
          'CATEGORY',              // Core banking export format
          'Account Type',
          'account_type',
          'Type'
        ]) || '').toString();
        
        const coCode = (pickField(row, keyMap, [
          'CO.CODE',               // Core banking export format
          'Branch Code',
          'branch_code',
          'Branch'
        ]) || '').toString();

        const accountNumber = accountNumberRaw ? accountNumberRaw.toString().trim() : '';
        const ledgerParsed = parseMoney(ledgerBalanceRaw);
        const availableParsed = parseMoney(availableBalanceRaw ?? ledgerBalanceRaw);

        // If we can't actually parse any balance fields, skip this row.
        // This prevents accidental overwrites to 0.00 when a CSV has unexpected headers.
        if (ledgerParsed === null && availableParsed === null) {
          return;
        }
        
        if (accountNumber) {
          updates.push({
            accountNumber,
            ledgerBalance: ledgerParsed ?? 0,
            availableBalance: availableParsed ?? ledgerParsed ?? 0,
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
    customersCreated: 0,
    transactionsCreated: 0
  };

  const toPlainAccountNumber = (raw: string): { value: string } | { error: string } => {
    let trimmed = (raw || '').trim();
    if (!trimmed) return { error: 'Missing account number' };

    // Strip common currency prefixes (GHS, USD, EUR, etc.)
    trimmed = trimmed.replace(/^(GHS|USD|EUR|GBP|NGN|KES|ZAR)\s*/i, '');

    // If it contains any letters and looks like scientific notation (common Excel export issue), reject.
    // Example: 1.51111E+15 (precision is already lost; it will not match real account numbers).
    if (/e[+-]?\d+/i.test(trimmed)) {
      return {
        error:
          `Account number '${trimmed}' appears to be in scientific notation. ` +
          `Please export the ACCOUNT.ID column as TEXT (full digits, no E+15) and re-upload.`
      };
    }

    // Accept digits-only account numbers (after removing spaces).
    const digitsOnly = trimmed.replace(/\s+/g, '');
    if (!/^\d+$/.test(digitsOnly)) {
      return { error: `Invalid account number '${raw}' (expected digits only, got '${digitsOnly}')` };
    }

    return { value: digitsOnly };
  };

  if (updates.length === 0) {
    result.summary = 'No valid records found in CSV file';
    return result;
  }

  console.log('[BalanceUpdater] Processing', updates.length, 'balance updates...');

  // Process updates in batches for better performance
  const BATCH_SIZE = 500;
  const totalBatches = Math.ceil(updates.length / BATCH_SIZE);

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

  // Process updates in batches
  for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
    const start = batchIndex * BATCH_SIZE;
    const end = Math.min(start + BATCH_SIZE, updates.length);
    const batch = updates.slice(start, end);
    
    console.log(`[BalanceUpdater] Processing batch ${batchIndex + 1}/${totalBatches} (${batch.length} records)...`);

    // Process each update in the batch
    for (const update of batch) {
    try {
      const normalizedAccount = toPlainAccountNumber(update.accountNumber);
      if ('error' in normalizedAccount) {
        result.errorCount++;
        const errorMsg = `Account ${update.accountNumber}: ${normalizedAccount.error}`;
        result.errors.push(errorMsg);
        console.error('[BalanceUpdater]', errorMsg);

        if (result.errors.length > 10) {
          result.errors = result.errors.slice(0, 10);
          result.errors.push(`... and ${result.errorCount - 10} more errors`);
          break;
        }
        continue;
      }

      // Use normalized digits-only account number for any DB operations
      update.accountNumber = normalizedAccount.value;

      // Step 1: Check if customer exists (required for foreign key constraint)
      const checkQuery = DB_TYPE === 'postgres' 
        ? 'SELECT account_number FROM customers WHERE account_number = $1'
        : 'SELECT account_number FROM customers WHERE account_number = ?';
      
      const existingCustomer = await executeQuery(checkQuery, [update.accountNumber]);
      const customerExists = Array.isArray(existingCustomer) && existingCustomer.length > 0;

      // Step 2: Create or update customer record
      // If customer doesn't exist and we don't have a name, create with account number as name
      if (!customerExists && !update.accountTitle) {
        update.accountTitle = `Account ${update.accountNumber}`;
        console.log(`[BalanceUpdater] Creating new customer for ${update.accountNumber} with auto-generated name`);
      }

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
            if ((customerResult as any).rowCount > 0 && !customerExists) {
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

      // Step 3: Get existing balance before update (for transaction recording)
      const getBalanceQuery = DB_TYPE === 'postgres'
        ? 'SELECT ledger_balance FROM account_balances WHERE account_number = $1'
        : 'SELECT ledger_balance FROM account_balances WHERE account_number = ?';
      
      const existingBalanceResult = await executeQuery<any>(getBalanceQuery, [update.accountNumber]);
      const existingBalance = existingBalanceResult.length > 0 ? parseFloat(existingBalanceResult[0].ledger_balance) : null;

      // Step 4: Update balance
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

      // Step 5: Record transaction if balance changed
      if (existingBalance !== null && existingBalance !== update.ledgerBalance) {
        const difference = update.ledgerBalance - existingBalance;
        const isCredit = difference > 0;
        const transactionType = isCredit ? 'Deposit' : 'Withdrawal';
        const debitAmount = isCredit ? 0 : Math.abs(difference);
        const creditAmount = isCredit ? difference : 0;
        
        // Generate a unique reference number
        const timestamp = Date.now();
        const referenceNumber = `BAL-${update.accountNumber}-${timestamp}`;
        
        const transactionQuery = DB_TYPE === 'postgres'
          ? `INSERT INTO transactions (
               account_number, transaction_date, description, 
               debit_amount, credit_amount, balance_after, 
               reference_number, transaction_type, channel
             ) VALUES ($1, CURRENT_TIMESTAMP, $2, $3, $4, $5, $6, $7, $8)`
          : `INSERT INTO transactions (
               account_number, transaction_date, description, 
               debit_amount, credit_amount, balance_after, 
               reference_number, transaction_type, channel
             ) VALUES (?, NOW(), ?, ?, ?, ?, ?, ?, ?)`;
        
        const description = isCredit 
          ? `Balance Upload - Deposit of GHS ${creditAmount.toFixed(2)}`
          : `Balance Upload - Withdrawal of GHS ${debitAmount.toFixed(2)}`;
        
        await executeQuery(transactionQuery, [
          update.accountNumber,
          description,
          debitAmount,
          creditAmount,
          update.ledgerBalance,
          referenceNumber,
          transactionType,
          'Internal'
        ]);
        
        result.transactionsCreated!++;
      }
      
      result.successCount++;
    } catch (error: any) {
      result.errorCount++;
      const errorMsg = `Account ${update.accountNumber}: ${error.message}`;
      result.errors.push(errorMsg);
      console.error('[BalanceUpdater]', errorMsg);
      
      // Keep up to 100 errors
      if (result.errors.length > 100) {
        result.errors = result.errors.slice(0, 100);
      }
    }
  }
  
  // Log batch completion
  console.log(`[BalanceUpdater] Batch ${batchIndex + 1}/${totalBatches} complete: ${result.successCount} success, ${result.errorCount} errors`);
  }

  result.success = result.successCount > 0;
  result.summary = `Updated ${result.successCount} of ${result.totalRecords} accounts`;
  
  if (result.customersCreated! > 0) {
    result.summary += ` (${result.customersCreated} new customers created)`;
  }
  
  if (result.transactionsCreated! > 0) {
    result.summary += ` (${result.transactionsCreated} transactions recorded)`;
  }
  
  if (result.errorCount > 100) {
    result.errors = result.errors.slice(0, 100);
    result.errors.push(`... and ${result.errorCount - 100} more errors (showing first 100)`);
  }
  
  if (result.errorCount > 0 && result.errorCount <= 100) {
    result.summary += ` (${result.errorCount} errors)`;
  }

  console.log('[BalanceUpdater] Update complete:', result.summary);
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
