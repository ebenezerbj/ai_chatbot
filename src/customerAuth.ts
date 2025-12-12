/**
 * Customer Authentication Module
 * Handles customer identification and session management for account inquiries
 * Integrated with MySQL database and OTP verification
 */

import { executeQuery, querySingle } from './database';
import * as otpService from './otpService';

export interface CustomerSession {
  sessionId: string;
  accountNumber?: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  lastFourDigits?: string;
  isAuthenticated: boolean;
  authenticatedAt?: Date;
  expiresAt: Date;
  attempts: number;
  conversationContext: string[];
  otpSessionKey?: string;
  awaitingOTP?: boolean;
  customerName?: string;
}

// In-memory session store (for production, use Redis or database)
const sessions = new Map<string, CustomerSession>();

// Session timeout: 15 minutes
const SESSION_TIMEOUT = 15 * 60 * 1000;
const MAX_AUTH_ATTEMPTS = 3;

/**
 * Create a new customer session
 */
export function createSession(sessionId: string): CustomerSession {
  const session: CustomerSession = {
    sessionId,
    isAuthenticated: false,
    expiresAt: new Date(Date.now() + SESSION_TIMEOUT),
    attempts: 0,
    conversationContext: []
  };
  
  sessions.set(sessionId, session);
  return session;
}

/**
 * Get existing session or create new one
 */
export function getOrCreateSession(sessionId: string): CustomerSession {
  let session = sessions.get(sessionId);
  
  if (!session) {
    session = createSession(sessionId);
  } else if (session.expiresAt < new Date()) {
    // Session expired, create new one
    session = createSession(sessionId);
  }
  
  return session;
}

/**
 * Check if customer is trying to access account information
 */
