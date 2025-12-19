/**
 * Account Opening Applications Module
 * Handles account opening requests from non-customers
 */

import { executeQuery } from './database.js';

export interface AccountOpeningPayload {
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  
  // Personal Information
  fullName?: string;
  dateOfBirth?: string;
  gender?: string;
  maritalStatus?: string;
  
  // Contact Information
  phoneNumber?: string;
  email?: string;
  residentialAddress?: string;
  digitalAddress?: string;
  postalAddress?: string;
  
  // Identification
  ghanaCardNumber?: string;
  
  // Employment Information
  occupation?: string;
  employerName?: string;
  monthlyIncome?: string | number;
  sourceOfFunds?: string;
  
  // Account Details
  accountType?: string;
  modeOfOperation?: string;
  initialDeposit?: string | number;
  
  // Next of Kin
  nextOfKinName?: string;
  nextOfKinRelationship?: string;
  nextOfKinPhone?: string;
  
  // Consents
  specimenSignatureAcknowledged?: boolean;
  customerDeclaration?: boolean;
  termsAccepted?: boolean;
  dataProcessingConsent?: boolean;
}

export interface AccountOpeningValidation {
  ok: boolean;
  error?: string;
}

function requiredString(val: any): string {
  if (typeof val === 'string') return val.trim();
  if (typeof val === 'number') return String(val).trim();
  return '';
}

function requiredNumber(val: any): number {
  const n = Number(val);
  return Number.isFinite(n) ? n : NaN;
}

function normalizePhone(val: any): string {
  const str = requiredString(val);
  if (!str) return '';
  
  // Remove non-digit characters except +
  const cleaned = str.replace(/[^\d+]/g, '');
  
  // Validate Ghana phone formats
  if (cleaned.startsWith('+233')) {
    const digits = cleaned.replace(/\D/g, '');
    return digits.length === 12 ? cleaned : '';
  }
  if (cleaned.startsWith('233')) {
    return cleaned.replace(/\D/g, '').length === 12 ? cleaned : '';
  }
  if (cleaned.startsWith('0')) {
    return cleaned.replace(/\D/g, '').length === 10 ? cleaned : '';
  }
  
  return '';
}

function validateEmail(val: any): string {
  const str = requiredString(val);
  if (!str) return '';
  
  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(str) ? str : '';
}

/**
 * Validate account opening payload
 */
export function validateAccountOpeningPayload(payload: AccountOpeningPayload): AccountOpeningValidation {
  const fullName = requiredString(payload?.fullName);
  const dateOfBirth = requiredString(payload?.dateOfBirth);
  const gender = requiredString(payload?.gender);
  const maritalStatus = requiredString(payload?.maritalStatus);
  
  const phoneNumber = normalizePhone(payload?.phoneNumber);
  const email = validateEmail(payload?.email);
  const residentialAddress = requiredString(payload?.residentialAddress);
  const digitalAddress = requiredString(payload?.digitalAddress);
  const postalAddress = requiredString(payload?.postalAddress);
  
  const ghanaCardNumber = requiredString(payload?.ghanaCardNumber);
  
  const occupation = requiredString(payload?.occupation);
  const employerName = requiredString(payload?.employerName);
  const monthlyIncome = requiredNumber(payload?.monthlyIncome);
  const sourceOfFunds = requiredString(payload?.sourceOfFunds);
  
  const accountType = requiredString(payload?.accountType);
  const modeOfOperation = requiredString(payload?.modeOfOperation);
  const initialDeposit = requiredNumber(payload?.initialDeposit);
  
  const nextOfKinName = requiredString(payload?.nextOfKinName);
  const nextOfKinRelationship = requiredString(payload?.nextOfKinRelationship);
  const nextOfKinPhone = normalizePhone(payload?.nextOfKinPhone);
  
  // Collect all validation errors
  const errors: string[] = [];
  
  if (!fullName) errors.push('Full Name');
  if (!dateOfBirth) errors.push('Date of Birth');
  if (!gender) errors.push('Gender');
  if (!maritalStatus) errors.push('Marital Status');
  
  if (!phoneNumber) errors.push('Mobile Phone Number (must be valid Ghana format)');
  if (!email) errors.push('Email Address (must be valid format)');
  if (!residentialAddress) errors.push('Residential Address');
  if (!digitalAddress) errors.push('Digital Address (Ghana Post GPS)');
  if (!postalAddress) errors.push('Postal Address');
  
  if (!ghanaCardNumber) errors.push('Ghana Card Number');
  
  if (!occupation) errors.push('Occupation');
  if (!employerName) errors.push('Employer Name');
  if (!Number.isFinite(monthlyIncome) || monthlyIncome <= 0) {
    errors.push('Monthly Income (must be a valid amount)');
  }
  if (!sourceOfFunds) errors.push('Source of Funds');
  
  if (!accountType) errors.push('Account Type');
  if (!modeOfOperation) errors.push('Mode of Operation');
  if (!Number.isFinite(initialDeposit) || initialDeposit < 0) {
    errors.push('Initial Deposit (must be a valid amount)');
  }
  
  if (!nextOfKinName) errors.push('Next of Kin Name');
  if (!nextOfKinRelationship) errors.push('Next of Kin Relationship');
  if (!nextOfKinPhone) errors.push('Next of Kin Phone (must be valid Ghana format)');
  
  const specimenSignatureAcknowledged = !!payload?.specimenSignatureAcknowledged;
  const customerDeclaration = !!payload?.customerDeclaration;
  const termsAccepted = !!payload?.termsAccepted;
  const dataProcessingConsent = !!payload?.dataProcessingConsent;
  
  if (!specimenSignatureAcknowledged) errors.push('Specimen Signature Acknowledgement');
  if (!customerDeclaration) errors.push('Customer Declaration');
  if (!termsAccepted) errors.push('Terms and Conditions Acceptance');
  if (!dataProcessingConsent) errors.push('Data Processing Consent');
  
  if (errors.length > 0) {
    const errorMsg = errors.length === 1 
      ? `${errors[0]} is required.`
      : `Please fill in the following fields: ${errors.join(', ')}.`;
    return { ok: false, error: errorMsg };
  }
  
  return { ok: true };
}

