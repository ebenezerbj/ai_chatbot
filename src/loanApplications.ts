import { executeQuery, querySingle, DB_TYPE } from './database';

export interface LoanApplicationPayload {
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;

  fullName: string;
  phoneNumber: string;
  nationalIdNumber: string;
  accountNumber: string;
  employerName: string;
  position: string;
  employmentType: string;
  lengthOfService: string;
  netMonthlySalary: number;
  loanAmount: number;
  loanPurpose: string;
  loanTenorMonths: number;

  salaryDeductionConsent: boolean;
  employerConfirmation: boolean;
  borrowerDeclaration: boolean;
}

export interface LoanApplicationCreateResult {
  applicationId: number;
  monthlyInstalment: number;
}

export interface LoanApplicationRow {
  id: number;
  session_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  full_name: string;
  phone_number: string;
  national_id_number: string;
  account_number: string;
  employer_name: string;
  position: string;
  employment_type: string;
  length_of_service: string;
  net_monthly_salary: any;
  loan_amount: any;
  loan_purpose: string;
  loan_tenor_months: number;
  monthly_instalment: any;
  salary_deduction_consent: any;
  employer_confirmation: any;
  borrower_declaration: any;
  status: string;
  created_at: any;
}

export interface ListLoanApplicationsResult {
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
    loanAmount: number;
    loanPurpose: string;
    loanTenorMonths: number;
    monthlyInstalment: number;
    salaryDeductionConsent: boolean;
    employerConfirmation: boolean;
    borrowerDeclaration: boolean;
    status: string;
    createdAt: string;
  }>;
}

export function computeMonthlyInstalment(loanAmount: number, loanTenorMonths: number): number {
  const amount = Number(loanAmount);
  const tenor = Number(loanTenorMonths);
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  if (!Number.isFinite(tenor) || tenor <= 0) return 0;
  return Math.round((amount / tenor) * 100) / 100;
}

function normalizePhone(raw: string): string {
  return String(raw || '').trim();
}

function requiredString(value: any): string {
  const s = String(value ?? '').trim();
  return s;
}

function requiredNumber(value: any): number {
  const n = Number(String(value ?? '').toString().replace(/,/g, '').trim());
  return Number.isFinite(n) ? n : NaN;
}

export function validateLoanApplicationPayload(payload: any): { ok: true; value: LoanApplicationPayload } | { ok: false; error: string } {
  const fullName = requiredString(payload?.fullName);
  const phoneNumber = normalizePhone(payload?.phoneNumber);
  const nationalIdNumber = requiredString(payload?.nationalIdNumber);
  const accountNumber = requiredString(payload?.accountNumber);
  const employerName = requiredString(payload?.employerName);
  const position = requiredString(payload?.position);
  const employmentType = requiredString(payload?.employmentType);
  const lengthOfService = requiredString(payload?.lengthOfService);

  const netMonthlySalary = requiredNumber(payload?.netMonthlySalary);
  const loanAmount = requiredNumber(payload?.loanAmount);
  const loanPurpose = requiredString(payload?.loanPurpose);
  const loanTenorMonths = Math.trunc(requiredNumber(payload?.loanTenorMonths));

  if (!fullName) return { ok: false, error: 'Full Name is required.' };
  if (!phoneNumber) return { ok: false, error: 'Phone Number is required.' };
  if (!nationalIdNumber) return { ok: false, error: 'National ID Number is required.' };
  if (!accountNumber) return { ok: false, error: 'Account Number is required.' };
  if (!employerName) return { ok: false, error: 'Employer Name is required.' };
  if (!position) return { ok: false, error: 'Position is required.' };
  if (!employmentType) return { ok: false, error: 'Employment Type is required.' };
  if (!lengthOfService) return { ok: false, error: 'Length of Service is required.' };

  if (!Number.isFinite(netMonthlySalary) || netMonthlySalary <= 0) {
    return { ok: false, error: 'Net Monthly Salary must be a valid amount.' };
  }
  if (!Number.isFinite(loanAmount) || loanAmount <= 0) {
    return { ok: false, error: 'Loan Amount must be a valid amount.' };
  }
  if (!loanPurpose) return { ok: false, error: 'Loan Purpose is required.' };
  if (!Number.isFinite(loanTenorMonths) || loanTenorMonths <= 0) {
    return { ok: false, error: 'Loan Tenor must be a valid number of months.' };
  }

  const salaryDeductionConsent = !!payload?.salaryDeductionConsent;
  const employerConfirmation = !!payload?.employerConfirmation;
  const borrowerDeclaration = !!payload?.borrowerDeclaration;

  if (!salaryDeductionConsent) {
    return { ok: false, error: 'Salary Deduction Consent is required.' };
  }
  if (!employerConfirmation) {
    return { ok: false, error: 'Employer Confirmation is required.' };
  }
  if (!borrowerDeclaration) {
    return { ok: false, error: 'Borrower Declaration is required.' };
  }

  return {
    ok: true,
    value: {
      sessionId: payload?.sessionId,
      ipAddress: payload?.ipAddress,
      userAgent: payload?.userAgent,
      fullName,
      phoneNumber,
      nationalIdNumber,
      accountNumber,
      employerName,
      position,
      employmentType,
      lengthOfService,
      netMonthlySalary,
      loanAmount,
      loanPurpose,
      loanTenorMonths,
      salaryDeductionConsent,
      employerConfirmation,
      borrowerDeclaration
    }
  };
}

