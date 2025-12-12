/**
 * Customer Authentication Module
 * Handles customer identification and session management for account inquiries
 * Integrated with MySQL database
 */

import { executeQuery, querySingle } from './database';

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
} {
  const details: any = {};
  
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
 * Queries the customers table to verify account details
 */
export async function validateCredentials(
  accountNumber: string,
  phoneNumber?: string,
  dateOfBirth?: string
): Promise<{ valid: boolean; reason?: string; customerName?: string }> {
  try {
    // Build query based on provided information
    let query = `
      SELECT 
        account_number, 
        account_name, 
        phone_number,
        date_of_birth,
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
    
    // Add DOB verification if provided
    if (dateOfBirth) {
      query += ' AND DATE_FORMAT(date_of_birth, "%d/%m/%Y") = ?';
      params.push(dateOfBirth);
    }
    
    const customer = await querySingle<any>(query, params);
    
    if (!customer) {
      console.log('[Auth] No customer found with provided credentials');
      return {
        valid: false,
        reason: "Invalid account details. Please verify your account number" + 
                (phoneNumber ? " and phone number" : "") + 
                (dateOfBirth ? " and date of birth" : "") + "."
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
      customerName: customer.account_name
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
  
  if (missing.length === 0) {
    return "Please confirm your date of birth (DD/MM/YYYY) to proceed.";
  }
  
  if (missing.length === 2) {
    return "To check your account information, I need to verify your identity. Please provide your account number and registered phone number.";
  }
  
  return `Please provide your ${missing[0]} to continue.`;
}

/**
 * Attempt to authenticate customer
 */
export async function authenticateCustomer(
  sessionId: string,
  accountNumber?: string,
  phoneNumber?: string,
  dateOfBirth?: string
): Promise<{ success: boolean; message: string; session: CustomerSession }> {
  const session = getOrCreateSession(sessionId);
  
  // Update session with provided details
  if (accountNumber) session.accountNumber = accountNumber;
  if (phoneNumber) session.phoneNumber = phoneNumber;
  if (dateOfBirth) session.dateOfBirth = dateOfBirth;
  
  // Check if we have minimum required info
  if (!session.accountNumber) {
    return {
      success: false,
      message: generateAuthPrompt(session),
      session
    };
  }
  
  // Increment attempt counter
  session.attempts++;
  
  if (session.attempts > MAX_AUTH_ATTEMPTS) {
    return {
      success: false,
      message: "Maximum authentication attempts exceeded. Please visit any branch or call +233 20 205 5170 for assistance.",
      session
    };
  }
  
  // Validate credentials
  const validation = await validateCredentials(
    session.accountNumber,
    session.phoneNumber,
    session.dateOfBirth
  );
  
  if (validation.valid) {
    session.isAuthenticated = true;
    session.authenticatedAt = new Date();
    session.expiresAt = new Date(Date.now() + SESSION_TIMEOUT);
    sessions.set(sessionId, session);
    
    return {
      success: true,
      message: `Welcome back! I've verified your identity. How can I help you with your account today?`,
      session
    };
  }
  
  return {
    success: false,
    message: validation.reason || "Unable to verify your details. Please try again or contact customer service at +233 20 205 5170.",
    session
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