/**
 * Create account opening application in database
 */
export async function createAccountOpening(payload: AccountOpeningPayload): Promise<{ ok: boolean; applicationId?: number; error?: string }> {
  const validation = validateAccountOpeningPayload(payload);
  if (!validation.ok) {
    return { ok: false, error: validation.error };
  }
  
  try {
    const sql = `
      INSERT INTO account_openings (
        session_id, ip_address, user_agent,
        full_name, date_of_birth, gender, marital_status,
        phone_number, email, residential_address, digital_address, postal_address,
        ghana_card_number,
        occupation, employer_name, monthly_income, source_of_funds,
        account_type, mode_of_operation, initial_deposit,
        next_of_kin_name, next_of_kin_relationship, next_of_kin_phone,
        specimen_signature_acknowledged, customer_declaration,
        terms_accepted, data_processing_consent,
        status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW())
    `;
    
    const values = [
      payload.sessionId || null,
      payload.ipAddress || null,
      payload.userAgent || null,
      payload.fullName,
      payload.dateOfBirth,
      payload.gender,
      payload.maritalStatus,
      payload.phoneNumber,
      payload.email,
      payload.residentialAddress,
      payload.digitalAddress,
      payload.postalAddress,
      payload.ghanaCardNumber,
      payload.occupation,
      payload.employerName,
      Number(payload.monthlyIncome),
      payload.sourceOfFunds,
      payload.accountType,
      payload.modeOfOperation,
      Number(payload.initialDeposit),
      payload.nextOfKinName,
      payload.nextOfKinRelationship,
      payload.nextOfKinPhone,
      payload.specimenSignatureAcknowledged ? 1 : 0,
      payload.customerDeclaration ? 1 : 0,
      payload.termsAccepted ? 1 : 0,
      payload.dataProcessingConsent ? 1 : 0
    ];
    
    const result = await executeQuery(sql, values);
    const applicationId = (result as any).insertId;
    
    console.log(`[AccountOpening] Created application ID: ${applicationId}`);
    
    return { ok: true, applicationId };
  } catch (error: any) {
    console.error('[AccountOpening] Database error:', error);
    console.error('[AccountOpening] Error details:', {
      message: error?.message,
      code: error?.code,
      sqlState: error?.sqlState,
      sqlMessage: error?.sqlMessage
    });
    
    // Return more detailed error message for debugging
    const errorMsg = error?.sqlMessage || error?.message || 'Database error while creating account opening application.';
    return { ok: false, error: errorMsg };
  }
}

/**
 * List all account opening applications (for admin)
 */
export async function listAccountOpenings(limit = 100): Promise<any[]> {
  try {
    const sql = `
      SELECT 
        id, session_id, full_name, phone_number, email, account_type,
        initial_deposit, status, created_at
      FROM account_openings
      ORDER BY created_at DESC
      LIMIT ?
    `;
    
    const rows = await executeQuery(sql, [limit]);
    return Array.isArray(rows) ? rows : [];
  } catch (error) {
    console.error('[AccountOpening] Error listing applications:', error);
    return [];
  }
}

/**
 * Get account opening by ID (for admin)
 */
export async function getAccountOpeningById(id: number): Promise<any> {
  try {
    const sql = `SELECT * FROM account_openings WHERE id = ?`;
    const rows = await executeQuery(sql, [id]);
    return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
  } catch (error) {
    console.error('[AccountOpening] Error fetching application:', error);
    return null;
  }
}

/**
 * Determine if the user wants to open an account
 * Only for non-customers
 */
export function shouldOpenAccountOpeningForm(message: string, isCustomer?: boolean): boolean {
  // Only show to non-customers
  if (isCustomer === true) {
    return false;
  }
  
  const lowerMsg = (message || '').toLowerCase().trim();
  
  const triggers = [
    'open account',
    'open an account',
    'create account',
    'new account',
    'i want to open',
    'want to open account',
    'how to open account',
    'opening account',
    'sign up',
    'become a customer',
    'join the bank',
    'register account'
  ];
  
  return triggers.some(trigger => lowerMsg.includes(trigger));
}
