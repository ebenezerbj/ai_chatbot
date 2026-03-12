import { executeQuery, querySingle, DB_TYPE } from './database';
import { computePeriodicPayment, AKCB_RATES } from './financeCalculator';

/**
 * Check if user message should trigger salary overdraft form
 */
export function shouldOpenSalaryOverdraftForm(message: string): boolean {
  if (!message || typeof message !== 'string') return false;

  const lowerMsg = message.toLowerCase().trim();
  
  // Match patterns that explicitly request to apply for salary overdraft
  const applyPatterns = [
    /apply.*for.*salary.*overdraft/,
    /request.*salary.*overdraft/,
    /get.*salary.*overdraft/,
    /i.*want.*salary.*overdraft/,
    /i.*need.*salary.*overdraft/,
    /start.*salary.*overdraft.*application/,
    /open.*salary.*overdraft.*form/,
    /salary.*overdraft.*application/
  ];

  const matches = applyPatterns.some(pattern => pattern.test(lowerMsg));
  console.log(`[SalaryOverdraft] Pattern check for message "${message}": ${matches ? 'MATCH' : 'NO MATCH'}`);
  return matches;
}

export interface SalaryOverdraftPayload {
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;

  fullName: string;
  phoneNumber: string;
  nationalIdNumber: string;
  accountNumber: string;
  branchName: string;
  branchCode: string;
  employerName: string;
  position: string;
  employmentType: string;
  lengthOfService: string;
  netMonthlySalary: number;
  requestedAmount: number;
  repaymentMonths: number;

  salaryAccountConsent: boolean;
  employerConfirmation: boolean;
  borrowerDeclaration: boolean;
}

export interface SalaryOverdraftCreateResult {
  applicationId: number;
  monthlyRepayment: number;
  approvedAmount: number;
}

export interface SalaryOverdraftRow {
  id: number;
  session_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  full_name: string;
  phone_number: string;
  national_id_number: string;
  account_number: string;
  branch_name: string;
  branch_code: string;
  employer_name: string;
  position: string;
  employment_type: string;
  length_of_service: string;
  net_monthly_salary: any;
  requested_amount: any;
  approved_amount: any;
  repayment_months: number;
  monthly_repayment: any;
  salary_account_consent: any;
  employer_confirmation: any;
  borrower_declaration: any;
  status: string;
  created_at: any;
}

export interface ListSalaryOverdraftsResult {
  total: number;
  items: Array<{
    id: number;
    sessionId: string | null;
    ipAddress: string | null;
    userAgent: string | null;
    fullName: string;
    phoneNumber: string;
    nationalIdNumber: string;
    accountNumber: string;
    employerName: string;
    position: string;
    employmentType: string;
    lengthOfService: string;
    netMonthlySalary: number;
    requestedAmount: number;
    approvedAmount: number;
    repaymentMonths: number;
    monthlyRepayment: number;
    salaryAccountConsent: boolean;
    employerConfirmation: boolean;
    borrowerDeclaration: boolean;
    status: string;
    createdAt: string;
  }>;
}

export function computeMonthlyRepayment(amount: number, months: number): number {
  const amt = Number(amount);
  const tenor = Number(months);
  if (!Number.isFinite(amt) || amt <= 0) return 0;
  if (!Number.isFinite(tenor) || tenor <= 0) return 0;
  // Use Trade/Overdraft rate (28% p.a.) for salary overdraft products
  const annualRate = AKCB_RATES.trade.annualRate ?? 28;
  return computePeriodicPayment(amt, annualRate, tenor, 'monthly');
}

// Calculate approved amount based on salary (max 3x monthly salary)
export function calculateApprovedAmount(requestedAmount: number, monthlySalary: number): number {
  const maxAllowed = monthlySalary * 3;
  return Math.min(requestedAmount, maxAllowed);
}

function normalizePhone(raw: string): string {
  return String(raw || '').trim();
}

function requiredString(value: any): string {
  const s = String(value ?? '').trim();
  return s;
}

