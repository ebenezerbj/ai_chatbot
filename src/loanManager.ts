/**
 * Loan Manager Module
 * Handles CSV parsing and loan data imports
 */

import { Readable } from 'stream';
import csv from 'csv-parser';
import { executeQuery, DB_TYPE } from './database';

export interface LoanRecord {
  facilityAccountNumber: string;
  customerId: string;
  phoneNumber: string;
  customerName: string;
  nationalId: string;
  branchCode: string;
  facilityType: string;
  purposeOfFacility: string;
  facilityAmount: number;
  currentBalance: number;
  currency: string;
  disbursementDate: string | null;
  maturityDate: string | null;
  nextPaymentDate: string | null;
  lastPaymentDate: string | null;
  facilityTerm: number;
  scheduledInstallment: number;
  lastPaymentAmount: number;
  repaymentFrequency: string;
  facilityStatusCode: string;
  assetClassification: string;
  amountInArrears: number;
}

export interface LoanImportResult {
  totalRecords: number;
  successCount: number;
  errorCount: number;
  errors: Array<{ row: number; error: string; data?: any }>;
}

/**
 * Parse loan CSV buffer and extract loan records
 */
export async function parseLoanCSV(buffer: Buffer): Promise<LoanRecord[]> {
  return new Promise((resolve, reject) => {
    const loans: LoanRecord[] = [];
    const stream = Readable.from(buffer);

    stream
      .pipe(csv())
      .on('data', (row: any) => {
        try {
          // Parse dates safely with validation
          const parseDate = (dateStr: string): string | null => {
            if (!dateStr || dateStr.trim() === '' || dateStr === '0') return null;
            
            const str = String(dateStr).trim().replace(/\s+/g, ''); // Remove spaces
            
            // Handle Excel date format (YYYYMMDD) - must be exactly 8 digits
            if (/^\d{8}$/.test(str)) {
              const year = str.substring(0, 4);
              const month = str.substring(4, 6);
              const day = str.substring(6, 8);
              const date = `${year}-${month}-${day}`;
              
              // Validate the date
              if (isValidDate(date)) {
                return date;
              }
              return null;
            }
            
            // Handle dd-MMM-yy format (e.g., 27-Apr-24)
            if (/^\d{1,2}-[A-Za-z]{3}-\d{2}$/.test(str)) {
              try {
                const parts = str.split('-');
                const day = parts[0].padStart(2, '0');
                const monthMap: { [key: string]: string } = {
                  'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04', 'May': '05', 'Jun': '06',
                  'Jul': '07', 'Aug': '08', 'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
                };
                const month = monthMap[parts[1]];
                const year = '20' + parts[2];
                const date = `${year}-${month}-${day}`;
                
                if (isValidDate(date)) {
                  return date;
                }
              } catch (e) {
                return null;
              }
              return null;
            }
            
            // Handle YYYY-MM-DD format with validation
            if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
              if (isValidDate(str)) {
                return str;
              }
              return null;
            }
            
            // Invalid format
            return null;
          };
          
          // Validate date string
          const isValidDate = (dateStr: string): boolean => {
            const parts = dateStr.split('-');
            if (parts.length !== 3) return false;
            
            const year = parseInt(parts[0]);
            const month = parseInt(parts[1]);
            const day = parseInt(parts[2]);
            
            // Check ranges
            if (year < 1900 || year > 2100) return false;
            if (month < 1 || month > 12) return false;
            if (day < 1 || day > 31) return false;
            
            // Check actual date validity (handles leap years, month lengths)
            const date = new Date(year, month - 1, day);
            return date.getFullYear() === year && 
                   date.getMonth() === month - 1 && 
                   date.getDate() === day;
          };

          // Parse currency amounts
          const parseAmount = (value: any): number => {
            if (!value) return 0;
            const cleaned = String(value).replace(/[^0-9.-]/g, '');
            return parseFloat(cleaned) || 0;
          };
          
          // Truncate phone number to 20 chars
          const truncatePhone = (phone: string): string => {
            const cleaned = String(phone || '').trim();
            return cleaned.length > 20 ? cleaned.substring(0, 20) : cleaned;
          };
          
          // Truncate repayment frequency to 2 chars
          const truncateRepaymentFreq = (freq: string): string => {
            const cleaned = String(freq || '').trim();
            return cleaned.length > 2 ? cleaned.substring(0, 2) : cleaned;
          };
          
          // Parse customer ID (null if empty)
          const parseCustomerId = (id: any): string => {
            const str = String(id || '').trim();
            return str === '' ? '' : str;
          };

          const loan: LoanRecord = {
            facilityAccountNumber: String(row.FacilityAccNum || '').trim(),
            customerId: parseCustomerId(row.CustomerId),
            phoneNumber: truncatePhone(row.MobileTel1),
            customerName: `${row.Surname || ''} ${row.FirstName || ''} ${row.MiddleNames || ''}`.trim(),
            nationalId: String(row.NatIDNum || '').trim(),
            branchCode: String(row.BranchCode || '').trim(),
            facilityType: String(row.CreditFacilityType || '').trim(),
            purposeOfFacility: String(row.PurposeOfFacility || '').trim(),
            facilityAmount: parseAmount(row.FacilityAmount),
            currentBalance: parseAmount(row.CurBal),
            currency: String(row.AmountCurrency || 'GHS').trim(),
            disbursementDate: parseDate(row.DisbursementDate),
            maturityDate: parseDate(row.Maturitydate),
            nextPaymentDate: parseDate(row.NextPaymentDate),
            lastPaymentDate: parseDate(row.LastPaymentDate),
            facilityTerm: parseInt(row.FacilityTerm) || 0,
            scheduledInstallment: parseAmount(row.SchdInstalAmount),
            lastPaymentAmount: parseAmount(row.LastPaymentAmount),
            repaymentFrequency: truncateRepaymentFreq(row.RepaymentFreq),
            facilityStatusCode: String(row.FacilityStatusCode || 'A').trim(),
            assetClassification: String(row.AssetClassification || 'A').trim(),
            amountInArrears: parseAmount(row.AmountInarrears)
          };

          // Only add if we have a facility account number
          if (loan.facilityAccountNumber) {
            loans.push(loan);
          }
        } catch (error) {
          console.error('[LoanManager] Error parsing row:', error);
        }
      })
      .on('end', () => {
        console.log(`[LoanManager] Parsed ${loans.length} loan records`);
        resolve(loans);
      })
      .on('error', (error) => {
        console.error('[LoanManager] CSV parse error:', error);
        reject(error);
      });
  });
}