export function needsAuthentication(message: string): boolean {
  const authRequiredPatterns = [
    /\b(my|check|show|view|get|what('?s)?)\s+(account\s+)?(balance|statement|transaction|history)/i,
    /\bhow\s+much\s+(do\s+i\s+have|is\s+in\s+my\s+account)/i,
    /\b(account|balance|transaction|statement)\s+(check|enquiry|inquiry)/i,
    /\bcheck\s+my\s+balance/i,
    /\bshow\s+my\s+(recent|last)\s+transactions/i,
    /\bmini\s+statement/i,
    /\baccount\s+(details|information|number)/i
  ];
  
  return authRequiredPatterns.some(pattern => pattern.test(message));
}

/**
 * Extract authentication details from message
 */
export function extractAuthDetails(message: string): {
  accountNumber?: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  otp?: string;
} {
  const details: any = {};
  
  // OTP patterns (6 digits)
  // Handles: "OTP: 123456", "Code: 123456", "123456"
  let otpMatch = message.match(/(?:otp|code|verification|pin)\s*[:=]?\s*(\d{6})\b/i);
  if (otpMatch) {
    details.otp = otpMatch[1];
  } else {
    // Try plain 6-digit match if no prefix found (and message is short)
    if (message.length <= 20) {
      otpMatch = message.match(/\b\d{6}\b/);
      if (otpMatch) {
        details.otp = otpMatch[0];
      }
    }
  }
  
  // Account number patterns (various formats)
  // Handles: "Account: 1234567890", "Account 1234567890", "Acct: 1234567890", "1234567890"
  let accountMatch = message.match(/(?:account|acct|acc)\s*(?:number|no|#)?\s*[:=]?\s*(\d{10,16})/i);
  if (accountMatch) {
    details.accountNumber = accountMatch[1];
  } else {
    // Try plain number match if no prefix found
    accountMatch = message.match(/\b\d{10,16}\b/);
    if (accountMatch) {
      details.accountNumber = accountMatch[0];
    }
  }
  
  // Phone number (Ghana format)
  // Handles: "Phone: 0242123456", "Phone 0242123456", "0242123456"
  let phoneMatch = message.match(/(?:phone|tel|mobile|contact)\s*(?:number|no|#)?\s*[:=]?\s*((0|\+233)\d{9})/i);
  if (phoneMatch) {
    details.phoneNumber = phoneMatch[1];
  } else {
    // Try plain phone match if no prefix found
    phoneMatch = message.match(/\b(0|\+233)\d{9}\b/);
    if (phoneMatch) {
      details.phoneNumber = phoneMatch[0];
    }
  }
  
  // Date of birth (various formats)
  // Handles: "DOB: 15/05/1990", "Date of birth: 15/05/1990", "15/05/1990"
  let dobMatch = message.match(/(?:dob|date\s*of\s*birth|birth\s*date)\s*[:=]?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i);
  if (dobMatch) {
    details.dateOfBirth = dobMatch[1];
  } else {
    // Try plain date match if no prefix found
    dobMatch = message.match(/\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})\b/);
    if (dobMatch) {
      details.dateOfBirth = dobMatch[0];
    }
  }
  
  console.log('[Auth] Extracted details from message:', details);
  return details;
}

/**
 * Validate customer credentials against database
 * Queries the customers table to verify account and phone number only
 */
export async function validateCredentials(
  accountNumber: string,
  phoneNumber?: string
): Promise<{ valid: boolean; reason?: string; customerName?: string; phoneNumber?: string }> {
  try {
    // Build query to verify account number and phone number
    let query = `
      SELECT 
        account_number, 
        account_name, 
        phone_number,
        account_type,
        status
      FROM customers 
      WHERE account_number = ?
    `;
    const params: any[] = [accountNumber];
    
    // Add phone verification if provided
    if (phoneNumber) {
      query += ' AND phone_number = ?';
      params.push(phoneNumber);
    }
    
    const customer = await querySingle<any>(query, params);
    
    if (!customer) {
      console.log('[Auth] No customer found with provided credentials');
      return {
        valid: false,
        reason: "Invalid account details. Please verify your account number" + 
                (phoneNumber ? " and phone number" : "") + "."
      };
    }
    
    // Check account status
    if (customer.status !== 'Active') {
      console.log('[Auth] Account not active:', customer.status);
      return {
        valid: false,
        reason: `Your account is ${customer.status.toLowerCase()}. Please visit any branch or call +233 20 205 5170 for assistance.`
      };
    }
    
    console.log('[Auth] Customer validated successfully:', customer.account_name);
    return {
      valid: true,
      customerName: customer.account_name,
      phoneNumber: customer.phone_number
    };
  } catch (error: any) {
    console.error('[Auth] Database error during validation:', error.message);
    return {
      valid: false,
      reason: "Unable to verify your details at this time. Please try again later or contact customer service at +233 20 205 5170."
    };
  }
}

/**
 * Generate authentication prompt based on what's missing
 */
export function generateAuthPrompt(session: CustomerSession): string {
  const missing: string[] = [];
  
  if (!session.accountNumber) {
    missing.push("account number");
  }
  if (!session.phoneNumber) {
    missing.push("registered phone number");
  }
  
  if (missing.length === 2) {
    return "To check your account information, I need to verify your identity. Please provide your account number and registered phone number.";
  }
  
  if (missing.length === 1) {
    return `Please provide your ${missing[0]} to continue.`;
  }
  
  return "Please provide your account number and phone number.";
}

/**
 * Attempt to authenticate customer with OTP flow
 */
export async function authenticateCustomer(
  sessionId: string,
  accountNumber?: string,
  phoneNumber?: string,
  otp?: string
): Promise<{ success: boolean; message: string; session: CustomerSession; awaitingOTP?: boolean }> {
  const session = getOrCreateSession(sessionId);
  
  // If OTP is provided, verify it
  if (otp && session.otpSessionKey) {
    const verification = otpService.verifyOTP(session.otpSessionKey, otp);
    
    if (verification.success) {
      session.isAuthenticated = true;
      session.authenticatedAt = new Date();
      session.expiresAt = new Date(Date.now() + SESSION_TIMEOUT);
      session.awaitingOTP = false;
      sessions.set(sessionId, session);
      
      return {
        success: true,
        message: `Welcome back${session.customerName ? ', ' + session.customerName.split(' ')[0] : ''}! Your identity has been verified. How can I help you with your account today?`,
        session,
        awaitingOTP: false
      };
    } else {
      return {
        success: false,
        message: verification.message,
        session,
        awaitingOTP: true
      };
    }
  }
  
  // Update session with provided details
  if (accountNumber) session.accountNumber = accountNumber;
  if (phoneNumber) session.phoneNumber = phoneNumber;
  
  // Check if we have minimum required info (account number and phone)
  if (!session.accountNumber || !session.phoneNumber) {
    return {
      success: false,
      message: generateAuthPrompt(session),
      session,
      awaitingOTP: false
    };
  }
  
  // Increment attempt counter
  session.attempts++;
  
  if (session.attempts > MAX_AUTH_ATTEMPTS) {
    return {
      success: false,
      message: "Maximum authentication attempts exceeded. Please visit any branch or call +233 20 205 5170 for assistance.",
      session,
      awaitingOTP: false
    };
  }
  
  // Validate credentials (account number + phone number)
  const validation = await validateCredentials(
    session.accountNumber,
    session.phoneNumber
  );
  
  if (validation.valid) {
    // Send OTP
    session.customerName = validation.customerName;
    const otpResult = await otpService.generateAndSendOTP(
      session.accountNumber,
      validation.phoneNumber || session.phoneNumber,
      validation.customerName
    );
    
    if (otpResult.success) {
      session.otpSessionKey = otpResult.sessionKey;
      session.awaitingOTP = true;
      sessions.set(sessionId, session);
      
      return {
        success: false,
        message: otpResult.message,
        session,
        awaitingOTP: true
      };
    } else {
      return {
        success: false,
        message: otpResult.message,
        session,
        awaitingOTP: false
      };
    }
  }
  
  return {
    success: false,
    message: validation.reason || "Unable to verify your details. Please check your account number and phone number.",
    session,
    awaitingOTP: false
  };
}

/**
 * Check if session is authenticated and valid
 */
export function isSessionAuthenticated(sessionId: string): boolean {
  const session = sessions.get(sessionId);
  
  if (!session) return false;
  if (!session.isAuthenticated) return false;
  if (session.expiresAt < new Date()) {
    // Session expired
    session.isAuthenticated = false;
    return false;
  }
  
  return true;
}

/**
 * Get customer account data from database
 * Retrieves balance and recent transactions
 */
export async function getCustomerAccountData(accountNumber: string): Promise<any> {
  try {
    // Get customer basic info
    const customer = await querySingle<any>(
      `SELECT 
        account_number,
        account_name,
        account_type,
        branch_code,
        status
      FROM customers 
      WHERE account_number = ?`,
      [accountNumber]
    );
    
    if (!customer) {
      throw new Error('Customer not found');
    }
    
    // Get account balance
    const balance = await querySingle<any>(
      `SELECT 
        ledger_balance,
        available_balance,
        currency
      FROM account_balances 
      WHERE account_number = ?`,
      [accountNumber]
    );
    
    // Get recent transactions (last 10)
    const transactions = await executeQuery<any>(
      `SELECT 
        DATE_FORMAT(transaction_date, '%Y-%m-%d') as date,
        description,
        CASE 
          WHEN debit_amount > 0 THEN -debit_amount
          ELSE credit_amount
        END as amount,
        balance_after as balance,
        reference_number
      FROM transactions 
      WHERE account_number = ? 
      ORDER BY transaction_date DESC, id DESC
      LIMIT 10`,
      [accountNumber]
    );
    
    return {
      accountNumber: customer.account_number,
      accountName: customer.account_name,
      accountType: customer.account_type,
      branchCode: customer.branch_code,
      balance: {
        ledger: balance ? parseFloat(balance.ledger_balance) : 0,
        available: balance ? parseFloat(balance.available_balance) : 0,
        currency: balance?.currency || 'GHS'
      },
      recentTransactions: transactions.map(txn => ({
        date: txn.date,
        description: txn.description,
        amount: parseFloat(txn.amount),
        balance: parseFloat(txn.balance),
        reference: txn.reference_number
      }))
    };
  } catch (error: any) {
    console.error('[Auth] Error fetching account data:', error.message);
    throw new Error('Unable to retrieve account information at this time.');
  }
}

/**
 * Format account balance response
 */
export function formatBalanceResponse(accountData: any): string {
  return `**Account Balance**\n\n` +
    `Account: ${accountData.accountNumber}\n` +
    `Name: ${accountData.accountName}\n` +
    `Type: ${accountData.accountType}\n\n` +
    `Available Balance: GHS ${accountData.balance.available.toFixed(2)}\n` +
    `Ledger Balance: GHS ${accountData.balance.ledger.toFixed(2)}\n\n` +
    `Is there anything else you'd like to know about your account?`;
}

/**
 * Format transaction history response
 */
export function formatTransactionsResponse(accountData: any): string {
  let response = `**Recent Transactions**\n\n`;
  
  accountData.recentTransactions.forEach((txn: any) => {
    const sign = txn.amount >= 0 ? '+' : '';
    response += `${txn.date}: ${txn.description}\n`;
    response += `Amount: ${sign}GHS ${txn.amount.toFixed(2)}\n`;
    response += `Balance: GHS ${txn.balance.toFixed(2)}\n\n`;
  });
  
  response += `For a detailed statement, please visit any branch or use our mobile banking app.`;
  
  return response;
}

/**
 * Clean up expired sessions (call periodically)
 */
export function cleanupExpiredSessions(): void {
  const now = new Date();
  for (const [sessionId, session] of sessions.entries()) {
    if (session.expiresAt < now) {
      sessions.delete(sessionId);
    }
  }
}

// Cleanup every 5 minutes
setInterval(cleanupExpiredSessions, 5 * 60 * 1000);