export function validateSalaryOverdraftPayload(raw: any): { ok: false; error: string } | { ok: true; value: SalaryOverdraftPayload } {
  const errors: string[] = [];

  const fullName = requiredString(raw.fullName);
  if (!fullName) errors.push('Full Name is required');

  const phoneNumber = normalizePhone(raw.phoneNumber);
  if (!phoneNumber) errors.push('Phone Number is required');

  const nationalIdNumber = requiredString(raw.nationalIdNumber);
  if (!nationalIdNumber) errors.push('National ID Number is required');

  const accountNumber = requiredString(raw.accountNumber);
  if (!accountNumber) errors.push('Account Number is required');

  const branchName = requiredString(raw.branchName);
  if (!branchName) errors.push('Branch Name is required');

  const branchCode = requiredString(raw.branchCode);
  if (!branchCode) errors.push('Branch Code is required');

  const employerName = requiredString(raw.employerName);
  if (!employerName) errors.push('Employer Name is required');

  const position = requiredString(raw.position);
  if (!position) errors.push('Position is required');

  const employmentType = requiredString(raw.employmentType);
  if (!employmentType) errors.push('Employment Type is required');

  const lengthOfService = requiredString(raw.lengthOfService);
  if (!lengthOfService) errors.push('Length of Service is required');

  const netMonthlySalary = Number(raw.netMonthlySalary);
  if (!Number.isFinite(netMonthlySalary) || netMonthlySalary <= 0) {
    errors.push('Net Monthly Salary must be a positive number');
  }

  const requestedAmount = Number(raw.requestedAmount);
  if (!Number.isFinite(requestedAmount) || requestedAmount <= 0) {
    errors.push('Requested Amount must be a positive number');
  }

  const repaymentMonths = Number(raw.repaymentMonths);
  if (!Number.isFinite(repaymentMonths) || repaymentMonths <= 0) {
    errors.push('Repayment Months must be a positive number');
  }

  if (raw.salaryAccountConsent !== true) {
    errors.push('Salary Account Consent is required');
  }

  if (raw.employerConfirmation !== true) {
    errors.push('Employer Confirmation is required');
  }

  if (raw.borrowerDeclaration !== true) {
    errors.push('Borrower Declaration is required');
  }

  if (errors.length > 0) {
    return { ok: false, error: errors.join('; ') };
  }

  return {
    ok: true,
    value: {
      sessionId: requiredString(raw.sessionId) || undefined,
      ipAddress: requiredString(raw.ipAddress) || undefined,
      userAgent: requiredString(raw.userAgent) || undefined,
      fullName,
      phoneNumber,
      nationalIdNumber,
      accountNumber,
      branchName,
      branchCode,
      employerName,
      position,
      employmentType,
      lengthOfService,
      netMonthlySalary,
      requestedAmount,
      repaymentMonths,
      salaryAccountConsent: raw.salaryAccountConsent === true,
      employerConfirmation: raw.employerConfirmation === true,
      borrowerDeclaration: raw.borrowerDeclaration === true,
    },
  };
}

export async function initializeSalaryOverdraftTable(): Promise<void> {
  const createTable = `
    CREATE TABLE IF NOT EXISTS salary_overdrafts (
      id ${DB_TYPE === 'mysql' ? 'INTEGER PRIMARY KEY AUTO_INCREMENT' : 'SERIAL PRIMARY KEY'},
      session_id TEXT,
      ip_address TEXT,
      user_agent TEXT,
      full_name TEXT NOT NULL,
      phone_number TEXT NOT NULL,
      national_id_number TEXT NOT NULL,
      account_number TEXT NOT NULL,
      branch_name TEXT NOT NULL,
      branch_code TEXT NOT NULL,
      employer_name TEXT NOT NULL,
      position TEXT NOT NULL,
      employment_type TEXT NOT NULL,
      length_of_service TEXT NOT NULL,
      net_monthly_salary ${DB_TYPE === 'mysql' ? 'DECIMAL(15,2)' : 'NUMERIC(15,2)'} NOT NULL,
      requested_amount ${DB_TYPE === 'mysql' ? 'DECIMAL(15,2)' : 'NUMERIC(15,2)'} NOT NULL,
      approved_amount ${DB_TYPE === 'mysql' ? 'DECIMAL(15,2)' : 'NUMERIC(15,2)'} NOT NULL,
      repayment_months INTEGER NOT NULL,
      monthly_repayment ${DB_TYPE === 'mysql' ? 'DECIMAL(15,2)' : 'NUMERIC(15,2)'} NOT NULL,
      salary_account_consent ${DB_TYPE === 'mysql' ? 'BOOLEAN' : 'BOOLEAN'} NOT NULL DEFAULT FALSE,
      employer_confirmation ${DB_TYPE === 'mysql' ? 'BOOLEAN' : 'BOOLEAN'} NOT NULL DEFAULT FALSE,
      borrower_declaration ${DB_TYPE === 'mysql' ? 'BOOLEAN' : 'BOOLEAN'} NOT NULL DEFAULT FALSE,
      status ${DB_TYPE === 'mysql' ? "VARCHAR(50) NOT NULL DEFAULT 'pending'" : "VARCHAR(50) NOT NULL DEFAULT 'pending'"},
      created_at ${DB_TYPE === 'mysql' ? 'TIMESTAMP' : 'TIMESTAMP'} NOT NULL DEFAULT ${DB_TYPE === 'mysql' ? 'CURRENT_TIMESTAMP' : 'CURRENT_TIMESTAMP'}
    )
  `;
  await executeQuery(createTable, []);
}