export async function initializeLoanApplicationsTable(): Promise<void> {
  if (DB_TYPE === 'postgres') {
    await executeQuery(
      `CREATE TABLE IF NOT EXISTS loan_applications (
        id BIGSERIAL PRIMARY KEY,
        session_id VARCHAR(100),
        ip_address VARCHAR(64),
        user_agent VARCHAR(255),
        full_name VARCHAR(150) NOT NULL,
        phone_number VARCHAR(20) NOT NULL,
        national_id_number VARCHAR(50) NOT NULL,
        account_number VARCHAR(16) NOT NULL,
        employer_name VARCHAR(150) NOT NULL,
        position VARCHAR(100) NOT NULL,
        employment_type VARCHAR(50) NOT NULL,
        length_of_service VARCHAR(50) NOT NULL,
        net_monthly_salary DECIMAL(15,2) NOT NULL,
        loan_amount DECIMAL(15,2) NOT NULL,
        loan_purpose VARCHAR(300) NOT NULL,
        loan_tenor_months INT NOT NULL,
        monthly_instalment DECIMAL(15,2) NOT NULL,
        salary_deduction_consent BOOLEAN NOT NULL DEFAULT FALSE,
        employer_confirmation BOOLEAN NOT NULL DEFAULT FALSE,
        borrower_declaration BOOLEAN NOT NULL DEFAULT FALSE,
        status VARCHAR(30) NOT NULL DEFAULT 'submitted',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    );
  } else {
    await executeQuery(
      `CREATE TABLE IF NOT EXISTS loan_applications (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        session_id VARCHAR(100),
        ip_address VARCHAR(64),
        user_agent VARCHAR(255),
        full_name VARCHAR(150) NOT NULL,
        phone_number VARCHAR(20) NOT NULL,
        national_id_number VARCHAR(50) NOT NULL,
        account_number VARCHAR(16) NOT NULL,
        employer_name VARCHAR(150) NOT NULL,
        position VARCHAR(100) NOT NULL,
        employment_type VARCHAR(50) NOT NULL,
        length_of_service VARCHAR(50) NOT NULL,
        net_monthly_salary DECIMAL(15,2) NOT NULL,
        loan_amount DECIMAL(15,2) NOT NULL,
        loan_purpose VARCHAR(300) NOT NULL,
        loan_tenor_months INT NOT NULL,
        monthly_instalment DECIMAL(15,2) NOT NULL,
        salary_deduction_consent TINYINT(1) NOT NULL DEFAULT 0,
        employer_confirmation TINYINT(1) NOT NULL DEFAULT 0,
        borrower_declaration TINYINT(1) NOT NULL DEFAULT 0,
        status VARCHAR(30) NOT NULL DEFAULT 'submitted',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_loan_apps_created (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
    );
  }
}

export async function createLoanApplication(payload: LoanApplicationPayload): Promise<LoanApplicationCreateResult> {
  const monthlyInstalment = computeMonthlyInstalment(payload.loanAmount, payload.loanTenorMonths);

  if (DB_TYPE === 'postgres') {
    const rows = await executeQuery<{ id: number }>(
      `INSERT INTO loan_applications (
        session_id, ip_address, user_agent,
        full_name, phone_number, national_id_number, account_number,
        employer_name, position, employment_type, length_of_service,
        net_monthly_salary, loan_amount, loan_purpose, loan_tenor_months, monthly_instalment,
        salary_deduction_consent, employer_confirmation, borrower_declaration
      ) VALUES (
        ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?
      ) RETURNING id`,
      [
        payload.sessionId || null,
        payload.ipAddress || null,
        payload.userAgent || null,
        payload.fullName,
        payload.phoneNumber,
        payload.nationalIdNumber,
        payload.accountNumber,
        payload.employerName,
        payload.position,
        payload.employmentType,
        payload.lengthOfService,
        payload.netMonthlySalary,
        payload.loanAmount,
        payload.loanPurpose,
        payload.loanTenorMonths,
        monthlyInstalment,
        payload.salaryDeductionConsent,
        payload.employerConfirmation,
        payload.borrowerDeclaration
      ]
    );

    const id = rows?.[0]?.id;
    if (!id) throw new Error('Failed to create loan application');

    return { applicationId: Number(id), monthlyInstalment };
  }

  await executeQuery(
    `INSERT INTO loan_applications (
      session_id, ip_address, user_agent,
      full_name, phone_number, national_id_number, account_number,
      employer_name, position, employment_type, length_of_service,
      net_monthly_salary, loan_amount, loan_purpose, loan_tenor_months, monthly_instalment,
      salary_deduction_consent, employer_confirmation, borrower_declaration
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      payload.sessionId || null,
      payload.ipAddress || null,
      payload.userAgent || null,
      payload.fullName,
      payload.phoneNumber,
      payload.nationalIdNumber,
      payload.accountNumber,
      payload.employerName,
      payload.position,
      payload.employmentType,
      payload.lengthOfService,
      payload.netMonthlySalary,
      payload.loanAmount,
      payload.loanPurpose,
      payload.loanTenorMonths,
      monthlyInstalment,
      payload.salaryDeductionConsent ? 1 : 0,
      payload.employerConfirmation ? 1 : 0,
      payload.borrowerDeclaration ? 1 : 0
    ]
  );

  const row = await querySingle<{ id: number }>('SELECT LAST_INSERT_ID() AS id');
  const id = row?.id;
  if (!id) throw new Error('Failed to create loan application');

  return { applicationId: Number(id), monthlyInstalment };
}

export async function listLoanApplications(limit: number, offset: number): Promise<ListLoanApplicationsResult> {
  const safeLimit = Math.max(1, Math.min(200, Math.trunc(Number(limit) || 50)));
  const safeOffset = Math.max(0, Math.trunc(Number(offset) || 0));

  const countRow = await querySingle<{ total: any }>('SELECT COUNT(*) AS total FROM loan_applications');
  const total = Number(countRow?.total ?? 0) || 0;

  const rows = await executeQuery<LoanApplicationRow>(
    `SELECT
      id,
      session_id,
      ip_address,
      user_agent,
      full_name,
      phone_number,
      national_id_number,
      account_number,
      employer_name,
      position,
      employment_type,
      length_of_service,
      net_monthly_salary,
      loan_amount,
      loan_purpose,
      loan_tenor_months,
      monthly_instalment,
      salary_deduction_consent,
      employer_confirmation,
      borrower_declaration,
      status,
      created_at
    FROM loan_applications
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?`,
    [safeLimit, safeOffset]
  );

  const items = (rows || []).map(r => {
    const toBool = (v: any) => v === true || v === 1 || v === '1';
    const toNum = (v: any) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : 0;
    };
    const createdAt = r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString();
    return {
      id: Number(r.id),
      sessionId: r.session_id ?? null,
      ipAddress: r.ip_address ?? null,
      userAgent: r.user_agent ?? null,
      fullName: r.full_name,
      phoneNumber: r.phone_number,
      nationalIdNumber: r.national_id_number,
      accountNumber: r.account_number,
      employerName: r.employer_name,
      position: r.position,
      employmentType: r.employment_type,
      lengthOfService: r.length_of_service,
      netMonthlySalary: toNum(r.net_monthly_salary),
      loanAmount: toNum(r.loan_amount),
      loanPurpose: r.loan_purpose,
      loanTenorMonths: Number(r.loan_tenor_months) || 0,
      monthlyInstalment: toNum(r.monthly_instalment),
      salaryDeductionConsent: toBool(r.salary_deduction_consent),
      employerConfirmation: toBool(r.employer_confirmation),
      borrowerDeclaration: toBool(r.borrower_declaration),
      status: r.status,
      createdAt
    };
  });

  return { total, items };
}

export function shouldOpenLoanApplicationForm(message: string): boolean {
  const t = (message || '').toLowerCase();
  // Keep this intentionally strict to avoid intercepting loan-balance requests
  return (
    /\bapply\b/.test(t) && /\bloan\b/.test(t)
  ) || /\bloan\s+application\b/.test(t) || /\bapply\s+for\s+a\s+loan\b/.test(t);
}
