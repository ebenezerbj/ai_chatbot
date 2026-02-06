/**
 * Customer Authentication Module
 * Handles customer identification and session management for account inquiries
 * Integrated with MySQL database and OTP verification
 */

import { executeQuery, querySingle, DB_TYPE } from './database';
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
  isCustomer?: boolean; // Track if user identified as customer or not
  customerIdentified?: boolean; // Track if we've asked the question
  visitorName?: string; // Track non-customer name for escalation support
  visitorPhone?: string; // Track non-customer phone for escalation support
  awaitingVisitorInfo?: boolean; // Waiting for non-customer form submission
  availableAccounts?: Array<{accountNumber: string; accountName: string; accountType: string}>; // Multiple accounts for selection
  awaitingAccountSelection?: boolean; // Waiting for user to select account
  requestedAction?: 'balance' | 'transactions' | 'loans' | 'account_details'; // Track what user originally asked for
}

// In-memory session store (for production, use Redis or database)
const sessions = new Map<string, CustomerSession>();

// Session timeout: 15 minutes
const SESSION_TIMEOUT = 15 * 60 * 1000;
const MAX_AUTH_ATTEMPTS = 3;

/**
 * Get an existing session
 */
export function getSession(sessionId: string): CustomerSession | undefined {
  cleanupExpiredSessions();
  return sessions.get(sessionId);
}

/**
 * Create a new customer session
 */
export function createSession(sessionId: string): CustomerSession {
  const session: CustomerSession = {
    sessionId,
    isAuthenticated: false,
    expiresAt: new Date(Date.now() + SESSION_TIMEOUT),
    attempts: 0,
    conversationContext: [],
    // CRITICAL FIX: Ensure all visitor data is explicitly undefined for new sessions
    visitorName: undefined,
    visitorPhone: undefined,
    isCustomer: undefined,
    customerIdentified: undefined,
    awaitingVisitorInfo: undefined
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
    console.log(`[Session] Creating NEW session: ${sessionId.substring(0, 20)}...`);
    session = createSession(sessionId);
  } else if (session.expiresAt < new Date()) {
    // Session expired, create new one
    console.log(`[Session] Session EXPIRED, creating new: ${sessionId.substring(0, 20)}...`);
    // Delete the old expired session first to clear all data
    sessions.delete(sessionId);
    session = createSession(sessionId);
  } else {
    console.log(`[Session] Reusing EXISTING session: ${sessionId.substring(0, 20)}... (Visitor: ${session.visitorName || 'none'}, Customer: ${session.isCustomer})`);
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
    /\bshow\s+(me\s+)?my\s+(recent|last)\s+transactions/i,
    /\brecent\s+transactions/i,
    /\bmini\s+statement/i,
    /\baccount\s+(details|information|number)/i,
    /\b(my|check|show|view|get)\s+loan(s)?\s*(balance|status|details|payment)?/i,
    /\bhow\s+much\s+(do\s+i\s+)?owe/i,
    /\bloan\s+(balance|payment|maturity|duration)/i,
    /\bwhen\s+is\s+my\s+loan\s+due/i,
    /\bnext\s+loan\s+payment/i
  ];
  
  return authRequiredPatterns.some(pattern => pattern.test(message));
}

/**
 * Detect what the user is requesting (to preserve intent through authentication flow)
 */