export async function createSalaryOverdraft(payload: SalaryOverdraftPayload): Promise<SalaryOverdraftCreateResult> {
  const approvedAmount = calculateApprovedAmount(payload.requestedAmount, payload.netMonthlySalary);
  const monthlyRepayment = computeMonthlyRepayment(approvedAmount, payload.repaymentMonths);

  const insertSql = `
    INSERT INTO salary_overdrafts (
      session_id, ip_address, user_agent,
      full_name, phone_number, national_id_number, account_number,
      branch_name, branch_code,
      employer_name, position, employment_type, length_of_service,
      net_monthly_salary, requested_amount, approved_amount, repayment_months, monthly_repayment,
      salary_account_consent, employer_confirmation, borrower_declaration,
      status
    ) VALUES (
      ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?,
      'pending'
    )
  `;

  const params = [
    payload.sessionId || null,
    payload.ipAddress || null,
    payload.userAgent || null,
    payload.fullName,
    payload.phoneNumber,
    payload.nationalIdNumber,
    payload.accountNumber,
    payload.branchName,
    payload.branchCode,
    payload.employerName,
    payload.position,
    payload.employmentType,
    payload.lengthOfService,
    payload.netMonthlySalary,
    payload.requestedAmount,
    approvedAmount,
    payload.repaymentMonths,
    monthlyRepayment,
    payload.salaryAccountConsent ? 1 : 0,
    payload.employerConfirmation ? 1 : 0,
    payload.borrowerDeclaration ? 1 : 0,
  ];

  const result: any = await executeQuery(insertSql, params);
  const applicationId = result.insertId || 0;

  return {
    applicationId,
    monthlyRepayment,
    approvedAmount,
  };
}

export async function listSalaryOverdrafts(limit: number, offset: number): Promise<ListSalaryOverdraftsResult> {
  const countSql = 'SELECT COUNT(*) as cnt FROM salary_overdrafts';
  const countRow = await querySingle<{ cnt: number }>(countSql, []);
  const total = countRow?.cnt ?? 0;

  const sql = `
    SELECT 
      id, session_id, ip_address, user_agent,
      full_name, phone_number, national_id_number, account_number,
      branch_name, branch_code,
      employer_name, position, employment_type, length_of_service,
      net_monthly_salary, requested_amount, approved_amount, repayment_months, monthly_repayment,
      salary_account_consent, employer_confirmation, borrower_declaration,
      status, created_at
    FROM salary_overdrafts
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `;

  const rows = await executeQuery<SalaryOverdraftRow>(sql, [limit, offset]);

  const items = rows.map((r) => ({
    id: r.id,
    sessionId: r.session_id,
    ipAddress: r.ip_address,
    userAgent: r.user_agent,
    fullName: r.full_name,
    phoneNumber: r.phone_number,
    nationalIdNumber: r.national_id_number,
    accountNumber: r.account_number,
    branchName: r.branch_name,
    branchCode: r.branch_code,
    employerName: r.employer_name,
    position: r.position,
    employmentType: r.employment_type,
    lengthOfService: r.length_of_service,
    netMonthlySalary: Number(r.net_monthly_salary),
    requestedAmount: Number(r.requested_amount),
    approvedAmount: Number(r.approved_amount),
    repaymentMonths: r.repayment_months,
    monthlyRepayment: Number(r.monthly_repayment),
    salaryAccountConsent: Boolean(r.salary_account_consent),
    employerConfirmation: Boolean(r.employer_confirmation),
    borrowerDeclaration: Boolean(r.borrower_declaration),
    status: r.status,
    createdAt: String(r.created_at),
  }));

  return { total, items };
}
