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
        reason: `No active account found with the provided ${identifier}. Please verify your details.`
      };
    }
    
    // If multiple accounts found (common with phone number auth)
    if (customers.length > 1) {
      console.log('[Auth] Multiple accounts found:', customers.length);
      const accounts = customers.map(c => ({
        accountNumber: c.account_number,
        accountName: c.account_name,
        accountType: c.account_type
      }));
      
      return {
        valid: true,
        multipleAccounts: true,
        accounts: accounts,
        phoneNumber: customers[0].phone_number
      };
    }
    
    // Single account found
    const customer = customers[0];
    console.log('[Auth] Customer validated successfully:', customer.account_name);
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
      reason: "Unable to verify your details at this time. Please try again later or contact customer service at +233 54 242 8935 / +233 50 129 0952."
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
      message: "Maximum authentication attempts exceeded. Please visit any branch or call +233 54 242 8935 / +233 50 129 0952 for assistance.",
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
      console.log('[Auth] Customer has multiple accounts, prompting selection');
      session.availableAccounts = validation.accounts;
      session.awaitingAccountSelection = true;
      session.phoneNumber = validation.phoneNumber;
      sessions.set(sessionId, session);
      
      return {
        success: false,
        message: `You have ${validation.accounts.length} accounts registered with this phone number. Please select which account you want to access or type your account number.`,
        session,
        awaitingOTP: false
      };
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
    
    // Get customer loans - handle both phone formats (0501336873 and 233501336873)
    let loans: any[] = [];
    if (customer.phone_number) {
      const phoneWithoutCountryCode = customer.phone_number.replace(/^233/, '0');
      const phoneWithCountryCode = customer.phone_number.startsWith('233') ? customer.phone_number : '233' + customer.phone_number.replace(/^0/, '');
      
      console.log('[Auth] Query params:', [customer.phone_number, phoneWithoutCountryCode, phoneWithCountryCode]);
      
      loans = await executeQuery<any>(
        `SELECT 
          facility_account_number,
          facility_amount,
          current_balance,
          disbursement_date,
          maturity_date,
          next_payment_date,
          facility_term,
          scheduled_installment,
          repayment_frequency,
          facility_status_code,
          amount_in_arrears
        FROM loans 
        WHERE phone_number IN (?, ?, ?) OR customer_id = ?
        ORDER BY facility_status_code, disbursement_date DESC`,
        [customer.phone_number, phoneWithoutCountryCode, phoneWithCountryCode, customer.id]
      );
    } else {
      console.log('[Auth] No phone number found for customer, skipping loan lookup');
    }
    
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
      loans: loans.map(loan => ({
        loanNumber: loan.facility_account_number,
        originalAmount: parseFloat(loan.facility_amount),
        currentBalance: parseFloat(loan.current_balance),
        disbursementDate: loan.disbursement_date,
        maturityDate: loan.maturity_date,
        nextPaymentDate: loan.next_payment_date,
        termMonths: parseInt(loan.facility_term),
        monthlyInstallment: parseFloat(loan.scheduled_installment),
        repaymentFrequency: loan.repayment_frequency,
        status: loan.facility_status_code,
        amountInArrears: parseFloat(loan.amount_in_arrears) || 0
      })),
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
 * Get friendly account type name from code
 */
function getAccountTypeName(code: string): string {
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
    // Same message for all customers - system is being updated
    let response = `**Loan Information**\n\n`;
    response += `Thank you for your inquiry! 🏦\n\n`;
    response += `Our loan records system is currently undergoing updates to ensure you receive the most accurate and up-to-date information.\n\n`;
    response += `For accurate details about your loan status, balance, payment schedule, or to apply for a new loan, we kindly request that you:\n\n`;
    response += `📍 **Visit your nearest AKCB branch**\n`;
    response += `📞 **Call us at:** +233 54 242 8935 / +233 50 129 0952\n\n`;
    response += `Our friendly staff will be happy to provide you with comprehensive information and assistance.\n\n`;
    response += `We appreciate your understanding and patience as we work to serve you better. Thank you for banking with AKCB! ✨`;
    return response;
  } catch (error: any) {
    console.error('[Auth] Error formatting loan response:', error);
    return `**Loan Information**\n\nWe're experiencing technical difficulties retrieving your loan information. Please contact us at +233 54 242 8935 / +233 50 129 0952 or visit any AKCB branch for assistance.`;
  }
}

