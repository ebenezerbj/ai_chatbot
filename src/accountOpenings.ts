/**
 * Account Opening Applications Module
 * Handles account opening requests from non-customers
 */

import { executeQuery } from './database.js';
import axios from 'axios';
import https from 'https';
import fs from 'fs';
import path from 'path';

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
    // Import DB_TYPE to determine database
    const { DB_TYPE } = await import('./database.js');
    
    // For PostgreSQL, use RETURNING id; for MySQL, use standard INSERT
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
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ${DB_TYPE === 'postgres' ? 'CURRENT_TIMESTAMP' : 'NOW()'})
      ${DB_TYPE === 'postgres' ? 'RETURNING id' : ''}
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
      DB_TYPE === 'postgres' 
        ? payload.specimenSignatureAcknowledged 
        : (payload.specimenSignatureAcknowledged ? 1 : 0),
      DB_TYPE === 'postgres' 
        ? payload.customerDeclaration 
        : (payload.customerDeclaration ? 1 : 0),
      DB_TYPE === 'postgres' 
        ? payload.termsAccepted 
        : (payload.termsAccepted ? 1 : 0),
      DB_TYPE === 'postgres' 
        ? payload.dataProcessingConsent 
        : (payload.dataProcessingConsent ? 1 : 0)
    ];
    
    const result = await executeQuery(sql, values);
    
    // Get application ID - different for PostgreSQL vs MySQL
    let applicationId: number;
    if (DB_TYPE === 'postgres') {
      // PostgreSQL returns the row with RETURNING id
      applicationId = result[0]?.id;
    } else {
      // MySQL returns insertId in the result metadata
      applicationId = (result as any).insertId;
    }
    
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
        id,
        session_id as "sessionId",
        full_name as "fullName",
        phone_number as "phoneNumber",
        email,
        ghana_card_number as "ghanaCardNumber",
        account_type as "accountType",
        initial_deposit as "initialDeposit",
        status,
        created_at as "createdAt"
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
  // Only show to confirmed non-customers (not undefined or true)
  if (isCustomer !== false) {
    return false;
  }
  
  const lowerMsg = (message || '').toLowerCase().trim();
  
  const triggers = [
    'open account',
    'open an account',
    'create account',
    'new account',
    'i want to open account',
    'i want to open an account',
    'want to open account',
    'want to open an account',
    'how to open account',
    'how do i open account',
    'opening account',
    'opening an account',
    'sign up',
    'become a customer',
    'join the bank',
    'register account'
  ];
  
  // Exclude vague phrases that need clarification first
  const vagueExclusions = [
    'i want to open something',
    'open something',
    'something for my future',
    'for my future'
  ];
  
  // Don't trigger on vague requests
  if (vagueExclusions.some(exclusion => lowerMsg.includes(exclusion))) {
    return false;
  }
  
  return triggers.some(trigger => lowerMsg.includes(trigger));
}

/**
 * Update the status of an account opening application
 */
export async function updateAccountOpeningStatus(
  applicationId: number,
  newStatus: string
): Promise<boolean> {
  // Validate status
  const validStatuses = ['pending', 'under_review', 'approved', 'rejected', 'completed', 'cancelled'];
  if (!validStatuses.includes(newStatus)) {
    throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
  }

  try {
    // Get customer details before updating
    const getCustomerSql = `
      SELECT full_name, phone_number, email 
      FROM account_openings 
      WHERE id = ?
    `;
    const customerResult = await executeQuery(getCustomerSql, [applicationId]);
    
    if (!customerResult || customerResult.length === 0) {
      throw new Error('Application not found');
    }

    const customer = customerResult[0];
    const customerName = customer.full_name || customer.fullName || 'Customer';
    const phoneNumber = customer.phone_number || customer.phoneNumber;

    // Update status
    const updateSql = `
      UPDATE account_openings 
      SET status = ?
      WHERE id = ?
    `;
    await executeQuery(updateSql, [newStatus, applicationId]);

    // Send SMS notification if phone number exists
    if (phoneNumber) {
      await sendStatusUpdateSMS(customerName, phoneNumber, newStatus, applicationId);
    }

    return true;
  } catch (error) {
    console.error('[AccountOpenings] Failed to update status:', error);
    throw error;
  }
}

/**
 * Send SMS notification for status change
 */
async function sendStatusUpdateSMS(
  customerName: string,
  phoneNumber: string,
  status: string,
  applicationId: number
): Promise<void> {
  try {
    const apiKey = process.env.SMS_ONLINE_API_KEY;
    const senderName = process.env.SMS_ONLINE_SENDER || 'AKCB';

    // Format status for customer-friendly message
    const statusMessages: Record<string, string> = {
      'pending': 'Your account opening application is pending review.',
      'under_review': 'Your account opening application is currently under review. We will update you soon.',
      'approved': 'Congratulations! Your account opening application has been approved. Please visit our branch to complete the process.',
      'rejected': 'We regret to inform you that your account opening application has been rejected. Please contact us for more details.',
      'completed': 'Your account has been successfully opened! Welcome to AKCB. Visit our branch to collect your account details.',
      'cancelled': 'Your account opening application has been cancelled.'
    };

    const statusMessage = statusMessages[status] || `Your account opening application status: ${status}`;
    const message = `Dear ${customerName}, ${statusMessage} Application Ref: #${applicationId}. Thank you for choosing AKCB.`;

    if (!apiKey) {
      console.log(`[AccountOpenings] SMS not configured. Would send: ${message} to ${phoneNumber}`);
      return;
    }

    // Format phone number for SMS Online Ghana (233XXXXXXXXX format)
    let formattedPhone = phoneNumber;
    if (phoneNumber.startsWith('0')) {
      formattedPhone = '233' + phoneNumber.substring(1);
    } else if (phoneNumber.startsWith('+233')) {
      formattedPhone = phoneNumber.substring(1);
    } else if (!phoneNumber.startsWith('233')) {
      formattedPhone = '233' + phoneNumber;
    }

    // Prepare SMS request
    const smsData = {
      text: message,
      type: 0,
      sender: senderName,
      destinations: [formattedPhone]
    };

    // Create HTTPS agent
    let httpsAgent;
    const cacertPath = path.join(process.cwd(), 'cacert.pem');
    
    if (fs.existsSync(cacertPath)) {
      const ca = fs.readFileSync(cacertPath);
      httpsAgent = new https.Agent({ ca, rejectUnauthorized: true });
    } else {
      httpsAgent = new https.Agent({ rejectUnauthorized: true });
    }

    // Send SMS
    const response = await axios.post(
      'https://api.smsonlinegh.com/v5/message/sms/send',
      smsData,
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Host': 'api.smsonlinegh.com',
          'Authorization': `key ${apiKey}`
        },
        httpsAgent,
        timeout: 10000
      }
    );

    if (response.status === 200 && response.data.handshake?.id === 0) {
      console.log(`[AccountOpenings] Status update SMS sent to ${formattedPhone} for Application #${applicationId}`);
    } else {
      console.error('[AccountOpenings] SMS API returned non-success:', response.data);
    }
  } catch (error: any) {
    console.error('[AccountOpenings] Failed to send status update SMS:', error.response?.data || error.message);
    // Don't throw - SMS failure shouldn't prevent status update
  }
}