export function detectRequestedAction(message: string): 'balance' | 'transactions' | 'loans' | 'account_details' | undefined {
  const lowerMessage = message.toLowerCase();
  
  // Check for transaction requests (most specific first)
  if (/(transaction|statement|history|mini.?statement)/i.test(message)) {
    return 'transactions';
  }
  
  // Check for loan requests
  if (/\b(loan|owe)\b/i.test(message) && !/\baccount\b/i.test(message)) {
    return 'loans';
  }
  
  // Check for balance requests
  if (/balance/i.test(message)) {
    return 'balance';
  }
  
  // Check for general account details
  if (/account\s+(details|information|info)/i.test(message)) {
    return 'account_details';
  }
  
  return undefined;
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
  
  // Phone number (Ghana format) - CHECK THIS FIRST before account numbers
  // Handles: "Phone: 0242123456", "233242123456", "0242123456", "+233242123456"
  let phoneMatch = message.match(/(?:phone|tel|mobile|contact)\s*(?:number|no|#)?\s*[:=]?\s*((0|\+?233)\d{9})/i);
  if (phoneMatch) {
    details.phoneNumber = phoneMatch[1];
  } else {
    // Try plain phone match if no prefix found
    // Matches: 0XXXXXXXXX (10 digits starting with 0) or 233XXXXXXXXX (12 digits starting with 233)
    phoneMatch = message.match(/\b(0\d{9}|233\d{9}|\+233\d{9})\b/);
    if (phoneMatch) {
      details.phoneNumber = phoneMatch[0];
    }
  }
  
  // Account number patterns (various formats) - Check AFTER phone numbers
  // Handles: "Account: 1234567890", "Account 1234567890", "Acct: 1234567890", "1234567890"
  // Skip if we already found a phone number
  if (!details.phoneNumber) {
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
 * Normalize phone number for flexible database matching
 * Handles: 0242123456, 233242123456, +233242123456, 2335013368 (partial)
 * Returns: Last 9 digits for flexible matching
 */
function normalizePhoneForMatching(phone: string): string {
  // Remove all non-numeric characters
  let cleaned = phone.replace(/\D/g, '');
  
  // Remove leading 233 if present
  if (cleaned.startsWith('233')) {
    cleaned = cleaned.substring(3);
  }
  
  // Remove leading 0 if present
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }
  
  // Return last 9 digits
  return cleaned.slice(-9);
}

/**
 * Validate customer credentials against database
 * Queries the customers table to verify either account number OR phone number
 */
export async function validateCredentials(
  accountNumber?: string,
  phoneNumber?: string
): Promise<{ 
  valid: boolean; 
  reason?: string; 
  customerName?: string; 
  phoneNumber?: string; 
  accountNumber?: string;
  multipleAccounts?: boolean;
  accounts?: Array<{accountNumber: string; accountName: string; accountType: string}>;
  requiresEscalation?: boolean;
}> {
  try {
    // Must have at least one identifier
    if (!accountNumber && !phoneNumber) {
      return {
        valid: false,
        reason: "Please provide either your account number or phone number."
      };
    }

    // Build query to verify either account number OR phone number
    let query = `
      SELECT 
        account_number, 
        account_name, 
        phone_number,
        account_type,
        status
      FROM customers 
      WHERE `;
    const params: any[] = [];
    const conditions: string[] = [];
    
    // Add account number condition if provided
    if (accountNumber) {
      conditions.push('account_number = ?');
      params.push(accountNumber);
    }
    
    // Add phone number condition if provided
    if (phoneNumber) {
      // Normalize phone for flexible matching (last 9 digits)
      const normalizedPhone = normalizePhoneForMatching(phoneNumber);
      conditions.push('(phone_number = ? OR RIGHT(phone_number, 9) = ? OR RIGHT(REPLACE(phone_number, \'233\', \'\'), 9) = ?)');
      params.push(phoneNumber, normalizedPhone, normalizedPhone);
    }
    
    query += conditions.join(' OR ');
    query += ' AND status = \'Active\' ORDER BY account_type, account_number';
    
    console.log('[Auth] Executing query:', query);
    console.log('[Auth] Query params:', params);
    
    // Use executeQuery to get ALL matching accounts (not just first one)
    const customers = await executeQuery<any>(query, params);
    
    if (!customers || customers.length === 0) {
      console.log('[Auth] No customer found with provided credentials');
      const identifier = accountNumber ? 'account number' : 'phone number';
      return {
        valid: false,
        reason: `No active account found with the provided ${identifier}. Please verify your details.`,
        requiresEscalation: true
      };
    }
    
    // If multiple accounts found (common with phone number auth)
    if (customers.length > 1) {
      console.log('[Auth] Multiple accounts found:', customers.length);
      
      // Check if phone number is available
      const firstCustomerPhone = customers[0].phone_number;
      if (!firstCustomerPhone || firstCustomerPhone.trim() === '') {
        console.log('[Auth] Multiple accounts found but no phone number on record');
        return {
          valid: false,
          reason: `We found ${customers.length} accounts associated with your details, but there's no phone number on record for verification.\n\nTo update your contact details and complete verification, please visit any AKCB branch with a valid ID. Our staff will help you update your information.\n\nWould you like me to connect you with a customer representative via live chat, or would you prefer to know the nearest branch location?`
        };
      }
      
      const accounts = customers.map(c => ({
        accountNumber: c.account_number,
        accountName: c.account_name,
        accountType: c.account_type
      }));
      
      return {
        valid: true,
        multipleAccounts: true,
        accounts: accounts,
        phoneNumber: firstCustomerPhone
      };
    }
    
    // Single account found
    const customer = customers[0];
    console.log('[Auth] Customer validated successfully:', customer.account_name);
    
    // Check if phone number is missing or empty
    if (!customer.phone_number || customer.phone_number.trim() === '') {
      console.log('[Auth] Customer account found but no phone number on record');
      return {
        valid: false,
        reason: `We found your account, but there's no phone number associated with it in our records.\n\nTo update your contact details and complete verification, please visit any AKCB branch with a valid ID. Our staff will help you update your information so you can access your account through our digital channels.\n\nWould you like me to connect you with a customer representative via live chat for more assistance, or would you prefer to know the nearest branch location?`,
        requiresEscalation: true
      };
    }
    
    return {
      valid: true,
      customerName: customer.account_name,
      phoneNumber: customer.phone_number,
      accountNumber: customer.account_number
    };
  } catch (error: any) {
    console.error('[Auth] Database error during validation:', error.message);
    console.error('[Auth] Full error:', error);
    console.error('[Auth] Stack:', error.stack);
    return {
      valid: false,
      reason: "I sincerely apologize for the inconvenience. I understand you're trying to verify your account, but I'm having technical difficulties accessing our systems right now. Would you like me to connect you with a customer representative via live chat, or would you prefer to leave a message?"
    };
  }
}

/**
 * Generate authentication prompt based on what's missing
 */
export function generateAuthPrompt(session: CustomerSession): string {
  if (!session.accountNumber && !session.phoneNumber) {
    return "To check your account information, I need to verify your identity. Please provide either your account number or registered phone number.";
  }
  
  // If they provided something, we're validating it
  return "Verifying your details...";
}

/**
 * Attempt to authenticate customer with OTP flow
 */
export async function authenticateCustomer(
  sessionId: string,
  accountNumber?: string,
  phoneNumber?: string,
  otp?: string
): Promise<{ success: boolean; message: string; session: CustomerSession; awaitingOTP?: boolean; requiresEscalation?: boolean }> {
  const session = getOrCreateSession(sessionId);
  
  // If OTP is provided, verify it
  if (otp && session.otpSessionKey) {
    const verification = otpService.verifyOTP(session.otpSessionKey, otp);
    
    if (verification.success) {
      session.awaitingOTP = false;
      
      // Check if customer has multiple accounts awaiting selection
      if (session.availableAccounts && session.availableAccounts.length > 0) {
        console.log('[Auth] OTP verified, now showing account selection');
        // NOW set the flag so buttons will show
        session.awaitingAccountSelection = true;
        sessions.set(sessionId, session);
        
        return {
          success: false,
          message: `OTP verified! ✓\n\nYou have ${session.availableAccounts.length} accounts registered. Please select which account you want to access:`,
          session,
          awaitingOTP: false
        };
      }
      
      // Single account - complete authentication
      session.isAuthenticated = true;
      session.authenticatedAt = new Date();
      session.expiresAt = new Date(Date.now() + SESSION_TIMEOUT);
      sessions.set(sessionId, session);
      
      // Get customer's first name for personalized greeting
      const firstName = session.customerName ? session.customerName.split(' ')[0] : '';
      const greeting = firstName ? `Welcome back, ${firstName}!` : 'Welcome back!';
      
      return {
        success: true,
        message: `${greeting} Your identity has been verified. How can I help you with your account today?`,
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
  
  // Check if we have minimum required info (either account number OR phone)
  if (!session.accountNumber && !session.phoneNumber) {
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
      message: "I sincerely apologize for the difficulty. I understand you've tried multiple times to verify your account, and I know this must be frustrating. For your security and to help resolve this quickly, would you like me to connect you with a customer representative via live chat, or would you prefer to leave a message for our security team?",
      session,
      awaitingOTP: false
    };
  }
  
  // Validate credentials (either account number OR phone number)
  const validation = await validateCredentials(
    session.accountNumber,
    session.phoneNumber
  );
  
  if (validation.valid) {
    // Check if customer has multiple accounts
    if (validation.multipleAccounts && validation.accounts) {
      console.log('[Auth] Customer has multiple accounts, sending OTP first for security');
      session.availableAccounts = validation.accounts;
      // Don't set awaitingAccountSelection yet - only after OTP verification
      session.phoneNumber = validation.phoneNumber;
      
      // Send OTP for verification BEFORE showing account numbers (security measure)
      const otpResult = await otpService.generateAndSendOTP(
        validation.phoneNumber!,
        validation.phoneNumber!,
        'Valued Customer'
      );
      
      if (otpResult.success) {
        session.otpSessionKey = otpResult.sessionKey;
        session.awaitingOTP = true;
        sessions.set(sessionId, session);
        
        return {
          success: false,
          message: `${otpResult.message}\n\nOnce verified, you'll be able to select from your ${validation.accounts.length} registered accounts.`,
          session,
          awaitingOTP: true
        };
      } else {
        sessions.set(sessionId, session);
        return {
          success: false,
          message: otpResult.message,
          session,
          awaitingOTP: false
        };
      }
    }
    
    // Update session with complete details from database (single account)
    session.accountNumber = validation.accountNumber;
    session.phoneNumber = validation.phoneNumber;
    session.customerName = validation.customerName;
    
    // Send OTP to the registered phone number
    const otpResult = await otpService.generateAndSendOTP(
      validation.accountNumber!,
      validation.phoneNumber!,
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
    message: validation.reason || "Unable to verify your details. Please check your account number or phone number.",
    session,
    awaitingOTP: false,
    requiresEscalation: validation.requiresEscalation
  };
}

/**
 * Check if session is authenticated and valid
 */
export function isSessionAuthenticated(sessionId: string): boolean {
  const session = sessions.get(sessionId);
  
  console.log('[Auth] isSessionAuthenticated check:', {
    sessionId,
    sessionExists: !!session,
    isAuthenticated: session?.isAuthenticated,
    expiresAt: session?.expiresAt,
    now: new Date(),
    expired: session ? session.expiresAt < new Date() : 'N/A'
  });
  
  if (!session) return false;
  if (!session.isAuthenticated) return false;
  if (session.expiresAt < new Date()) {
    // Session expired
    console.log('[Auth] ⚠️ Session expired');
    session.isAuthenticated = false;
    return false;
  }
  
  console.log('[Auth] ✅ Session is authenticated and valid');
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
        currency,
        last_updated
      FROM account_balances 
      WHERE account_number = ?`,
      [accountNumber]
    );
    
    // Get recent transactions (last 10)
    const dateFormat = DB_TYPE === 'postgres' 
      ? `TO_CHAR(transaction_date, 'YYYY-MM-DD')`
      : `DATE_FORMAT(transaction_date, '%Y-%m-%d')`;
    
    const transactions = await executeQuery<any>(
      `SELECT 
        ${dateFormat} as date,
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
    
    // Get customer loans from historical_loans table
    // Match by repayment_account (customer's savings account used for repayment)
    // Note: In historical_loans, repayment_account = customer's savings account
    //       account_number = loan facility account (not the customer's account)
    let loans: any[] = [];
    
    console.log('[Auth] Querying loans for account:', accountNumber);
    
    loans = await executeQuery<any>(
      `SELECT 
        arrangement as loan_account_number,
        product_name,
        commitment as original_amount,
        principal as outstanding_balance,
        opening_date,
        first_payment_date,
        maturity_date,
        term,
        interest_rate,
        status,
        overdue as arrears_amount,
        currency
      FROM historical_loans 
      WHERE repayment_account = ?
      ORDER BY 
        CASE 
          WHEN status = 'Current' THEN 1
          WHEN status = 'Delinquent' THEN 2
          WHEN status = 'Grace' THEN 3
          WHEN status = 'Non Accrual' THEN 4
          WHEN status = 'Expired' THEN 5
          ELSE 6
        END,
        opening_date DESC`,
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
        currency: balance?.currency || 'GHS',
        lastUpdated: balance?.last_updated || null
      },
      loans: loans.map(loan => {
        // Parse term: "365D" → 365 days, "12M" → 12 months
        let termMonths = 0;
        if (loan.term) {
          const termStr = loan.term.toString();
          if (termStr.endsWith('D')) {
            // Convert days to months (approximate)
            const days = parseInt(termStr.replace('D', ''));
            termMonths = Math.round(days / 30);
          } else if (termStr.endsWith('M')) {
            termMonths = parseInt(termStr.replace('M', ''));
          } else {
            // Assume it's already in months
            termMonths = parseInt(termStr) || 0;
          }
        }
        
        // Calculate monthly installment if not provided
        // Simple calculation: principal / term months
        const monthlyInstallment = termMonths > 0 
          ? parseFloat(loan.outstanding_balance || 0) / termMonths 
          : 0;
        
        return {
          loanNumber: loan.loan_account_number,
          loanType: loan.product_name,
          originalAmount: parseFloat(loan.original_amount || 0),
          currentBalance: parseFloat(loan.outstanding_balance || 0),
          disbursementDate: loan.opening_date,
          maturityDate: loan.maturity_date,
          nextPaymentDate: loan.first_payment_date,
          termMonths: termMonths,
          monthlyInstallment: monthlyInstallment,
          interestRate: parseFloat(loan.interest_rate || 0),
          status: loan.status,
          amountInArrears: parseFloat(loan.arrears_amount || 0),
          currency: loan.currency || 'GHS'
        };
      }),
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
 * Derive account type from account number structure
 * Position 6 of account number indicates type: 1=Savings, 2=Current
 */
function getAccountTypeFromNumber(accountNumber: string): string | null {
  // Remove any non-numeric characters (like 'v' prefix)
  const cleanNumber = accountNumber.replace(/[^0-9]/g, '');
  
  // Check if account number is long enough
  if (cleanNumber.length < 6) {
    return null;
  }
  
  // Get character at position 6 (0-indexed position 5)
  const typeIndicator = cleanNumber.charAt(5);
  
  switch (typeIndicator) {
    case '1':
      return 'Savings Account';
    case '2':
      return 'Current Account';
    default:
      return null;
  }
}

/**
 * Get friendly account type name from code or account number
 */
function getAccountTypeName(code: string, accountNumber?: string): string {
  // First, try to derive from account number if provided
  if (accountNumber) {
    const derivedType = getAccountTypeFromNumber(accountNumber);
    if (derivedType) {
      return derivedType;
    }
  }
  
  // Fallback to code mapping
  const typeMap: { [key: string]: string } = {
    '1850': 'Savings Account',
    '1800': 'Current Account',
    '1900': 'Fixed Deposit',
    '2000': 'Investment Account',
    '2100': 'Student Account',
    '2200': 'Salary Account',
    '2300': 'Business Account',
    '2400': 'Joint Account',
    // Add more mappings as needed
  };
  
  return typeMap[code] || `Account Type ${code}`;
}

/**
 * Format loan-only response
 */
export function formatLoanResponse(accountData: any): string {
  try {
    if (!accountData.loans || accountData.loans.length === 0) {
      return `**Loan Information**\n\nI couldn't find any active or historical loans associated with your account. If you believe this is an error or would like to apply for a loan, please contact us at +233 24 231 2059 or visit any branch.`;
    }
    
    let response = `**Loan Information**\n\n`;
    response += `You have ${accountData.loans.length} loan${accountData.loans.length > 1 ? 's' : ''} with us:\n\n`;
    
    accountData.loans.forEach((loan: any, index: number) => {
      // Map status from historical_loans
      let statusDisplay = loan.status || 'Unknown';
      if (loan.status === 'Current') {
        statusDisplay = 'Active';
      } else if (loan.status === 'Expired') {
        statusDisplay = 'Matured';
      } else if (loan.status === 'Pending Closure') {
        statusDisplay = 'Pending Closure';
      } else if (loan.status === 'Non Accrual') {
        statusDisplay = 'Non Performing';
      } else if (loan.status === 'Delinquent') {
        statusDisplay = 'Overdue';
      } else if (loan.status === 'Grace') {
        statusDisplay = 'Grace Period';
      }
      
      const termMonths = loan.termMonths || 0;
      const termYears = Math.floor(termMonths / 12);
      const termText = termYears > 0 ? `${termYears} year${termYears > 1 ? 's' : ''}` : `${termMonths} months`;
      
      response += `**Loan ${index + 1}:** ${loan.loanNumber || 'N/A'}\n`;
      if (loan.loanType) {
        response += `Type: ${loan.loanType}\n`;
      }
      response += `Original Amount: GHS ${(loan.originalAmount || 0).toFixed(2)}\n`;
      response += `Outstanding Balance: GHS ${(loan.currentBalance || 0).toFixed(2)}\n`;
      
      if (loan.monthlyInstallment > 0) {
        response += `Monthly Payment: GHS ${(loan.monthlyInstallment || 0).toFixed(2)}\n`;
      }
      
      if (loan.interestRate) {
        response += `Interest Rate: ${loan.interestRate}% per annum\n`;
      }
      
      if (loan.nextPaymentDate) {
        const nextDate = new Date(loan.nextPaymentDate);
        response += `Next Payment: ${nextDate.toLocaleDateString('en-GB')}\n`;
      }
      
      if (loan.maturityDate) {
        const matDate = new Date(loan.maturityDate);
        const today = new Date();
        const daysRemaining = Math.ceil((matDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysRemaining > 0) {
          response += `Maturity Date: ${matDate.toLocaleDateString('en-GB')} (${daysRemaining} days remaining)\n`;
        } else if (daysRemaining < 0) {
          response += `Maturity Date: ${matDate.toLocaleDateString('en-GB')} (matured ${Math.abs(daysRemaining)} days ago)\n`;
        } else {
          response += `Maturity Date: ${matDate.toLocaleDateString('en-GB')} (matures today)\n`;
        }
      }
      
      if (termText && termMonths > 0) {
        response += `Loan Duration: ${termText}\n`;
      }
      
      response += `Status: ${statusDisplay}\n`;
      
      if (loan.amountInArrears && loan.amountInArrears > 0) {
        response += `⚠️ Amount in Arrears: GHS ${loan.amountInArrears.toFixed(2)}\n`;
      }
      
      response += `\n`;
    });
    
    response += `For assistance or to discuss your loan, please contact us at +233 24 231 2059 or visit any branch.`;
    
    return response;
  } catch (error: any) {
    console.error('[Auth] Error formatting loan response:', error);
    return `**Loan Information**\n\nI sincerely apologize for the inconvenience. I understand you need your loan information, but I'm experiencing technical difficulties right now. Would you like me to connect you with a customer representative via live chat, or would you prefer to leave a message?`;
  }
}

/**
 * Format list of all customer accounts (when they have multiple)
 */
export function formatAllAccountsList(availableAccounts: Array<{accountNumber: string; accountName: string; accountType: string}>): string {
  let response = `**Your Accounts**\n\n`;
  response += `You have ${availableAccounts.length} account${availableAccounts.length > 1 ? 's' : ''} with us:\n\n`;
  
  availableAccounts.forEach((account, index) => {
    response += `${index + 1}. **${getAccountTypeName(account.accountType, account.accountNumber)}**\n`;
    response += `   Account: ${account.accountNumber}\n`;
    response += `   Name: ${account.accountName}\n\n`;
  });
  
  response += `To check the balance of a specific account, please mention the account number in your message.\n\n`;
  response += `For example, you can ask: "What's the balance of account ${availableAccounts[0].accountNumber}?"`;
  
  return response;
}

/**
 * Format account balance only (without loans)
 */
export function formatAccountBalanceOnly(accountData: any): string {
  // Check if customer has account
  if (!accountData || !accountData.accountNumber || !accountData.balance) {
    return `**Account Information**\n\nI apologize, but I couldn't find an account associated with your details. If you'd like to open a new account with us, I'd be happy to help! Would you like me to connect you with a customer representative via live chat to discuss account opening options, or would you prefer to leave a message?`;
  }
  
  let lastUpdatedText = '';
  if (accountData.balance.lastUpdated) {
    const updateDate = new Date(accountData.balance.lastUpdated);
    const now = new Date();
    const diffMs = now.getTime() - updateDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    let timeAgo = '';
    if (diffMins < 60) {
      timeAgo = diffMins <= 1 ? 'just now' : `${diffMins} minutes ago`;
    } else if (diffHours < 24) {
      timeAgo = diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
    } else if (diffDays < 7) {
      timeAgo = diffDays === 1 ? '1 day ago' : `${diffDays} days ago`;
    } else {
      timeAgo = `on ${updateDate.toLocaleDateString('en-GB')}`;
    }
    
    lastUpdatedText = `Last Updated: ${timeAgo}\n\n`;
  }
  
  return `**Account Balance**\n\n` +
    `Account: ${accountData.accountNumber}\n` +
    `Name: ${accountData.accountName}\n` +
    `Type: ${getAccountTypeName(accountData.accountType, accountData.accountNumber)}\n\n` +
    `Available Balance: GHS ${accountData.balance.available.toFixed(2)}\n` +
    `Ledger Balance: GHS ${accountData.balance.ledger.toFixed(2)}\n` +
    lastUpdatedText +
    `Is there anything else you'd like to know about your account?`;
}

/**
 * Format account balance response (includes both account and loans)
 */
export function formatBalanceResponse(accountData: any): string {
  // Check if customer has account or loans
  const hasAccount = accountData && accountData.accountNumber && accountData.balance;
  const hasLoans = accountData && accountData.loans && accountData.loans.length > 0;
  
  // If customer has neither
  if (!hasAccount && !hasLoans) {
    return `**Account Information**\n\nI apologize, but I couldn't find any accounts or loans associated with your details. If you're interested in opening an account or applying for a loan, I'd be happy to help! Would you like me to connect you with a customer representative via live chat, or would you prefer to leave a message?`;
  }
  
  // If customer has loans but no account
  if (!hasAccount && hasLoans) {
    return formatLoanResponse(accountData);
  }
  
  let lastUpdatedText = '';
  if (accountData.balance.lastUpdated) {
    const updateDate = new Date(accountData.balance.lastUpdated);
    const now = new Date();
    const diffMs = now.getTime() - updateDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    let timeAgo = '';
    if (diffMins < 60) {
      timeAgo = diffMins <= 1 ? 'just now' : `${diffMins} minutes ago`;
    } else if (diffHours < 24) {
      timeAgo = diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
    } else if (diffDays < 7) {
      timeAgo = diffDays === 1 ? '1 day ago' : `${diffDays} days ago`;
    } else {
      timeAgo = `on ${updateDate.toLocaleDateString('en-GB')}`;
    }
    
    lastUpdatedText = `Last Updated: ${timeAgo}\n\n`;
  }
  
  let loansText = '';
  if (accountData.loans && accountData.loans.length > 0) {
    loansText = `\n**Loan Information**\n\n`;
    
    accountData.loans.forEach((loan: any, index: number) => {
      // Map status from historical_loans
      let statusDisplay = loan.status || 'Unknown';
      if (loan.status === 'Current') {
        statusDisplay = 'Active';
      } else if (loan.status === 'Expired') {
        statusDisplay = 'Matured';
      } else if (loan.status === 'Pending Closure') {
        statusDisplay = 'Pending Closure';
      } else if (loan.status === 'Non Accrual') {
        statusDisplay = 'Non Performing';
      } else if (loan.status === 'Delinquent') {
        statusDisplay = 'Overdue';
      } else if (loan.status === 'Grace') {
        statusDisplay = 'Grace Period';
      }
      
      const termMonths = loan.termMonths || 0;
      const termYears = Math.floor(termMonths / 12);
      const termText = termYears > 0 ? `${termYears} year${termYears > 1 ? 's' : ''}` : `${termMonths} months`;
      
      loansText += `Loan ${index + 1}: ${loan.loanNumber || 'N/A'}\n`;
      if (loan.loanType) {
        loansText += `Type: ${loan.loanType}\n`;
      }
      loansText += `Original Amount: GHS ${(loan.originalAmount || 0).toFixed(2)}\n`;
      loansText += `Current Balance: GHS ${(loan.currentBalance || 0).toFixed(2)}\n`;
      
      if (loan.monthlyInstallment > 0) {
        loansText += `Monthly Payment: GHS ${(loan.monthlyInstallment || 0).toFixed(2)}\n`;
      }
      
      if (loan.interestRate) {
        loansText += `Interest Rate: ${loan.interestRate}% p.a.\n`;
      }
      
      if (loan.nextPaymentDate) {
        const nextDate = new Date(loan.nextPaymentDate);
        loansText += `Next Payment: ${nextDate.toLocaleDateString('en-GB')}\n`;
      }
      
      if (loan.maturityDate) {
        const matDate = new Date(loan.maturityDate);
        const today = new Date();
        const daysRemaining = Math.ceil((matDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysRemaining > 0) {
          loansText += `Maturity Date: ${matDate.toLocaleDateString('en-GB')} (${daysRemaining} days remaining)\n`;
        } else if (daysRemaining < 0) {
          loansText += `Maturity Date: ${matDate.toLocaleDateString('en-GB')} (matured ${Math.abs(daysRemaining)} days ago)\n`;
        } else {
          loansText += `Maturity Date: ${matDate.toLocaleDateString('en-GB')} (matures today)\n`;
        }
      }
      
      if (termText && termMonths > 0) {
        loansText += `Duration: ${termText}\n`;
      }
      
      loansText += `Status: ${statusDisplay}\n`;
      
      if (loan.amountInArrears && loan.amountInArrears > 0) {
        loansText += `⚠️ Arrears: GHS ${loan.amountInArrears.toFixed(2)}\n`;
      }
      
      loansText += `\n`;
    });
  }
  
  return `**Account Balance**\n\n` +
    `Account: ${accountData.accountNumber}\n` +
    `Name: ${accountData.accountName}\n` +
    `Type: ${getAccountTypeName(accountData.accountType, accountData.accountNumber)}\n\n` +
    `Available Balance: GHS ${accountData.balance.available.toFixed(2)}\n` +
    `Ledger Balance: GHS ${accountData.balance.ledger.toFixed(2)}\n` +
    lastUpdatedText +
    loansText +
    `Is there anything else you'd like to know about your account?`;
}

/**
 * Format transaction history response
 */
export function formatTransactionsResponse(accountData: any): string {
  let response = `**Recent Transactions**\n\n`;
  
  if (!accountData.recentTransactions || accountData.recentTransactions.length === 0) {
    response += `No recent transactions found for this account.\n\n`;
    response += `This could mean:\n`;
    response += `• Your account is newly opened\n`;
    response += `• No transactions have been recorded yet\n\n`;
    response += `For more information, please visit any branch or contact customer service.`;
  } else {
    accountData.recentTransactions.forEach((txn: any) => {
      const sign = txn.amount >= 0 ? '+' : '';
      response += `📅 **${txn.date}**\n`;
      response += `${txn.description}\n`;
      response += `Amount: ${sign}GHS ${txn.amount.toFixed(2)}\n`;
      response += `Balance: GHS ${txn.balance.toFixed(2)}\n`;
      response += `Ref: ${txn.reference}\n\n`;
    });
    
    response += `_For a detailed statement, please visit any branch or use our mobile banking app._`;
  }
  
  return response;
}

/**
 * Handle account selection when customer has multiple accounts
 */
export async function selectAccount(
  sessionId: string,
  accountNumberOrIndex: string
): Promise<{ success: boolean; message: string; session: CustomerSession; awaitingOTP?: boolean }> {
  const session = getOrCreateSession(sessionId);
  
  console.log('[Auth] selectAccount called with:', {
    sessionId,
    input: accountNumberOrIndex,
    hasAccounts: !!session.availableAccounts,
    accountsCount: session.availableAccounts?.length || 0
  });
  
  if (!session.availableAccounts || session.availableAccounts.length === 0) {
    return {
      success: false,
      message: "No account selection pending.",
      session
    };
  }
  
  let selectedAccount: {accountNumber: string; accountName: string; accountType: string} | undefined;
  
  // Normalize the input for matching (remove spaces, lowercase)
  const normalizedInput = accountNumberOrIndex.trim().toLowerCase().replace(/\s+/g, '');
  
  console.log('[Auth] Looking for match. Input:', accountNumberOrIndex, 'Normalized:', normalizedInput);
  console.log('[Auth] Available accounts:', session.availableAccounts.map(a => a.accountNumber));
  
  // Check if user typed account number (flexible matching)
  const matchByNumber = session.availableAccounts.find(acc => {
    const normalizedAccountNum = acc.accountNumber.trim().toLowerCase().replace(/\s+/g, '');
    const matches = normalizedAccountNum === normalizedInput || 
                   normalizedAccountNum.includes(normalizedInput) ||
                   normalizedInput.includes(normalizedAccountNum);
    console.log('[Auth] Comparing', acc.accountNumber, 'normalized:', normalizedAccountNum, 'matches:', matches);
    return matches;
  });
  
  if (matchByNumber) {
    selectedAccount = matchByNumber;
    console.log('[Auth] Account matched by number:', selectedAccount.accountNumber);
  } else {
    // Check if user typed index (1, 2, 3, etc.) or button clicked with account number
    const index = parseInt(accountNumberOrIndex) - 1;
    if (!isNaN(index) && index >= 0 && index < session.availableAccounts.length) {
      selectedAccount = session.availableAccounts[index];
      console.log('[Auth] Account matched by index', index + 1, ':', selectedAccount.accountNumber);
    }
  }
  
  if (!selectedAccount) {
    console.log('[Auth] No account matched for input:', accountNumberOrIndex);
    return {
      success: false,
      message: "Invalid selection. Please choose a valid account number or option.",
      session
    };
  }
  
  // Set the selected account and complete authentication (OTP already verified)
  session.accountNumber = selectedAccount.accountNumber;
  session.customerName = selectedAccount.accountName;
  session.awaitingAccountSelection = false;
  // Keep availableAccounts so user can query other accounts later
  session.isAuthenticated = true;
  session.authenticatedAt = new Date();
  session.expiresAt = new Date(Date.now() + SESSION_TIMEOUT);
  
  console.log('[Auth] Account selected, authentication complete:', {
    accountNumber: session.accountNumber,
    customerName: session.customerName,
    awaitingAccountSelection: session.awaitingAccountSelection,
    isAuthenticated: session.isAuthenticated
  });
  
  sessions.set(sessionId, session);
  
  // Get customer's first name for personalized greeting
  const firstName = selectedAccount.accountName ? selectedAccount.accountName.split(' ')[0] : '';
  const greeting = firstName ? `Welcome, ${firstName}!` : 'Welcome!';
  
  return {
    success: true,
    message: `${greeting} You've selected account ${selectedAccount.accountNumber} (${selectedAccount.accountType}). How can I help you today?`,
    session,
    awaitingOTP: false
  };
}

/**
 * Extract account number from message if customer specifies one
 */
export function extractAccountNumberFromQuery(message: string, availableAccounts?: Array<{accountNumber: string; accountName: string; accountType: string}>): string | null {
  if (!availableAccounts || availableAccounts.length === 0) {
    return null;
  }
  
  // Look for account number patterns (13-16 digits typically)
  const accountPattern = /\b(\d{13,16})\b/g;
  const matches = message.match(accountPattern);
  
  if (matches) {
    // Check if any matched number is in the available accounts
    for (const match of matches) {
      const found = availableAccounts.find(acc => 
        acc.accountNumber.replace(/\s+/g, '') === match.replace(/\s+/g, '')
      );
      if (found) {
        return found.accountNumber;
      }
    }
  }
  
  // Check for partial matches or account references
  const normalizedMessage = message.toLowerCase().replace(/\s+/g, '');
  for (const account of availableAccounts) {
    const normalizedAccount = account.accountNumber.replace(/\s+/g, '');
    if (normalizedMessage.includes(normalizedAccount)) {
      return account.accountNumber;
    }
  }
  
  return null;
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