/**
 * Format account balance only (without loans)
 */
export function formatAccountBalanceOnly(accountData: any): string {
  // Check if customer has account
  if (!accountData || !accountData.accountNumber || !accountData.balance) {
    return `**Account Information**\n\nYou have no account associated with the bank.\n\nIf you would like to open an account, please contact us at +233 54 242 8935 / +233 50 129 0952 or visit any AKCB branch.`;
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
    `Type: ${getAccountTypeName(accountData.accountType)}\n\n` +
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
    return `**Account Information**\n\nYou have no account or loan associated with the bank.\n\nIf you would like to open an account or apply for a loan, please contact us at +233 54 242 8935 / +233 50 129 0952 or visit any AKCB branch.`;
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
      const status = loan.status === 'A' ? 'Active' : loan.status === 'C' ? 'Closed' : 'Dormant';
      const termMonths = loan.termMonths || 0;
      const termYears = Math.floor(termMonths / 12);
      const termText = termYears > 0 ? `${termYears} year${termYears > 1 ? 's' : ''}` : `${termMonths} months`;
      
      loansText += `Loan ${index + 1}: ${loan.loanNumber || 'N/A'}\n`;
      loansText += `Original Amount: GHS ${(loan.originalAmount || 0).toFixed(2)}\n`;
      loansText += `Current Balance: GHS ${(loan.currentBalance || 0).toFixed(2)}\n`;
      loansText += `Monthly Payment: GHS ${(loan.monthlyInstallment || 0).toFixed(2)}\n`;
      
      if (loan.nextPaymentDate) {
        const nextDate = new Date(loan.nextPaymentDate);
        loansText += `Next Payment: ${nextDate.toLocaleDateString('en-GB')}\n`;
      }
      
      if (loan.maturityDate) {
        const matDate = new Date(loan.maturityDate);
        const today = new Date();
        const daysRemaining = Math.ceil((matDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        loansText += `Maturity Date: ${matDate.toLocaleDateString('en-GB')}${daysRemaining > 0 ? ` (${daysRemaining} days remaining)` : ''}\n`;
      }
      
      loansText += `Duration: ${termText}\n`;
      loansText += `Status: ${status}\n`;
      
      if (loan.amountInArrears && loan.amountInArrears > 0) {
        loansText += `⚠️ Arrears: GHS ${loan.amountInArrears.toFixed(2)}\n`;
      }
      
      loansText += `\n`;
    });
  }
  
  return `**Account Balance**\n\n` +
    `Account: ${accountData.accountNumber}\n` +
    `Name: ${accountData.accountName}\n` +
    `Type: ${getAccountTypeName(accountData.accountType)}\n\n` +
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
 * Handle account selection when customer has multiple accounts
 */
export async function selectAccount(
  sessionId: string,
  accountNumberOrIndex: string
): Promise<{ success: boolean; message: string; session: CustomerSession; awaitingOTP?: boolean }> {
  const session = getOrCreateSession(sessionId);
  
  if (!session.availableAccounts || session.availableAccounts.length === 0) {
    return {
      success: false,
      message: "No account selection pending.",
      session
    };
  }
  
  let selectedAccount: {accountNumber: string; accountName: string; accountType: string} | undefined;
  
  // Check if user typed account number
  const matchByNumber = session.availableAccounts.find(acc => 
    acc.accountNumber.toLowerCase() === accountNumberOrIndex.toLowerCase()
  );
  
  if (matchByNumber) {
    selectedAccount = matchByNumber;
  } else {
    // Check if user typed index (1, 2, 3, etc.)
    const index = parseInt(accountNumberOrIndex) - 1;
    if (!isNaN(index) && index >= 0 && index < session.availableAccounts.length) {
      selectedAccount = session.availableAccounts[index];
    }
  }
  
  if (!selectedAccount) {
    return {
      success: false,
      message: "Invalid selection. Please choose a valid account number or option.",
      session
    };
  }
  
  // Set the selected account and proceed with OTP
  session.accountNumber = selectedAccount.accountNumber;
  session.customerName = selectedAccount.accountName;
  session.awaitingAccountSelection = false;
  
  // Send OTP
  const otpResult = await otpService.generateAndSendOTP(
    selectedAccount.accountNumber,
    session.phoneNumber!,
    selectedAccount.accountName
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
