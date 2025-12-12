/**
 * Customer Authentication Module
 * Handles customer identification and session management for account inquiries
 * Without core banking API integration
 */

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
  const accountMatch = message.match(/\b\d{10,16}\b/);
  if (accountMatch) {
    details.accountNumber = accountMatch[0];
  }
  
  // Phone number (Ghana format)
  const phoneMatch = message.match(/\b(0|\+233)\d{9}\b/);
  if (phoneMatch) {
    details.phoneNumber = phoneMatch[0];
  }
  
  // Date of birth (various formats)
  const dobMatch = message.match(/\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})\b/);
  if (dobMatch) {
    details.dateOfBirth = dobMatch[0];
  }
  
  return details;
}

/**
 * Validate customer credentials (mock validation - replace with actual DB lookup)
 * In production, this would query your customer database
 */
export async function validateCredentials(
  accountNumber: string,
  phoneNumber?: string,
  dateOfBirth?: string
): Promise<{ valid: boolean; reason?: string; customerName?: string }> {
  // MOCK VALIDATION - Replace with actual database query
  // Example: SELECT * FROM customers WHERE account_number = ? AND phone = ? AND dob = ?
  
  // For demo purposes, accept any 10-digit account number
  if (accountNumber && accountNumber.length >= 10) {
    return {
      valid: true,
      customerName: "John Doe" // This would come from database
    };
  }
  
  return {
    valid: false,
    reason: "Invalid account details. Please provide your 10-digit account number."
  };
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
 * Get customer account data (mock - replace with actual API/DB call)
 */
export async function getCustomerAccountData(accountNumber: string): Promise<any> {
  // MOCK DATA - Replace with actual core banking API or database query
  return {
    accountNumber: accountNumber,
    accountName: "John Doe",
    accountType: "Savings Account",
    balance: {
      ledger: 5420.50,
      available: 5320.50,
      currency: "GHS"
    },
    recentTransactions: [
      { date: "2025-12-10", description: "ATM Withdrawal - Amantin", amount: -500.00, balance: 5320.50 },
      { date: "2025-12-08", description: "Salary Credit", amount: 3000.00, balance: 5820.50 },
      { date: "2025-12-05", description: "Mobile Money Transfer", amount: -200.00, balance: 2820.50 }
    ]
  };
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