/**
 * Import loan records into database
 */
export async function importLoans(loans: LoanRecord[]): Promise<LoanImportResult> {
  const result: LoanImportResult = {
    totalRecords: loans.length,
    successCount: 0,
    errorCount: 0,
    errors: []
  };

  for (let i = 0; i < loans.length; i++) {
    const loan = loans[i];
    
    try {
      if (DB_TYPE === 'postgres') {
        // PostgreSQL upsert
        await executeQuery(
          `INSERT INTO loans (
            facility_account_number, customer_id, phone_number, customer_name, national_id, branch_code,
            facility_type, purpose_of_facility, facility_amount, current_balance, currency,
            disbursement_date, maturity_date, next_payment_date, last_payment_date,
            facility_term, scheduled_installment, last_payment_amount, repayment_frequency,
            facility_status_code, asset_classification, amount_in_arrears
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
          ON CONFLICT (facility_account_number) 
          DO UPDATE SET
            customer_id = EXCLUDED.customer_id,
            phone_number = EXCLUDED.phone_number,
            customer_name = EXCLUDED.customer_name,
            current_balance = EXCLUDED.current_balance,
            next_payment_date = EXCLUDED.next_payment_date,
            last_payment_date = EXCLUDED.last_payment_date,
            last_payment_amount = EXCLUDED.last_payment_amount,
            facility_status_code = EXCLUDED.facility_status_code,
            asset_classification = EXCLUDED.asset_classification,
            amount_in_arrears = EXCLUDED.amount_in_arrears,
            last_updated = CURRENT_TIMESTAMP`,
          [
            loan.facilityAccountNumber, loan.customerId, loan.phoneNumber, loan.customerName, loan.nationalId, loan.branchCode,
            loan.facilityType, loan.purposeOfFacility, loan.facilityAmount, loan.currentBalance, loan.currency,
            loan.disbursementDate, loan.maturityDate, loan.nextPaymentDate, loan.lastPaymentDate,
            loan.facilityTerm, loan.scheduledInstallment, loan.lastPaymentAmount, loan.repaymentFrequency,
            loan.facilityStatusCode, loan.assetClassification, loan.amountInArrears
          ]
        );
      } else {
        // MySQL upsert
        await executeQuery(
          `INSERT INTO loans (
            facility_account_number, customer_id, phone_number, customer_name, national_id, branch_code,
            facility_type, purpose_of_facility, facility_amount, current_balance, currency,
            disbursement_date, maturity_date, next_payment_date, last_payment_date,
            facility_term, scheduled_installment, last_payment_amount, repayment_frequency,
            facility_status_code, asset_classification, amount_in_arrears
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            customer_id = VALUES(customer_id),
            phone_number = VALUES(phone_number),
            customer_name = VALUES(customer_name),
            current_balance = VALUES(current_balance),
            next_payment_date = VALUES(next_payment_date),
            last_payment_date = VALUES(last_payment_date),
            last_payment_amount = VALUES(last_payment_amount),
            facility_status_code = VALUES(facility_status_code),
            asset_classification = VALUES(asset_classification),
            amount_in_arrears = VALUES(amount_in_arrears),
            last_updated = CURRENT_TIMESTAMP`,
          [
            loan.facilityAccountNumber, loan.customerId, loan.phoneNumber, loan.customerName, loan.nationalId, loan.branchCode,
            loan.facilityType, loan.purposeOfFacility, loan.facilityAmount, loan.currentBalance, loan.currency,
            loan.disbursementDate, loan.maturityDate, loan.nextPaymentDate, loan.lastPaymentDate,
            loan.facilityTerm, loan.scheduledInstallment, loan.lastPaymentAmount, loan.repaymentFrequency,
            loan.facilityStatusCode, loan.assetClassification, loan.amountInArrears
          ]
        );
      }
      
      result.successCount++;
    } catch (error: any) {
      result.errorCount++;
      result.errors.push({
        row: i + 1,
        error: error.message,
        data: loan
      });
      console.error(`[LoanManager] Error importing loan ${loan.facilityAccountNumber}:`, error.message);
    }
  }

  console.log(`[LoanManager] Import complete: ${result.successCount} success, ${result.errorCount} errors`);
  return result;
}

/**
 * Get loan statistics
 */
export async function getLoanStats(): Promise<{ totalLoans: number; activeLoans: number; totalOutstanding: number }> {
  try {
    const query = `
      SELECT 
        COUNT(*) as total_loans,
        SUM(CASE WHEN facility_status_code = 'A' THEN 1 ELSE 0 END) as active_loans,
        SUM(current_balance) as total_outstanding
      FROM loans
    `;
    const rows = await executeQuery<any>(query, []);
    const row = rows[0];
    
    return {
      totalLoans: parseInt(row.total_loans) || 0,
      activeLoans: parseInt(row.active_loans) || 0,
      totalOutstanding: parseFloat(row.total_outstanding) || 0
    };
  } catch (error) {
    console.error('[LoanManager] Error getting stats:', error);
    return { totalLoans: 0, activeLoans: 0, totalOutstanding: 0 };
  }
}
