import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import multer from 'multer';
import crypto from 'crypto';
import { Server as SocketIOServer } from 'socket.io';
import * as customerAuth from './customerAuth';
import { testConnection, executeQuery, querySingle, DB_TYPE, getPool } from './database';
import * as balanceUpdater from './balanceUpdater';
import * as loanManager from './loanManager';
import * as customerImporter from './customerImporter';
import { WebCrawler, CrawlConfig, CrawlResult, convertToKBEntries, updateKnowledgeBase } from './webCrawler';
import * as analytics from './analytics';
import * as loanApplications from './loanApplications';
import * as accountOpenings from './accountOpenings';
import * as salaryOverdraft from './salaryOverdraft';
import * as kbModule from './knowledge/kb';
import * as migration from './migration';
import { LiveChatManager } from './liveChat';

// Load environment variables
dotenv.config();

const app = express();
const port = Number(process.env.PORT || 4000);

// Middleware - MUST be before routes
app.use(express.json());

// Increase timeout for large file uploads (10 minutes)
app.use((req, res, next) => {
  if (req.path.includes('/upload') || req.path.includes('/import')) {
    req.setTimeout(600000); // 10 minutes
    res.setTimeout(600000);
  }
  next();
});

// Test database connection and initialize analytics on startup
(async () => {
  const dbConnected = await testConnection();
  if (dbConnected) {
    console.log('[Server] Database connection established');
    
    // Initialize analytics tables
    try {
      await analytics.initializeAnalyticsTables();
      console.log('[Server] Analytics module initialized');

      // Initialize loan applications table
      try {
        await loanApplications.initializeLoanApplicationsTable();
        console.log('[Server] Loan applications module initialized');
      } catch (error) {
        console.error('[Server] Loan applications initialization failed:', error);
      }

      // Initialize salary overdraft table
      try {
        await salaryOverdraft.initializeSalaryOverdraftTable();
        console.log('[Server] Salary overdraft module initialized');
      } catch (error) {
        console.error('[Server] Salary overdraft initialization failed:', error);
      }
    } catch (error) {
      console.error('[Server] Analytics initialization failed:', error);
    }
  } else {
    console.warn('[Server] Database connection failed - authentication and analytics features will not work');
  }
})();

// Loan application submit endpoint (used by chatbot UI)
app.post('/api/loan-application', async (req: Request, res: Response) => {
  try {
    const body = (req.body && typeof req.body === 'object') ? req.body : {};
    const sessionId = (body as any)?.sessionId as string | undefined;
    const ipAddress = req.ip || (req.headers['x-forwarded-for'] as string | undefined);
    const userAgent = req.headers['user-agent'] as string | undefined;

    console.log('[LoanApplication] Received payload:', JSON.stringify(body, null, 2));

    const validation = loanApplications.validateLoanApplicationPayload({
      ...body,
      sessionId,
      ipAddress,
      userAgent
    });

    if (!validation.ok) {
      console.log('[LoanApplication] Validation failed:', validation.error);
      return res.status(400).json({ ok: false, error: validation.error });
    }

    const result = await loanApplications.createLoanApplication(validation.value);
    return res.json({
      ok: true,
      applicationId: result.applicationId,
      monthlyInstalment: result.monthlyInstalment
    });
  } catch (error: any) {
    console.error('[LoanApplication] Error:', error?.message || error);
    return res.status(500).json({ ok: false, error: 'Failed to submit loan application. Please try again.' });
  }
});

// Admin: list loan applications
app.get('/api/admin/loan-applications', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.substring('Bearer '.length).trim() : undefined;
    if (!isValidAdminToken(token)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const limit = Number((req.query as any)?.limit ?? 50);
    const offset = Number((req.query as any)?.offset ?? 0);
    const result = await loanApplications.listLoanApplications(limit, offset);
    return res.json({ ok: true, ...result });
  } catch (error: any) {
    console.error('[Admin] Loan applications list error:', error?.message || error);
    return res.status(500).json({ ok: false, error: 'Failed to load loan applications' });
  }
});

// Salary overdraft application submit endpoint (used by chatbot UI)
app.post('/api/salary-overdraft', async (req: Request, res: Response) => {
  try {
    const body = (req.body && typeof req.body === 'object') ? req.body : {};
    const sessionId = (body as any)?.sessionId as string | undefined;
    const ipAddress = req.ip || (req.headers['x-forwarded-for'] as string | undefined);
    const userAgent = req.headers['user-agent'] as string | undefined;

    console.log('[SalaryOverdraft] Received payload:', JSON.stringify(body, null, 2));

    const validation = salaryOverdraft.validateSalaryOverdraftPayload({
      ...body,
      sessionId,
      ipAddress,
      userAgent
    });

    if (!validation.ok) {
      console.log('[SalaryOverdraft] Validation failed:', validation.error);
      return res.status(400).json({ ok: false, error: validation.error });
    }

    const result = await salaryOverdraft.createSalaryOverdraft(validation.value);
    return res.json({
      ok: true,
      applicationId: result.applicationId,
      approvedAmount: result.approvedAmount,
      monthlyRepayment: result.monthlyRepayment
    });
  } catch (error: any) {
    console.error('[SalaryOverdraft] Error:', error?.message || error);
    return res.status(500).json({ ok: false, error: 'Failed to submit salary overdraft application. Please try again.' });
  }
});

// Admin: list salary overdraft applications
app.get('/api/admin/salary-overdrafts', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.substring('Bearer '.length).trim() : undefined;
    if (!isValidAdminToken(token)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const limit = Number((req.query as any)?.limit ?? 50);
    const offset = Number((req.query as any)?.offset ?? 0);
    const result = await salaryOverdraft.listSalaryOverdrafts(limit, offset);
    return res.json({ ok: true, ...result });
  } catch (error: any) {
    console.error('[Admin] Salary overdrafts list error:', error?.message || error);
    return res.status(500).json({ ok: false, error: 'Failed to load salary overdraft applications' });
  }
});

// Account opening submit endpoint (used by chatbot UI - non-customers only)
app.post('/api/account-opening', async (req: Request, res: Response) => {
  try {
    const body = (req.body && typeof req.body === 'object') ? req.body : {};
    const sessionId = (body as any)?.sessionId as string | undefined;
    const ipAddress = req.ip || (req.headers['x-forwarded-for'] as string | undefined);
    const userAgent = req.headers['user-agent'] as string | undefined;

    console.log('[AccountOpening] Received payload:', JSON.stringify(body, null, 2));

    const validation = accountOpenings.validateAccountOpeningPayload({
      ...body,
      sessionId,
      ipAddress,
      userAgent
    });

    if (!validation.ok) {
      console.log('[AccountOpening] Validation failed:', validation.error);
      return res.status(400).json({ ok: false, error: validation.error });
    }

    const result = await accountOpenings.createAccountOpening({
      ...body,
      sessionId,
      ipAddress,
      userAgent
    });

    if (!result.ok) {
      return res.status(400).json({ ok: false, error: result.error });
    }

    return res.json({
      ok: true,
      applicationId: result.applicationId
    });
  } catch (error: any) {
    console.error('[AccountOpening] Error:', error?.message || error);
    return res.status(500).json({ ok: false, error: 'Failed to submit account opening application. Please try again.' });
  }
});

// Admin: list account opening applications
app.get('/api/admin/account-openings', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.substring('Bearer '.length).trim() : undefined;
    if (!isValidAdminToken(token)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const limit = Number((req.query as any)?.limit ?? 100);
    const applications = await accountOpenings.listAccountOpenings(limit);
    
    // Return in format expected by admin portal (items + total)
    return res.json({ 
      ok: true, 
      items: applications,
      total: applications.length 
    });
  } catch (error: any) {
    console.error('[Admin] Account openings list error:', error?.message || error);
    return res.status(500).json({ ok: false, error: 'Failed to load account openings' });
  }
});

// Admin: update account opening status
app.put('/api/admin/account-openings/:id/status', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.substring('Bearer '.length).trim() : undefined;
    if (!isValidAdminToken(token)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const applicationId = parseInt(req.params.id);
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ ok: false, error: 'Status is required' });
    }

    if (isNaN(applicationId)) {
      return res.status(400).json({ ok: false, error: 'Invalid application ID' });
    }

    await accountOpenings.updateAccountOpeningStatus(applicationId, status);
    
    return res.json({ ok: true, message: 'Status updated successfully' });
  } catch (error: any) {
    console.error('[Admin] Update status error:', error?.message || error);
    return res.status(500).json({ ok: false, error: error.message || 'Failed to update status' });
  }
});

// Configure multer for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

// Admin authentication
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN; // Static token from .env
const adminTokens = new Set<string>();

// Helper function to validate admin token
function isValidAdminToken(token: string | undefined): boolean {
  if (!token) return false;
  // Check if it's the static token from .env OR a session token
  return (ADMIN_TOKEN && token === ADMIN_TOKEN) || adminTokens.has(token);
}

// Generate a random token
function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Serve static files from public directory
const publicPath = path.join(process.cwd(), 'public');
console.log('[Static] Serving static files from:', publicPath);
app.use(express.static(publicPath));

// API info endpoint
app.get('/api', (req: Request, res: Response) => {
  res.json({
    name: 'AKCB Chatbot - Amantin and Kasei Community Bank PLC',
    status: 'running',
    version: '1.0.0',
    endpoints: {
      chat: 'POST /api/chat',
      health: 'GET /api/health'
    },
    message: 'Send a POST request to /api/chat with {"message": "your question"}'
  });
});

let kb: kbModule.KBEntry[] = [];

// Load KB from file
function loadKB() {
  try {
    const kbPath = kbModule.defaultKBPath();
    kb = kbModule.loadKBFromFile(kbPath);
    console.log(`[KB] Loaded ${kb.length} entries`);
  } catch (err) {
    console.error('[KB] Failed to load:', err);
    kb = [];
  }
}

// Retrieve KB matches
function retrieveKB(query: string | undefined): string[] {
  return kbModule.retrieveKB(query, kb);
}

// Chat endpoint
app.post('/api/chat', async (req: Request, res: Response) => {
  try {
    // Handle both req.body and raw body parsing
    let message: string | undefined;
    let sessionId: string | undefined;
    let messageIndex: number = 0;
    
    if (typeof req.body === 'string') {
      try {
        const parsed = JSON.parse(req.body);
        message = parsed.message;
        sessionId = parsed.sessionId;
        messageIndex = parsed.messageIndex || 0;
      } catch (e) {
        message = req.body;
      }
    } else if (req.body && typeof req.body === 'object') {
      message = (req.body as any).message;
      sessionId = (req.body as any).sessionId;
      messageIndex = (req.body as any).messageIndex || 0;
    }
    
    console.log('[Chat] Received message:', message);
    console.log('[Chat] Session ID:', sessionId);
    
    if (!message) {
      console.log('[Chat] No message provided, returning 400');
      return res.status(400).json({ error: 'Message required' });
    }

    // Get or create session ID
    const effectiveSessionId = sessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const ipAddress = req.ip || req.headers['x-forwarded-for'] as string;
    const userAgent = req.headers['user-agent'] as string | undefined;

    // Start analytics session if new
    if (!sessionId) {
      await analytics.startSession(effectiveSessionId, ipAddress, userAgent).catch(e => 
        console.error('[Analytics] Failed to start session:', e)
      );
    }

    // Keep user profile totals in sync (non-blocking)
    if (ipAddress) {
      analytics.refreshUserProfileStatsFromIp(ipAddress).catch(e =>
        console.error('[Analytics] Failed to refresh user profile stats:', e)
      );
    }
    
    // Log user message
    await analytics.logMessage(effectiveSessionId, messageIndex, 'user', message).catch(e =>
      console.error('[Analytics] Failed to log user message:', e)
    );

    // ===== Customer Identification Check =====
    const userSession = customerAuth.getOrCreateSession(effectiveSessionId);
    console.log('[Chat] Session state:', {
      sessionId: effectiveSessionId,
      customerIdentified: userSession.customerIdentified,
      isCustomer: userSession.isCustomer
    });
    
    // If user hasn't been asked if they're a customer yet, ask now
    if (!userSession.customerIdentified) {
      userSession.customerIdentified = true;
      
      // Check if returning non-customer with stored info
      const isReturningVisitor = userSession.visitorName && userSession.isCustomer === false;
      
      const welcomeMessage = isReturningVisitor 
        ? `Welcome back, ${userSession.visitorName}! 👋\n\nHow can I assist you today?`
        : `Welcome to Amantin and Kasei Community Bank! 👋\n\nAre you a customer of AKCB?`;
      
      const response: any = {
        response: welcomeMessage,
        sessionId: effectiveSessionId
      };
      
      // Only show buttons if not a returning visitor
      if (!isReturningVisitor) {
        response.buttons = [
          { text: 'Yes - I\'m a customer', icon: 'fas fa-user-check', action: 'send', value: 'Yes' },
          { text: 'No - General inquiry', icon: 'fas fa-info-circle', action: 'send', value: 'No' }
        ];
      } else {
        // For returning visitors, skip to main menu
        response.buttons = [
          { text: 'Open an account', action: 'send', value: 'I want to open an account' },
          { text: 'Apply for a loan', action: 'send', value: 'I want to apply for a loan' }
        ];
      }
      
      await analytics.logMessage(effectiveSessionId, messageIndex + 1, 'assistant', welcomeMessage).catch(e =>
        console.error('[Analytics] Failed to log bot message:', e)
      );
      
      return res.json(response);
    }
    
    // If user is responding to the customer identification question
    if (userSession.customerIdentified && userSession.isCustomer === undefined) {
      const normalizedMessage = message.toLowerCase().trim();
      
      if (/^(yes|yeah|yep|sure|i am|im a customer|customer)/i.test(normalizedMessage)) {
        userSession.isCustomer = true;
        
        const customerWelcome = `Great! Welcome back! 🏦\n\nTo assist you with your account or loan inquiries, I'll need to verify your identity.\n\nPlease provide:\n• Your **account number**, or\n• Your **phone number**\n\nFor security, you'll receive a verification code via SMS.`;
        
        await analytics.logMessage(effectiveSessionId, messageIndex + 1, 'assistant', customerWelcome).catch(e =>
          console.error('[Analytics] Failed to log bot message:', e)
        );
        
        return res.json({ 
          response: customerWelcome, 
          sessionId: effectiveSessionId 
        });
      } 
      else if (/^(no|nope|not a customer|not yet|general|information)/i.test(normalizedMessage)) {
        userSession.isCustomer = false;
        userSession.awaitingVisitorInfo = true;
        
        const visitorFormMessage = `Welcome to Amantin and Kasei Community Bank! 🏦\n\nPlease fill out the contact form to continue.`;
        
        await analytics.logMessage(effectiveSessionId, messageIndex + 1, 'assistant', visitorFormMessage).catch(e =>
          console.error('[Analytics] Failed to log bot message:', e)
        );
        
        return res.json({ 
          response: visitorFormMessage,
          showVisitorForm: true,
          sessionId: effectiveSessionId
        });
      }
    }

    // If waiting for visitor form submission (non-customer identification)
    if (userSession.awaitingVisitorInfo && userSession.isCustomer === false) {
      // Check if this is a form submission (JSON format)
      let visitorData;
      try {
        visitorData = JSON.parse(message);
        if (visitorData.__visitorForm) {
          const { fullname, phone } = visitorData;
          
          // Validate name (at least 2 words, letters and spaces only)
          if (!fullname || fullname.length < 3 || !/^[a-zA-Z\s]+$/.test(fullname) || fullname.split(/\s+/).length < 2) {
            const nameError = `Please enter your complete full name (first and last name). This is required to proceed.`;
            await analytics.logMessage(effectiveSessionId, messageIndex + 1, 'assistant', nameError).catch(e =>
              console.error('[Analytics] Failed to log bot message:', e)
            );
            return res.json({ 
              response: nameError,
              formError: 'name',
              sessionId: effectiveSessionId
            });
          }
          
          // Validate Ghana phone number (10 digits, optionally starting with 0)
          if (!phone || !/^0?\d{9,10}$/.test(phone.replace(/[\s-]/g, ''))) {
            const phoneError = `Please enter a valid Ghana phone number (e.g., 0241234567 or 241234567). This is required to continue.`;
            await analytics.logMessage(effectiveSessionId, messageIndex + 1, 'assistant', phoneError).catch(e =>
              console.error('[Analytics] Failed to log bot message:', e)
            );
            return res.json({ 
              response: phoneError,
              formError: 'phone',
              sessionId: effectiveSessionId
            });
          }
          
          // Store visitor info
          userSession.visitorName = fullname.trim();
          userSession.visitorPhone = phone.trim();
          userSession.awaitingVisitorInfo = false;
          
          console.log(`[Visitor Info] Name: ${userSession.visitorName}, Phone: ${userSession.visitorPhone}, Session: ${effectiveSessionId}`);
          
          const visitorWelcome = `Thank you, ${userSession.visitorName}! 🏦\n\nI'm happy to help you with:\n• Branch locations and hours\n• Our banking products and services\n• Loan application information\n• Account opening requirements\n• General banking questions\n\nWhat would you like to know?`;
          
          await analytics.logMessage(effectiveSessionId, messageIndex + 1, 'assistant', visitorWelcome).catch(e =>
            console.error('[Analytics] Failed to log bot message:', e)
          );
          
          return res.json({ 
            response: visitorWelcome,
            visitorFormSuccess: true,
            sessionId: effectiveSessionId,
            visitorInfo: {
              name: userSession.visitorName,
              phone: userSession.visitorPhone
            },
            buttons: [
              { text: 'Open an account', action: 'send', value: 'I want to open an account' },
              { text: 'Apply for a loan', action: 'send', value: 'I want to apply for a loan' }
            ]
          });
        }
      } catch (e) {
        // Not a JSON message, ignore
      }
      
      // If we reach here, user sent a regular message while form is expected
      const waitingForForm = `Please fill out the contact information form above to continue.`;
      await analytics.logMessage(effectiveSessionId, messageIndex + 1, 'assistant', waitingForForm).catch(e =>
        console.error('[Analytics] Failed to log bot message:', e)
      );
      return res.json({ 
        response: waitingForForm,
        sessionId: effectiveSessionId
      });
    }
    
    // Block authentication for non-customers
    if (userSession.isCustomer === false) {
      const authDetails = customerAuth.extractAuthDetails(message);
      const hasAuthCredentials = !!(authDetails.accountNumber || authDetails.phoneNumber || authDetails.otp);
      
      if (customerAuth.needsAuthentication(message) || hasAuthCredentials) {
        const blockMessage = `I'm sorry, but account and loan details are only available to AKCB customers.\n\nIf you'd like to become a customer, I can help you with:\n• Account opening requirements\n• Required documents\n• Branch locations\n\nOr call us at 0501290952 to speak with a representative.`;
        
        await analytics.logMessage(effectiveSessionId, messageIndex + 1, 'assistant', blockMessage).catch(e =>
          console.error('[Analytics] Failed to log bot message:', e)
        );
        
        return res.json({ 
          response: blockMessage, 
          sessionId: effectiveSessionId 
        });
      }
    }

    // ===== Phase 3: ML Analysis (non-blocking) =====
    // Analyze sentiment and intent in parallel
    Promise.all([
      analytics.analyzeSentiment(message, effectiveSessionId, messageIndex),
      analytics.classifyIntent(message, effectiveSessionId, messageIndex)
    ]).catch(e => console.error('[ML] Analysis failed:', e));
    
    // Trigger churn prediction asynchronously (non-blocking)
    if (ipAddress) {
      analytics.getOrCreateUserProfile(ipAddress)
        .then(profile => analytics.predictChurn(profile.userId))
        .catch(e => console.error('[ML] Churn prediction failed:', e));
    }

    // Check for account selection FIRST (before auth checks) - when customer has multiple accounts
    const session = customerAuth.getOrCreateSession(effectiveSessionId);
    
    console.log('[Chat] Session state:', {
      awaitingAccountSelection: session.awaitingAccountSelection,
      awaitingOTP: session.awaitingOTP,
      hasAvailableAccounts: !!session.availableAccounts,
      accountsCount: session.availableAccounts?.length || 0
    });
    
    // Handle account selection when customer has multiple accounts
    if (session.awaitingAccountSelection && session.availableAccounts && session.availableAccounts.length > 0) {
      console.log('[Chat] Handling account selection for message:', message);
      const authResult = await customerAuth.selectAccount(effectiveSessionId, message);
      
      console.log('[Chat] Account selection result:', {
        success: authResult.success,
        awaitingOTP: authResult.awaitingOTP,
        stillAwaitingSelection: authResult.session.awaitingAccountSelection
      });
      
      // Log bot response
      await analytics.logMessage(effectiveSessionId, messageIndex + 1, 'assistant', authResult.message).catch(e =>
        console.error('[Analytics] Failed to log bot message:', e)
      );
      
      // Create response with account selection buttons
      const responseData: any = {
        reply: authResult.message,
        source: 'account-selection',
        sessionId: effectiveSessionId,
        awaitingOTP: authResult.awaitingOTP || false
      };
      
      // If still awaiting selection, show buttons
      if (!authResult.success && authResult.session.awaitingAccountSelection && authResult.session.availableAccounts) {
        responseData.buttons = authResult.session.availableAccounts.map((acc, index) => ({
          text: `${index + 1}. ${acc.accountType} - ${acc.accountNumber}`,
          action: 'send',
          value: acc.accountNumber
        }));
      }
      // If account selection succeeded, show quick action buttons
      else if (authResult.success) {
        responseData.buttons = [
          { text: 'Check my balance', action: 'send', value: 'What is my account balance?' },
          { text: 'Recent transactions', action: 'send', value: 'Show me my recent transactions' },
          { text: 'Salary overdraft (salary workers)', action: 'send', value: 'I want to apply for salary overdraft', icon: 'fa fa-money-bill-wave' },
          { text: 'Apply for a loan', action: 'send', value: 'I want to apply for a loan' },
          { text: 'Loan information', action: 'send', value: 'Tell me about my loan' },
          { text: 'Other inquiry', action: 'send', value: 'I have another question' }
        ];
      }
      
      return res.json(responseData);
    }

    // Check if customer needs authentication for account information
    const authDetails = customerAuth.extractAuthDetails(message);
    const hasAuthCredentials = !!(authDetails.accountNumber || authDetails.phoneNumber || authDetails.otp);
    
    // Only allow authentication for identified customers
    if ((customerAuth.needsAuthentication(message) || hasAuthCredentials) && userSession.isCustomer !== false) {
      console.log('[Chat] Authentication required for this query or credentials detected');
      
      // Check if already authenticated
      if (customerAuth.isSessionAuthenticated(effectiveSessionId)) {
        console.log('[Chat] Session authenticated, fetching account data');
        
        const authSession = customerAuth.getOrCreateSession(effectiveSessionId);
        const accountData = await customerAuth.getCustomerAccountData(authSession.accountNumber!);
        
        // Add personalized greeting if this is first query after authentication
        let greeting = '';
        if (authSession.authenticatedAt && 
            (Date.now() - authSession.authenticatedAt.getTime()) < 60000) { // Within 1 minute of auth
          greeting = `Welcome, ${authSession.customerName || 'valued customer'}! ✨\n\n`;
        }
        
        // Determine what info they want - distinguish between account, loan, or both
        let response: string;
        
        // Check if specifically asking about loans only
        if (/\b(loan|owe)\b/i.test(message) && !/\baccount\b/i.test(message)) {
          response = greeting + customerAuth.formatLoanResponse(accountData);
        }
        // Check if specifically asking about account balance only (not loans)
        else if (/\baccount\s+(balance|details|info)/i.test(message) && !/\bloan/i.test(message)) {
          response = greeting + customerAuth.formatAccountBalanceOnly(accountData);
        }
        // Check for transaction/statement requests
        else if (/(transaction|statement|history)/i.test(message)) {
          response = greeting + customerAuth.formatTransactionsResponse(accountData);
        }
        // Default: show both account and loans for general "balance" queries
        else if (/balance/i.test(message)) {
          response = greeting + customerAuth.formatBalanceResponse(accountData);
        }
        // Fallback: show complete info
        else {
          response = greeting + customerAuth.formatBalanceResponse(accountData);
        }
          
        // Log bot response
        await analytics.logMessage(effectiveSessionId, messageIndex + 1, 'assistant', response).catch(e =>
          console.error('[Analytics] Failed to log bot message:', e)
        );
        
        return res.json({ 
          reply: response,
          source: 'authenticated',
          sessionId: effectiveSessionId
        });
      }
      
      // Not authenticated - attempt authentication with OTP flow
      const authResult = await customerAuth.authenticateCustomer(
        effectiveSessionId,
        authDetails.accountNumber,
        authDetails.phoneNumber,
        authDetails.otp
      );
      
      // Log bot response
      await analytics.logMessage(effectiveSessionId, messageIndex + 1, 'assistant', authResult.message).catch(e =>
        console.error('[Analytics] Failed to log bot message:', e)
      );
      
      // Add suggestive buttons if authentication succeeded
      const responseData: any = { 
        reply: authResult.message,
        source: 'authentication',
        sessionId: effectiveSessionId,
        requiresAuth: !authResult.success,
        awaitingOTP: authResult.awaitingOTP || false
      };
      
      // If customer has multiple accounts, show selection buttons
      if (authResult.session.awaitingAccountSelection && authResult.session.availableAccounts) {
        responseData.buttons = authResult.session.availableAccounts.map((acc, index) => ({
          text: `${index + 1}. ${acc.accountType} - ${acc.accountNumber}`,
          action: 'send',
          value: acc.accountNumber
        }));
      }
      else if (authResult.success) {
        responseData.buttons = [
          { text: 'Check my balance', action: 'send', value: 'What is my account balance?' },
          { text: 'Recent transactions', action: 'send', value: 'Show me my recent transactions' },
          { text: 'Salary overdraft (salary workers)', action: 'send', value: 'I want to apply for salary overdraft', icon: 'fa fa-money-bill-wave' },
          { text: 'Apply for a loan', action: 'send', value: 'I want to apply for a loan' },
          { text: 'Loan information', action: 'send', value: 'Tell me about my loan' },
          { text: 'Other inquiry', action: 'send', value: 'I have another question' }
        ];
      }
      
      return res.json(responseData);
    }
    
    // Check if user is sending OTP when session is awaiting verification
    if (session.awaitingOTP) {
      const authDetails = customerAuth.extractAuthDetails(message);
      
      if (authDetails.otp) {
        const authResult = await customerAuth.authenticateCustomer(
          effectiveSessionId,
          undefined,
          undefined,
          authDetails.otp
        );
        
        // Log bot response
        await analytics.logMessage(effectiveSessionId, messageIndex + 1, 'assistant', authResult.message).catch(e =>
          console.error('[Analytics] Failed to log bot message:', e)
        );
        
        // Add suggestive buttons if authentication succeeded
        const responseData: any = { 
          reply: authResult.message,
          source: 'authentication',
          sessionId: effectiveSessionId,
          requiresAuth: !authResult.success,
          awaitingOTP: authResult.awaitingOTP || false
        };
        
        // If OTP verified but account selection needed, show account buttons
        if (!authResult.awaitingOTP && authResult.session.awaitingAccountSelection && authResult.session.availableAccounts) {
          responseData.buttons = authResult.session.availableAccounts.map((acc, index) => ({
            text: `${index + 1}. ${acc.accountType} - ${acc.accountNumber}`,
            action: 'send',
            value: acc.accountNumber
          }));
        }
        else if (authResult.success) {
          responseData.buttons = [
            { text: 'Check my balance', action: 'send', value: 'What is my account balance?' },
            { text: 'Recent transactions', action: 'send', value: 'Show me my recent transactions' },
            { text: 'Salary overdraft (salary workers)', action: 'send', value: 'I want to apply for salary overdraft', icon: 'fa fa-money-bill-wave' },
            { text: 'Apply for a loan', action: 'send', value: 'I want to apply for a loan' },
            { text: 'Loan information', action: 'send', value: 'Tell me about my loan' },
            { text: 'Other inquiry', action: 'send', value: 'I have another question' }
          ];
        }
        
        return res.json(responseData);
      }
    }
    
    // Get KB context
    let kbMatches: string[] = [];
    console.log(`[Chat] Before KB check - message="${message}", typeof=${typeof message}, truthy=${!!message}`);
    if (message) {
      console.log('[Chat] Calling retrieveKB...');
      kbMatches = retrieveKB(message);
      console.log(`[Chat] KB matches found: ${kbMatches.length}`);
    } else {
      console.log('[Chat] Message is falsy, skipping KB');
    }

    // Loan application form (web chatbot will render inline form)
    if (loanApplications.shouldOpenLoanApplicationForm(message)) {
      const reply = `Sure — please fill the loan application form below.`;

      await analytics.logMessage(effectiveSessionId, messageIndex + 1, 'assistant', reply).catch(e =>
        console.error('[Analytics] Failed to log bot message:', e)
      );

      return res.json({
        reply,
        source: 'loan-application',
        sessionId: effectiveSessionId,
        openLoanApplicationForm: true
      });
    }

    // Account opening form (non-customers only - web chatbot will render inline form)
    if (accountOpenings.shouldOpenAccountOpeningForm(message, userSession.isCustomer)) {
      const reply = `Great! Let's help you open an account. Please fill in the form below.`;

      await analytics.logMessage(effectiveSessionId, messageIndex + 1, 'assistant', reply).catch(e =>
        console.error('[Analytics] Failed to log bot message:', e)
      );

      return res.json({
        reply,
        source: 'account-opening',
        sessionId: effectiveSessionId,
        openAccountOpeningForm: true
      });
    }

    // Salary overdraft form (authenticated customers only - for salary workers)
    if (salaryOverdraft.shouldOpenSalaryOverdraftForm(message)) {
      // Check if user is authenticated
      if (!userSession.isAuthenticated || userSession.isCustomer !== true) {
        const reply = `Salary overdraft is exclusively available for verified bank customers who are salary workers. Please authenticate first if you have an account with us.`;

        await analytics.logMessage(effectiveSessionId, messageIndex + 1, 'assistant', reply).catch(e =>
          console.error('[Analytics] Failed to log bot message:', e)
        );

        console.log('[SalaryOverdraft] User not authenticated or not a customer. isAuthenticated:', userSession.isAuthenticated, 'isCustomer:', userSession.isCustomer);

        return res.json({
          reply,
          source: 'salary-overdraft',
          sessionId: effectiveSessionId,
          requiresAuth: true
        });
      }

      const reply = `Great! I can help you apply for a salary overdraft.\n\n⚠️ **Important:** This facility is exclusively for salary workers whose salary is paid into their AKCB account.\n\nPlease fill in the form below with your employment and salary details.`;

      await analytics.logMessage(effectiveSessionId, messageIndex + 1, 'assistant', reply).catch(e =>
        console.error('[Analytics] Failed to log bot message:', e)
      );

      console.log('[SalaryOverdraft] Returning form trigger. isAuthenticated:', userSession.isAuthenticated, 'isCustomer:', userSession.isCustomer);

      return res.json({
        reply,
        source: 'salary-overdraft',
        sessionId: effectiveSessionId,
        openSalaryOverdraftForm: true
      });
    }

    // ALWAYS use OpenAI with full KB context for sophisticated reasoning
    // This enables temporal logic, ethical reasoning, Theory of Mind, causal reasoning, etc.
    // KB matches are provided as context, not returned directly
    console.log(`[Chat] Processing request with OpenAI (KB matches available: ${kbMatches.length})...`);

    // Try OpenAI if configured
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      // Fallback to KB matches if OpenAI not configured
      if (kbMatches.length > 0) {
        const response = kbMatches[0];
        await analytics.logMessage(effectiveSessionId, messageIndex + 1, 'assistant', response).catch(e =>
          console.error('[Analytics] Failed to log bot message:', e)
        );
        return res.json({ 
          reply: response,
          source: 'kb-fallback',
          sessionId: effectiveSessionId
        });
      }
      
      const defaultResponse = 'I can help with banking questions. Please ask about our services, fees, or products.';
      await analytics.logMessage(effectiveSessionId, messageIndex + 1, 'assistant', defaultResponse).catch(e =>
        console.error('[Analytics] Failed to log bot message:', e)
      );
      return res.json({ reply: defaultResponse, source: 'default', sessionId: effectiveSessionId });
    }

    // Build KB context summary for OpenAI (use full KB, not just matches)
    const kbContext = kb.map(entry => {
      const patterns = Array.isArray(entry.patterns) ? entry.patterns.join(', ') : entry.pattern || '';
      return `Topic: ${entry.product}\nInfo: ${entry.answer || entry.response || ''}`;
    }).join('\n\n');

    // Get conversation history for context-aware responses
    const conversationHistory = await analytics.getConversationHistory(effectiveSessionId, 8);
    console.log(`[Chat] Retrieved ${conversationHistory.length} previous messages for context`);

    // Call OpenAI with KB context
    try {
      const systemPrompt = `You are AMA, a friendly and helpful banking assistant for AKCB - Amantin and Kasei Community Bank PLC, a community bank in Ghana.

Your goal is to have natural, helpful conversations with customers while using the knowledge base to provide accurate information.

KNOWLEDGE BASE:
${kbContext}

CONVERSATION GUIDELINES:

1. **Be Conversational & Human-Like**:
   - Remember previous messages in this conversation and refer to them naturally
   - Use conversational language, not robotic responses
   - Ask follow-up questions when appropriate
   - Show empathy and understanding
   - Adapt your tone based on the customer's needs

2. **Use the Knowledge Base Wisely**:
   - Search KB for relevant information about staff, branches, products, services, loans, etc.
   - Don't just copy KB entries - explain them naturally in your own words
   - Connect related topics from the KB when it helps the customer
   - Examples: "Opoku" or "Daniel" → Daniel Opoku (Unit Head, Marketing)

3. **Recognize Your Limits - CRITICAL**:
   ⚠️ If asked about ANY of these topics, you MUST say "I don't have that specific information" and offer escalation:
   
   **Sensitive Topics (Always Escalate):**
   - Employee salaries, compensation, or remuneration (CEO, staff, board, directors, allowances)
   - Questions comparing salaries or asking if salary is "higher/lower" than an amount
   - Tax advice or tax implications
   - Legal advice or legal matters
   - Investment advice or portfolio management
   - Confidential corporate information
   - Personal financial planning
   
   **Response Template:**
   "I don't have that specific information. This requires [specialist/detailed records/expertise]. Would you like me to connect you with a customer representative who can assist you?"
   
   **Examples:**
   - "What's the CEO's salary?" → "I don't have information about executive compensation. Would you like me to connect you with our Corporate Affairs team?"
   - "Is the CEO's salary higher than X?" → "I don't have information about executive compensation. This is confidential information. Would you like me to connect you with someone who handles these inquiries?"
   - "Tax implications?" → "I cannot provide tax advice. Would you like me to connect you with a representative who can guide you to appropriate resources?"

4. **Advanced Reasoning Capabilities**:
   
   **Temporal & Time-Based Logic:**
   - Recognize expired documents ("expired last year" = cannot use today)
   - Understand business hours and schedules ("5:30pm" when closing is "5pm" = too late)
   - Detect anomalies ("3 months, no statements" = investigate issue)
   - Consider time-based causality ("applied yesterday" → "processing takes X days")
   
   **Causal Reasoning:**
   - When asked "why" something happened, consider common causes
   - Examples:
     • Blocked account → security concern, inactivity, verification needed
     • App stopped working → update needed, network issue, expired session
   - When asked about consequences, think ahead
   - Example: "What if I don't pay?" → late fees, credit impact, collection process
   
   **Contextual Understanding (Winograd Schema):**
   - Resolve ambiguous pronouns using context and world knowledge
   - Example: "The tellers feared violence" → tellers (not demonstrators) feared it
   - Example: "She was interested" → refer back to what "she" means in context
   - Use previous conversation to understand "it", "they", "that", "this"
   
   **Theory of Mind (Understanding Others):**
   - Recognize others' beliefs, concerns, and mental states
   - Examples:
     • "My mother doesn't trust mobile banking" → address security concerns, offer branch visit
     • "My friend said..." → acknowledge different experiences, explain variability
     • "Should I help someone at ATM?" → offer polite assistance, mention staff availability
   - Understand that people have different perspectives and experiences
   
   **Ethical Decision-Making Framework:**
   
   ⚠️ **CRITICAL ETHICAL SCENARIOS - ALWAYS ADDRESS:**
   
   • **ATM Errors:** If ATM gives extra money, advise customer to report it immediately to bank
     Response: "Please report this to the bank immediately. It's the right thing to do, and it helps ensure accurate records. You can call our hotline or visit any branch."
   
   • **Account Sharing Risks:** If someone asks to use another's account (theirs is blocked)
     Response: "I would strongly advise against this. Using someone else's account can violate banking regulations and may be associated with money laundering. It's risky for both parties. Instead, help your friend contact the bank to resolve why their account is blocked."
   
   • **Security Vulnerabilities:** If customer reports app/system vulnerability
     Response: "Thank you for reporting this! Security is very important to us. Please contact our IT department immediately at [contact]. We really appreciate responsible disclosure - it helps us keep all customers safe."
   
   • **Social Engineering/Fraud Attempts:** If someone claims to be inspector/auditor/official
     Response: "I cannot provide customer account information or verify accounts over chat. For official bank business, please contact our Head Office directly or visit in person with proper credentials."
   
   • **Password Reset Requests:** Never reset passwords or provide account access via chat
     Response: "For security reasons, I cannot reset passwords through chat. Please visit any branch with valid ID, or use the 'Forgot Password' feature in the app with proper verification."

5. **When You Cannot Help**:
   - Be honest when information isn't in your knowledge base
   - Say "I don't have that specific information" or "This is outside my current knowledge"
   - Then offer to connect them: "Would you like me to connect you with a customer representative?"
   - This triggers automatic escalation to human assistance

6. **Handle Requests Intelligently**:
   - For agent requests: Acknowledge their request, provide contact info (0501290952), and ask if they'd like to be connected now
   - For misspellings: Understand intent (e.g., "prodicts" → "products")
   
   **CRITICAL - Disambiguation for Vague Requests:**
   When a request is vague or ambiguous, ALWAYS ask specific clarifying questions:
   
   Examples:
   • "Your service is too slow" → "I apologize for the delay. Which service are you referring to? Is it the mobile banking app, branch service, transaction processing, or something else? This will help me assist you better."
   
   • "I want to open something" / "I want something for my future" → "I'd be happy to help! What type of account or service are you interested in? We offer:
     - Savings accounts (for secure savings with interest)
     - Current accounts (for daily transactions)
     - Fixed deposit accounts (for higher returns)
     - Investment options
     What are your goals or what would you like to achieve?"
   
   • "Can you help me with money?" → "Of course! What kind of help do you need? Are you looking to:
     - Deposit money
     - Withdraw funds
     - Transfer money
     - Apply for a loan
     - Check your balance
     - Something else?"
   
   • "I need help with rates" → "I'd be happy to explain our rates. Which rates are you interested in?
     - Loan interest rates
     - Savings account interest rates
     - Transfer fees
     - Other charges"
   
   **Never jump to forms or actions when the request is vague** - engage in conversation first to understand intent.

7. **Be Proactive & Helpful**:
   - When helping with applications (loans, accounts), provide preparatory information first:
     • What documents they'll need
     • Brief overview of options available
     • Ask if they have questions before proceeding
   - Anticipate follow-up questions and address them
   - Offer related services when relevant
   - Give specific details: actual names, numbers, locations from KB
   
   **General Questions vs Account-Specific Actions:**
   - For GENERAL questions ("What happens if I miss a loan payment?", "What are the fees?"), provide helpful explanations WITHOUT asking for account verification
   - Only ask for account details when the customer wants to perform an ACCOUNT-SPECIFIC action:
     • Check their specific balance
     • View their transaction history
     • Make a transfer
     • Block their card
     • Get details about THEIR loan
   - Example: "What happens if I miss a payment?" → Explain consequences generally (late fees, credit impact)
   - Example: "Check my balance" → Then ask for account verification

8. **Natural Flow**:
   - If customer says "yes" after you offer help, proceed naturally
   - If they ask follow-ups, continue the conversation thread
   - Don't repeat yourself unless customer didn't understand
   - End with helpful next steps or asking if they need anything else

Remember: You're having a real conversation with a real person. Be helpful, be natural, be smart, show sophisticated reasoning, handle ethical dilemmas properly, and know when to escalate!`;

      // Build messages array with conversation history
      const messages: Array<{ role: string; content: string }> = [
        { role: 'system', content: systemPrompt }
      ];

      // Add conversation history for context
      conversationHistory.forEach(msg => {
        messages.push({
          role: msg.role as 'user' | 'assistant',
          content: msg.content
        });
      });

      // Add current message
      messages.push({ role: 'user', content: message });

      console.log(`[Chat] Sending ${messages.length} messages to OpenAI (1 system + ${conversationHistory.length} history + 1 current)`);

      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
          messages,
          max_tokens: 400,
          temperature: 0.7
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      let reply = response.data.choices[0]?.message?.content || 'I could not generate a response.';
      
      // Fix undefined/empty response bug
      if (!reply || reply.trim() === '' || reply === 'undefined' || reply === 'null') {
        console.log('[Chat] Empty/undefined response detected, triggering escalation');
        reply = "I'm having trouble processing that question right now. Let me connect you with someone who can help you better.";
      }
      
      console.log(`[Chat] OpenAI response: ${reply}`);
      
      // Detect if AI is suggesting to contact someone or can't help
      const replyLower = reply.toLowerCase();
      const messageLower = message.toLowerCase();
      
      // Enhanced escalation detection
      const suggestHandover = 
        // Standard escalation phrases
        replyLower.includes('call:') || 
        replyLower.includes('email:') ||
        replyLower.includes('contact') && replyLower.includes('0501290952') ||
        replyLower.includes('speak to') && replyLower.includes('agent') ||
        replyLower.includes('talk to') && replyLower.includes('agent') ||
        replyLower.includes('connect you with') ||
        replyLower.includes('i don\'t have that') ||
        replyLower.includes('i don\'t have specific') ||
        replyLower.includes('i don\'t have information') ||
        replyLower.includes('don\'t have that specific') ||
        replyLower.includes('don\'t have information about') ||
        replyLower.includes('outside my expertise') ||
        replyLower.includes('outside of my expertise') ||
        replyLower.includes('outside my current knowledge') ||
        replyLower.includes('cannot help') ||
        replyLower.includes('cannot provide') ||
        replyLower.includes('i cannot provide') ||
        replyLower.includes('unable to assist') ||
        replyLower.includes('would you like me to connect') ||
        replyLower.includes('connect you with a customer representative') ||
        replyLower.includes('connect you with a representative') ||
        replyLower.includes('connect you with our') ||
        replyLower.includes('this requires') ||
        replyLower.includes('this is confidential') ||
        replyLower.includes('confidential information') ||
        replyLower.includes('visit our') && replyLower.includes('office') ||
        // Sensitive topic detection in user query (backup) - catches salary/compensation questions
        (messageLower.includes('salary') || messageLower.includes('compensation') || messageLower.includes('remuneration') || messageLower.includes('allowance')) && 
        (messageLower.includes('ceo') || messageLower.includes('director') || messageLower.includes('staff') || messageLower.includes('employee') || messageLower.includes('board') || messageLower.includes('higher') || messageLower.includes('lower') || messageLower.includes('how much')) ||
        messageLower.includes('tax') && (messageLower.includes('advice') || messageLower.includes('implications')) ||
        messageLower.includes('legal advice') ||
        messageLower.includes('investment advice') ||
        messageLower.includes('portfolio management') ||
        // Empty/error response
        reply.includes('having trouble processing');
      
      if (suggestHandover) {
        console.log('[Chat] Handover suggested - AI indicated human assistance needed or sensitive topic detected');
      }
      
      // Log bot response
      await analytics.logMessage(effectiveSessionId, messageIndex + 1, 'assistant', reply).catch(e =>
        console.error('[Analytics] Failed to log bot message:', e)
      );
      
      return res.json({ 
        reply: reply,
        source: 'openai',
        sessionId: effectiveSessionId,
        suggestHandover: suggestHandover
      });
    } catch (error: any) {
      console.error('[OpenAI] Error:', error.message);
      const errorResponse = 'I encountered an issue processing your request. Please try again.';
      
      // Log bot response
      await analytics.logMessage(effectiveSessionId, messageIndex + 1, 'assistant', errorResponse).catch(e =>
        console.error('[Analytics] Failed to log bot message:', e)
      );
      
      return res.json({ 
        reply: errorResponse,
        source: 'error',
        sessionId: effectiveSessionId,
        suggestHandover: true // Always suggest handover on errors
      });
    }
  } catch (err: any) {
    console.error('[Chat] Error:', err.message);
    console.error('[Chat] Stack:', err.stack);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Session endpoint - for frontend compatibility
app.post('/api/session', (req: Request, res: Response) => {
  console.log('[Session] Creating session');
  const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Start analytics session
  const ipAddress = req.ip || req.headers['x-forwarded-for'] as string;
  const userAgent = req.headers['user-agent'];
  analytics.startSession(sessionId, ipAddress, userAgent).catch(e =>
    console.error('[Analytics] Failed to start session:', e)
  );
  
  res.json({ sessionId });
});

// End session endpoint
app.post('/api/session/end', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID required' });
    }
    
    await analytics.endSession(sessionId);
    
    // ===== Phase 3: Categorize conversation when session ends (non-blocking) =====
    analytics.categorizeConversation(sessionId).catch(e => 
      console.error('[ML] Conversation categorization failed:', e)
    );
    
    res.json({ success: true, message: 'Session ended' });
  } catch (error: any) {
    console.error('[Session] Error ending session:', error);
    res.status(500).json({ error: 'Failed to end session' });
  }
});

// ===== Analytics Endpoints (Admin Access) =====

// Debug endpoint to check database directly
app.get('/api/admin/analytics/debug', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!isValidAdminToken(token)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const sessions = await executeQuery('SELECT COUNT(*) as count FROM chat_sessions');
    const messages = await executeQuery('SELECT COUNT(*) as count FROM conversation_logs');
    const users = await executeQuery('SELECT COUNT(*) as count FROM user_profiles');
    
    res.json({
      sessions: sessions[0]?.count || 0,
      messages: messages[0]?.count || 0,
      users: users[0]?.count || 0,
      dbType: DB_TYPE
    });
  } catch (error: any) {
    console.error('[Analytics] Debug error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get analytics summary
app.get('/api/admin/analytics/summary', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!isValidAdminToken(token)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
    
    const summary = await analytics.getAnalyticsSummary(startDate, endDate);

    const dateFilter = startDate && endDate
      ? DB_TYPE === 'postgres'
        ? 'WHERE start_time BETWEEN $1 AND $2'
        : 'WHERE start_time BETWEEN ? AND ?'
      : '';
    const params = startDate && endDate ? [startDate, endDate] : [];

    // User metrics (based on unique IPs per session)
    const totalUsersQuery = `SELECT COUNT(DISTINCT ip_address) as count FROM chat_sessions WHERE ip_address IS NOT NULL ${dateFilter ? 'AND ' + dateFilter.replace('WHERE ', '') : ''}`;
    const totalUsersResult = await executeQuery<{ count: string | number }>(totalUsersQuery, params);
    const totalUsers = Number(totalUsersResult[0]?.count || 0);

    const returningUsersQuery = `
      SELECT COUNT(*) as count
      FROM (
        SELECT ip_address
        FROM chat_sessions
        WHERE ip_address IS NOT NULL ${dateFilter ? 'AND ' + dateFilter.replace('WHERE ', '') : ''}
        GROUP BY ip_address
        HAVING COUNT(*) > 1
      ) t
    `;
    const returningUsersResult = await executeQuery<{ count: string | number }>(returningUsersQuery, params);
    const returningUsers = Number(returningUsersResult[0]?.count || 0);

    // Satisfaction (from feedback table)
    const avgSatisfactionQuery = `
      SELECT AVG(score) as avg_score
      FROM feedback
      ${dateFilter ? 'WHERE session_id IN (SELECT session_id FROM chat_sessions ' + dateFilter + ')' : ''}
    `;
    const avgSatisfactionResult = await executeQuery<{ avg_score: string | number | null }>(avgSatisfactionQuery, dateFilter ? params : []);
    const avgSatisfactionRaw = avgSatisfactionResult[0]?.avg_score;
    const avgSatisfaction = avgSatisfactionRaw === null || avgSatisfactionRaw === undefined ? null : Number(avgSatisfactionRaw);

    res.json({
      ...summary,
      // Keep avgSessionDuration in seconds for backward compatibility.
      avgSessionDurationMinutes: summary.avgSessionDuration ? summary.avgSessionDuration / 60 : 0,
      totalUsers,
      returningUsers,
      avgSatisfaction
    });
  } catch (error: any) {
    console.error('[Analytics] Error getting summary:', error);
    res.status(500).json({ error: 'Failed to get analytics summary' });
  }
});

// Get recent sessions
app.get('/api/admin/analytics/sessions', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!isValidAdminToken(token)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    const sessions = await analytics.getRecentSessions(limit);
    res.json(sessions);
  } catch (error: any) {
    console.error('[Analytics] Error getting sessions:', error);
    res.status(500).json({ error: 'Failed to get sessions' });
  }
});

// Get session details
app.get('/api/admin/analytics/session/:sessionId', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!isValidAdminToken(token)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const { sessionId } = req.params;
    const details = await analytics.getSessionDetails(sessionId);
    res.json(details);
  } catch (error: any) {
    console.error('[Analytics] Error getting session details:', error);
    res.status(500).json({ error: 'Failed to get session details' });
  }
});

// Export analytics as CSV
app.get('/api/admin/analytics/export', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!isValidAdminToken(token)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
    
    const csv = await analytics.exportAnalyticsCSV(startDate, endDate);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="analytics-export.csv"');
    res.send(csv);
  } catch (error: any) {
    console.error('[Analytics] Error exporting:', error);
    res.status(500).json({ error: 'Failed to export analytics' });
  }
});

// ===== Phase 2: User Engagement Endpoints =====

// Get personalized greeting and recommendations
app.post('/api/greeting', async (req: Request, res: Response) => {
  try {
    const ipAddress = req.ip || req.headers['x-forwarded-for'] as string;
    const sessionId = (req.body as any)?.sessionId;
    
    // Generate session ID if not provided
    const effectiveSessionId = sessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Mark that this session has been shown the welcome message
    const userSession = customerAuth.getOrCreateSession(effectiveSessionId);
    userSession.customerIdentified = true; // Mark as identified (question has been asked)
    console.log('[Greeting] Session initialized:', effectiveSessionId, 'customerIdentified:', userSession.customerIdentified);
    
    // Get user profile
    const userProfile = await analytics.getOrCreateUserProfile(ipAddress);
    
    // Start session in database (so feedback can reference it)
    await analytics.startSession(effectiveSessionId, ipAddress, req.headers['user-agent'] as string | undefined);
    
    // Generate personalized greeting
    const greeting = await analytics.getPersonalizedGreeting(userProfile.userId);
    
    // Get recommendations (from last session if exists)
    let recommendations: any[] = [];
    if (userProfile.totalSessions > 0) {
      const recentSessions = await analytics.getRecentSessions(1);
      if (recentSessions.length > 0) {
        recommendations = await analytics.generateRecommendations(recentSessions[0].sessionId);
      }
    }
    
    // Get pending follow-ups
    const followUps = await analytics.getPendingFollowUps(userProfile.userId);
    
    res.json({
      greeting: greeting || `Welcome to Amantin and Kasei Community Bank! 👋\n\nAre you a customer of AKCB?`,
      userSegment: userProfile.segment,
      recommendations,
      followUps,
      returning: userProfile.totalSessions > 0,
      sessionId: effectiveSessionId,
      buttons: [
        { text: 'Yes - I\'m a customer', action: 'send', value: 'Yes, I am a customer of AKCB' },
        { text: 'No - General inquiry', action: 'send', value: 'No, I have a general inquiry' },
        { text: '🆘 Assistance', action: 'handover', value: 'assistance' }
      ]
    });
  } catch (error: any) {
    console.error('[Greeting] Error:', error);
    const effectiveSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    res.json({ 
      greeting: `Welcome to Amantin and Kasei Community Bank! 👋\n\nAre you a customer of AKCB?`,
      sessionId: effectiveSessionId,
      buttons: [
        { text: 'Yes - I\'m a customer', action: 'send', value: 'Yes, I am a customer of AKCB' },
        { text: 'No - General inquiry', action: 'send', value: 'No, I have a general inquiry' },
        { text: '🆘 Assistance', action: 'handover', value: 'assistance' }
      ]
    });
  }
});

// Save feedback
app.post('/api/feedback', async (req: Request, res: Response) => {
  try {
    const { sessionId, messageId, feedbackType, score, comment } = req.body;
    
    if (!sessionId || messageId === undefined || !feedbackType || score === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    await analytics.saveFeedback(sessionId, messageId, feedbackType, score, comment);
    
    res.json({ success: true, message: 'Thank you for your feedback!' });
  } catch (error: any) {
    console.error('[Feedback] Error:', error);
    res.status(500).json({ error: 'Failed to save feedback' });
  }
});

// Get recommendations for current session
app.post('/api/recommendations', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID required' });
    }
    
    const recommendations = await analytics.generateRecommendations(sessionId);
    res.json({ recommendations });
  } catch (error: any) {
    console.error('[Recommendations] Error:', error);
    res.status(500).json({ error: 'Failed to generate recommendations' });
  }
});

// Create follow-up action
app.post('/api/followup', async (req: Request, res: Response) => {
  try {
    const { sessionId, topic, action } = req.body;
    
    if (!sessionId || !topic || !action) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const ipAddress = req.ip || req.headers['x-forwarded-for'] as string;
    const userProfile = await analytics.getOrCreateUserProfile(ipAddress);
    
    await analytics.createFollowUp(userProfile.userId, sessionId, topic, action);
    
    res.json({ success: true, message: 'Follow-up action created' });
  } catch (error: any) {
    console.error('[FollowUp] Error:', error);
    res.status(500).json({ error: 'Failed to create follow-up' });
  }
});

// Complete follow-up
app.post('/api/followup/complete', async (req: Request, res: Response) => {
  try {
    const { followUpId } = req.body;
    
    if (!followUpId) {
      return res.status(400).json({ error: 'Follow-up ID required' });
    }
    
    await analytics.completeFollowUp(followUpId);
    
    res.json({ success: true, message: 'Follow-up completed' });
  } catch (error: any) {
    console.error('[FollowUp] Error:', error);
    res.status(500).json({ error: 'Failed to complete follow-up' });
  }
});

/**
 * Send SMS notification to branch about customer escalation
 */
async function sendBranchSMS(
  branchPhone: string,
  ticketId: string,
  customerName: string,
  customerPhone: string,
  customerMessage: string,
  branchLocation: string
): Promise<void> {
  const apiKey = process.env.SMS_ONLINE_API_KEY;
  const senderName = process.env.SMS_ONLINE_SENDER || 'AKCB';

  if (!apiKey) {
    console.log('[SMS] API key not configured, skipping notification');
    return;
  }

  // Format phone number (233XXXXXXXXX format)
  let formattedPhone = branchPhone;
  if (branchPhone.startsWith('0')) {
    formattedPhone = '233' + branchPhone.substring(1);
  } else if (branchPhone.startsWith('+233')) {
    formattedPhone = branchPhone.substring(1);
  } else if (!branchPhone.startsWith('233')) {
    formattedPhone = '233' + branchPhone;
  }

  // Compose SMS message
  const smsText = `AKCB ESCALATION - ${branchLocation} Branch\n` +
    `Ticket: ${ticketId}\n` +
    `Customer: ${customerName}\n` +
    `Phone: ${customerPhone}\n` +
    `Issue: ${customerMessage.substring(0, 100)}${customerMessage.length > 100 ? '...' : ''}\n` +
    `Please contact customer ASAP.`;

  const smsData = {
    text: smsText,
    type: 0,
    sender: senderName,
    destinations: [formattedPhone]
  };

  // Create HTTPS agent with CA certificate
  let httpsAgent;
  const cacertPath = path.join(process.cwd(), 'cacert.pem');
  
  try {
    if (fs.existsSync(cacertPath)) {
      const ca = fs.readFileSync(cacertPath);
      httpsAgent = new https.Agent({
        ca: ca,
        rejectUnauthorized: true
      });
    } else {
      httpsAgent = new https.Agent({
        rejectUnauthorized: true
      });
    }
  } catch {
    httpsAgent = new https.Agent({
      rejectUnauthorized: true
    });
  }

  // Send SMS
  try {
    const response = await axios.post(
      'https://api.smsonlinegh.com/v5/message/sms/send',
      smsData,
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `key ${apiKey}`
        },
        httpsAgent,
        timeout: 15000
      }
    );

    if (response.data?.handshake?.label === 'HSHK_OK') {
      console.log(`[SMS] Notification sent to ${branchLocation} Branch (${formattedPhone})`);
    } else {
      console.warn('[SMS] Unexpected response:', response.data);
    }
  } catch (error: any) {
    console.error('[SMS] Failed to send notification:', error.message);
    throw error;
  }
}

// Customer escalation/handover request
app.post('/api/handover', async (req: Request, res: Response) => {
  try {
    const { sessionId, name, phone, message, lat, lng } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID required' });
    }

    console.log('[Handover] Request received:', { sessionId, name, phone, hasLocation: !!(lat && lng) });

    // Verify session exists
    const sessions = await executeQuery<any>(
      'SELECT session_id FROM chat_sessions WHERE session_id = $1',
      [sessionId]
    );

    if (!sessions || sessions.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Generate unique ticket ID
    const ticketId = `TICKET-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // AKCB Branch locations with coordinates (Amantin & Kasei Community Bank)
    const branches = [
      { code: 'GH1510010', name: 'AMANTIN AND KASEI HO.', lat: 6.70, lng: -1.62, location: 'Head Office', phone: '' },
      { code: 'GH1510011', name: 'AMANTIN n KASEI-EJURA', lat: 7.3833, lng: -1.3667, location: 'Ejura', phone: '+233202055172' },
      { code: 'GH1510012', name: 'AMANTINnKASEI-KWAME DS', lat: 7.35, lng: -1.40, location: 'Kwame Danso', phone: '+233202055174' },
      { code: 'GH1510013', name: 'AMANTINnKASEI-ATEBUBU', lat: 7.75, lng: -0.98, location: 'Atebubu', phone: '+233202055173' },
      { code: 'GH1510014', name: 'AMANTINnKASEI-YEJI', lat: 7.82, lng: -0.22, location: 'Yeji', phone: '+233202055175' },
      { code: 'GH1510015', name: 'AMANTINnKASEI-AMANTIN', lat: 6.73, lng: -1.74, location: 'Amantin', phone: '' },
      { code: 'GH1510016', name: 'AMANTINnKASEI-AHWIAA', lat: 6.62, lng: -1.55, location: 'Ahwiaa', phone: '+233202099931' },
      { code: 'GH1510017', name: 'AMANTINnKASEI-KAJAJI', lat: 6.70, lng: -1.60, location: 'Kajeji', phone: '+233240526372' },
      { code: 'GH1510018', name: 'AMANTINnKASEI-KEJETIA', lat: 6.6880, lng: -1.6229, location: 'Kejetia', phone: '+233248698267' }
    ];

    // Determine target branch based on location (if provided)
    let targetBranch = branches[0].name; // Default to Head Office
    let targetLocation = branches[0].location;

    if (lat && lng) {
      // Calculate distance to each branch and find nearest
      let minDistance = Infinity;
      
      for (const branch of branches) {
        const distance = Math.sqrt(
          Math.pow((lat - branch.lat) * 111, 2) + // ~111km per degree latitude
          Math.pow((lng - branch.lng) * 111 * Math.cos(lat * Math.PI / 180), 2) // longitude adjusted for latitude
        );
        
        if (distance < minDistance) {
          minDistance = distance;
          targetBranch = branch.name;
          targetLocation = branch.location;
        }
      }
      
      console.log('[Handover] Location-based routing:', { 
        lat, 
        lng, 
        nearestBranch: targetBranch,
        location: targetLocation,
        distanceKm: Math.round(minDistance * 10) / 10 
      });
    } else {
      console.log('[Handover] No location provided, routing to Head Office');
    }

    // Store escalation in database (create table if needed)
    try {
      // Create escalations table if it doesn't exist
      if (DB_TYPE === 'postgres') {
        await executeQuery(`
          CREATE TABLE IF NOT EXISTS escalations (
            id SERIAL PRIMARY KEY,
            ticket_id VARCHAR(255) UNIQUE NOT NULL,
            session_id VARCHAR(255) NOT NULL,
            customer_name VARCHAR(255),
            customer_phone VARCHAR(50),
            message TEXT,
            latitude DECIMAL(10, 7),
            longitude DECIMAL(10, 7),
            target_branch VARCHAR(100),
            status VARCHAR(50) DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);

        await executeQuery(`
          CREATE INDEX IF NOT EXISTS idx_escalations_status ON escalations(status)
        `);

        await executeQuery(`
          CREATE INDEX IF NOT EXISTS idx_escalations_created ON escalations(created_at)
        `);
      } else {
        // MySQL
        await executeQuery(`
          CREATE TABLE IF NOT EXISTS escalations (
            id INT AUTO_INCREMENT PRIMARY KEY,
            ticket_id VARCHAR(255) UNIQUE NOT NULL,
            session_id VARCHAR(255) NOT NULL,
            customer_name VARCHAR(255),
            customer_phone VARCHAR(50),
            message TEXT,
            latitude DECIMAL(10, 7),
            longitude DECIMAL(10, 7),
            target_branch VARCHAR(100),
            status VARCHAR(50) DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_status (status),
            INDEX idx_created (created_at)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
      }

      // Insert escalation record
      await executeQuery(
        DB_TYPE === 'postgres'
          ? `INSERT INTO escalations 
             (ticket_id, session_id, customer_name, customer_phone, message, latitude, longitude, target_branch) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`
          : `INSERT INTO escalations 
             (ticket_id, session_id, customer_name, customer_phone, message, latitude, longitude, target_branch) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [ticketId, sessionId, name || null, phone || null, message || null, lat || null, lng || null, targetBranch]
      );

      console.log('[Handover] Escalation saved:', ticketId);

      // Send SMS notification to the branch
      try {
        const selectedBranch = branches.find(b => b.name === targetBranch);
        if (selectedBranch && selectedBranch.phone) {
          await sendBranchSMS(
            selectedBranch.phone,
            ticketId,
            name || 'Customer',
            phone || 'Not provided',
            message || 'Callback requested',
            targetLocation
          );
        }
      } catch (smsError: any) {
        console.error('[Handover] SMS notification failed:', smsError.message);
        // Don't fail the request if SMS fails
      }

    } catch (dbError: any) {
      console.error('[Handover] Database error:', dbError.message);
      // Continue even if DB save fails - at least log it
    }

    res.json({
      ok: true,
      ticketId,
      targetBranch: `${targetLocation} Branch`,
      message: 'Your request has been submitted. An agent will contact you soon.'
    });

  } catch (error: any) {
    console.error('[Handover] Error:', error);
    res.status(500).json({ error: 'Failed to submit handover request' });
  }
});

// Get user segment distribution (admin)
app.get('/api/admin/segments', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!isValidAdminToken(token)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const distribution = await analytics.getSegmentDistribution();
    res.json({ distribution });
  } catch (error: any) {
    console.error('[Segments] Error:', error);
    res.status(500).json({ error: 'Failed to get segment distribution' });
  }
});

// Get escalations (admin)
app.get('/api/admin/escalations', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!isValidAdminToken(token)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const status = req.query.status as string || 'all';
    
    let query: string;
    let params: any[] = [];

    if (status === 'all') {
      query = `SELECT * FROM escalations ORDER BY created_at DESC LIMIT 100`;
    } else {
      query = DB_TYPE === 'postgres'
        ? `SELECT * FROM escalations WHERE status = $1 ORDER BY created_at DESC LIMIT 100`
        : `SELECT * FROM escalations WHERE status = ? ORDER BY created_at DESC LIMIT 100`;
      params = [status];
    }

    const escalations = await executeQuery<any>(query, params);

    res.json({ 
      escalations: escalations || [],
      total: escalations?.length || 0
    });

  } catch (error: any) {
    console.error('[Escalations] Error:', error);
    res.status(500).json({ error: 'Failed to get escalations' });
  }
});

// OpenAI Text-to-Speech endpoint
app.post('/api/tts', async (req: Request, res: Response) => {
  try {
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Text required' });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ error: 'TTS service not configured' });
    }

    console.log('[TTS] Generating speech for text:', text.substring(0, 50));

    // Call OpenAI TTS API
    const response = await axios.post(
      'https://api.openai.com/v1/audio/speech',
      {
        model: 'tts-1',
        voice: 'nova', // Female voice, can be: alloy, echo, fable, onyx, nova, shimmer
        input: text,
        speed: 1.0
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        responseType: 'arraybuffer'
      }
    );

    console.log('[TTS] Speech generated successfully');
    
    // Return the audio file
    res.set('Content-Type', 'audio/mpeg');
    res.send(Buffer.from(response.data));
  } catch (error: any) {
    console.error('[TTS] Error:', error.message);
    res.status(500).json({ error: 'Failed to generate speech' });
  }
});

// Nearest branch locator endpoint
app.post('/api/nearest-branch', async (req: Request, res: Response) => {
  try {
    const { lat, lng, plusCode } = req.body;
    
    console.log('[NearestBranch] Request:', { lat, lng, plusCode });

    // Branch locations with coordinates
    const branches = [
      { code: 'GH1510010', name: 'Head Office', lat: 7.6667, lng: -1.4167, phone: '', address: 'Amantin High Street' },
      { code: 'GH1510011', name: 'Ejura', lat: 7.3850, lng: -1.3622, phone: '+233 20 205 5172', address: 'Ejura' },
      { code: 'GH1510012', name: 'Kwame Danso', lat: 7.6303, lng: -1.4770, phone: '+233 20 205 5174', address: 'Kwame Danso', plusCode: 'P8JF+2C6' },
      { code: 'GH1510013', name: 'Atebubu', lat: 7.7558, lng: -0.9922, phone: '+233 20 205 5173', address: 'Atebubu' },
      { code: 'GH1510014', name: 'Yeji', lat: 7.8265, lng: -0.5043, phone: '+233 20 205 5175', address: 'Yeji', plusCode: '68GW+FHJ' },
      { code: 'GH1510015', name: 'Amantin', lat: 6.73, lng: -1.74, phone: '', address: 'Amantin' },
      { code: 'GH1510016', name: 'Ahwiaa', lat: 6.8047, lng: -1.4987, phone: '+233 20 209 9931', address: 'Kumasi-Techiman Road, Ahwiaa', plusCode: 'QC32+V79' },
      { code: 'GH1510017', name: 'Kajeji', lat: 7.7367, lng: -1.4939, phone: '+233 24 052 6372', address: 'Kajeji East, Tatobatoi', plusCode: 'QQJG+P27' },
      { code: 'GH1510018', name: 'Kejetia', lat: 6.6928, lng: -1.6236, phone: '+233 24 869 8267', address: 'Kejetia market, Kumasi' }
    ];

    if (!lat || !lng) {
      return res.status(400).json({ error: 'Location coordinates required' });
    }

    // Calculate distance using Haversine formula
    function getDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
      const R = 6371; // Earth's radius in km
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLng = (lng2 - lng1) * Math.PI / 180;
      const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    }

    // Find nearest branch
    let nearest = branches[0];
    let minDistance = getDistance(lat, lng, nearest.lat, nearest.lng);

    for (const branch of branches) {
      const distance = getDistance(lat, lng, branch.lat, branch.lng);
      if (distance < minDistance) {
        minDistance = distance;
        nearest = branch;
      }
    }

    const distanceText = minDistance < 1 
      ? `${Math.round(minDistance * 1000)}m` 
      : `${minDistance.toFixed(1)}km`;

    // Navigation links (provide fallbacks for environments where Google is blocked)
    const mapsUrlGoogle = `https://www.google.com/maps/dir/?api=1&origin=${lat},${lng}&destination=${nearest.lat},${nearest.lng}`;
    const mapsUrlOSM = `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${lat}%2C${lng}%3B${nearest.lat}%2C${nearest.lng}`;
    const mapsUrlApple = `https://maps.apple.com/?saddr=${lat},${lng}&daddr=${nearest.lat},${nearest.lng}`;
    const geoUri = `geo:${nearest.lat},${nearest.lng}?q=${nearest.lat},${nearest.lng}(${encodeURIComponent(nearest.name)})`;

    const responseText = `📍 **Nearest Branch: ${nearest.name}**\n\n` +
      `🏦 Branch Code: ${nearest.code}\n` +
      `📏 Distance: ~${distanceText}\n` +
      `📞 Phone: ${nearest.phone}\n` +
      `📌 Address: ${nearest.address}\n\n` +
      `**📍 GPS Coordinates:**\n` +
      `${nearest.lat}, ${nearest.lng}\n\n` +
      `Copy the coordinates above and paste them into any map app (Google Maps, Waze, etc.) to get directions.\n\n` +
      `Or try these links:\n` +
      `[Google Maps](${mapsUrlGoogle}) • [OpenStreetMap](${mapsUrlOSM}) • [Apple Maps](${mapsUrlApple})\n` +
      `Mobile: [Open in Maps App](${geoUri})`;

    console.log('[NearestBranch] Found:', nearest.name, nearest.code, distanceText);

    res.json({ 
      success: true,
      text: responseText,
      branch: nearest,
      distance: minDistance,
      mapsUrl: mapsUrlGoogle
    });
  } catch (error: any) {
    console.error('[NearestBranch] Error:', error.message);
    res.status(500).json({ error: 'Failed to find nearest branch' });
  }
});

// ============================================================
// ADMIN ROUTES - Balance Upload System
// ============================================================

// Admin login endpoint
app.post('/api/admin/login', (req: Request, res: Response) => {
  try {
    const { password } = req.body;
    
    if (!password) {
      return res.status(400).json({ error: 'Password required' });
    }
    
    if (password === ADMIN_PASSWORD) {
      const token = generateToken();
      adminTokens.add(token);
      console.log('[Admin] Login successful, token generated');
      return res.json({ token });
    } else {
      console.log('[Admin] Login failed - invalid password');
      return res.status(401).json({ error: 'Invalid password' });
    }
  } catch (error: any) {
    console.error('[Admin] Login error:', error.message);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Admin logout endpoint
app.post('/api/admin/logout', (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      adminTokens.delete(token);
      console.log('[Admin] Logout successful');
    }
    res.json({ success: true });
  } catch (error: any) {
    console.error('[Admin] Logout error:', error.message);
    res.status(500).json({ error: 'Logout failed' });
  }
});

// Admin token verification endpoint
app.get('/api/admin/verify', (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const token = authHeader.substring(7);
    if (adminTokens.has(token) || token === process.env.ADMIN_TOKEN) {
      return res.json({ valid: true });
    } else {
      return res.status(401).json({ error: 'Invalid token' });
    }
  } catch (error: any) {
    console.error('[Admin] Verify error:', error.message);
    res.status(500).json({ error: 'Verification failed' });
  }
});

// Knowledge Base API endpoints
app.get('/api/kb', (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const token = authHeader.substring(7);
    if (!adminTokens.has(token) && token !== process.env.ADMIN_TOKEN) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Return KB entries with IDs
    const entriesWithIds = kb.map((entry, index) => ({
      ...entry,
      id: entry.id || String(index),
      question: entry.patterns?.[0] || entry.pattern || '',
      answer: entry.answer || entry.response || ''
    }));
    
    res.json(entriesWithIds);
  } catch (error: any) {
    console.error('[KB] Get error:', error.message);
    res.status(500).json({ error: 'Failed to load KB' });
  }
});

app.post('/api/kb', (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const token = authHeader.substring(7);
    if (!adminTokens.has(token) && token !== process.env.ADMIN_TOKEN) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const { question, answer, product, patterns } = req.body;
    
    const newEntry: kbModule.KBEntry = {
      id: String(Date.now()),
      product: product || 'General',
      patterns: patterns || [question],
      answer: answer
    };
    
    kb.push(newEntry);
    
    // Save to file
    const kbPath = kbModule.defaultKBPath();
    fs.writeFileSync(kbPath, JSON.stringify(kb, null, 2));
    
    res.json({ success: true, entry: newEntry });
  } catch (error: any) {
    console.error('[KB] Add error:', error.message);
    res.status(500).json({ error: 'Failed to add KB entry' });
  }
});

app.delete('/api/kb/:id', (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const token = authHeader.substring(7);
    if (!adminTokens.has(token) && token !== process.env.ADMIN_TOKEN) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const { id } = req.params;
    const initialLength = kb.length;
    kb = kb.filter((entry, index) => (entry.id || String(index)) !== id);
    
    if (kb.length < initialLength) {
      // Save to file
      const kbPath = kbModule.defaultKBPath();
      fs.writeFileSync(kbPath, JSON.stringify(kb, null, 2));
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Entry not found' });
    }
  } catch (error: any) {
    console.error('[KB] Delete error:', error.message);
    res.status(500).json({ error: 'Failed to delete KB entry' });
  }
});

// Balance upload endpoint
app.post('/api/admin/upload-balances', upload.single('balances'), async (req: Request, res: Response) => {
  console.log('[Admin] Balance upload endpoint hit');
  try {
    // Check authentication
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('[Admin] Balance upload rejected - no token');
      return res.status(401).json({ error: 'Unauthorized - No token provided' });
    }
    
    const token = authHeader.substring(7);
    if (!adminTokens.has(token)) {
      console.log('[Admin] Balance upload rejected - invalid token');
      return res.status(401).json({ error: 'Unauthorized - Invalid token' });
    }
    
    // Check file upload
    if (!req.file) {
      console.log('[Admin] Balance upload rejected - no file');
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const fileSize = req.file.size;
    console.log('[Admin] Processing balance upload, file size:', fileSize, 'bytes');
    
    try {
      // Parse CSV first (quick operation)
      console.log('[Admin] Starting CSV parse...');
      const updates = await balanceUpdater.parseCSV(req.file.buffer);
      console.log('[Admin] Parsed', updates.length, 'records from CSV');
      
      // For large files (>5000 records or >1MB), process in background to avoid Render timeout
      if (updates.length > 5000 || fileSize > 1000000) {
        console.log('[Admin] Large file detected (' + updates.length + ' records, ' + Math.round(fileSize/1024) + 'KB), processing in background to avoid timeout');
        
        // Send immediate response
        res.json({
          success: true,
          processing: true,
          totalRecords: updates.length,
          message: `✅ Upload received! Processing ${updates.length} records in background. This will take approximately ${Math.ceil(updates.length / 200)} minutes. The balances will be updated automatically - no need to wait or refresh.`,
          summary: `Background processing started for ${updates.length} records`,
          estimatedTime: Math.ceil(updates.length / 200) + ' minutes'
        });
        
        // Process in background (don't await)
        (async () => {
          try {
            console.log('[Admin] Background processing started for', updates.length, 'records');
            const startTime = Date.now();
            const result = await balanceUpdater.updateBalances(updates);
            const duration = Math.round((Date.now() - startTime) / 1000);
            console.log('[Admin] ✅ Background update complete in', duration, 'seconds:', result.successCount, 'successful,', result.errorCount, 'errors');
            if (result.errorCount > 0) {
              console.error('[Admin] ⚠️ Errors during background processing (first 10):', result.errors.slice(0, 10));
            }
            // Get final stats
            const stats = await balanceUpdater.getUpdateStats();
            console.log('[Admin] 📊 Final stats: Total accounts:', stats.totalAccounts, 'Last update:', stats.lastUpdate);
          } catch (error: any) {
            console.error('[Admin] ❌ Background update failed:', error.message);
            console.error('[Admin] Stack trace:', error.stack);
          }
        })();
        
        return;
      }
      
      // For smaller files, process synchronously
      console.log('[Admin] Processing file synchronously...');
      const result = await balanceUpdater.updateBalances(updates);
      console.log('[Admin] Update complete:', result.successCount, 'successful,', result.errorCount, 'errors');
      
      // Get statistics
      console.log('[Admin] Fetching statistics...');
      const stats = await balanceUpdater.getUpdateStats();
      console.log('[Admin] Statistics retrieved');
      
      res.json({
        success: result.success,
        totalRecords: result.totalRecords,
        successCount: result.successCount,
        errorCount: result.errorCount,
        errors: result.errors,
        stats: stats,
        summary: result.summary,
        customersCreated: result.customersCreated || 0
      });
    } catch (parseError: any) {
      console.error('[Admin] Balance upload processing error:', parseError.message);
      console.error('[Admin] Stack trace:', parseError.stack);
      return res.status(500).json({ 
        error: 'Failed to process balance upload: ' + parseError.message,
        details: parseError.stack 
      });
    }
  } catch (error: any) {
    console.error('[Admin] Balance upload error:', error.message);
    console.error('[Admin] Stack trace:', error.stack);
    
    // Handle multer errors specifically
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'File too large. Maximum size is 50MB.' });
    }
    
    res.status(500).json({ error: 'Upload failed: ' + error.message });
  }
});

// Customer & Balance import endpoint (combined)
app.post('/api/admin/import-customers', upload.single('customers'), async (req: Request, res: Response) => {
  console.log('[Admin] Customer import endpoint hit');
  try {
    // Check authentication
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('[Admin] Import rejected - no token');
      return res.status(401).json({ error: 'Unauthorized - No token provided' });
    }
    
    const token = authHeader.substring(7);
    if (!adminTokens.has(token)) {
      console.log('[Admin] Import rejected - invalid token');
      return res.status(401).json({ error: 'Unauthorized - Invalid token' });
    }
    
    // Check file upload
    if (!req.file) {
      console.log('[Admin] Import rejected - no file');
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    console.log('[Admin] Processing customer import, file size:', req.file.size, 'bytes');
    
    // Import customers and balances
    const result = await customerImporter.importCustomersWithBalances(req.file.buffer);
    console.log('[Admin] Import complete:', result.successCount, 'successful,', result.errorCount, 'errors');
    
    // Get statistics
    const stats = await balanceUpdater.getUpdateStats();
    
    res.json({
      success: result.success,
      totalRecords: result.totalRecords,
      successCount: result.successCount,
      errorCount: result.errorCount,
      errors: result.errors,
      stats: stats,
      summary: result.summary
    });
  } catch (error: any) {
    console.error('[Admin] Import error:', error.message);
    console.error('[Admin] Import error stack:', error.stack);
    console.error('[Admin] Full error:', error);
    
    // Handle multer errors specifically
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'File too large. Maximum size is 50MB.' });
    }
    
    res.status(500).json({ 
      error: 'Import failed: ' + (error.message || 'Unknown error'),
      details: error.stack,
      type: error.constructor?.name
    });
  }
});

// Admin stats endpoint
app.get('/api/admin/stats', async (req: Request, res: Response) => {
  try {
    // Check authentication
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const token = authHeader.substring(7);
    if (!isValidAdminToken(token)) {
      return res.status(401).json({ error: 'Unauthorized - Invalid token' });
    }

    // Get statistics
    const stats = await balanceUpdater.getUpdateStats();
    res.json(stats);
  } catch (error: any) {
    console.error('[Admin] Stats error:', error.message);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// Customer demographics endpoint
app.get('/api/admin/demographics', async (req: Request, res: Response) => {
  try {
    // Branch code to name mapping
    const branchMapping: { [key: string]: string } = {
      'GH1510010': 'Head Office',
      'GH1510011': 'Ejura',
      'GH1510012': 'Kwame Danso',
      'GH1510013': 'Atebubu',
      'GH1510014': 'Yeji',
      'GH1510015': 'Amantin',
      'GH1510016': 'Ahwiaa',
      'GH1510017': 'Kajeji',
      'GH1510018': 'Kejetia'
    };
    // Check authentication
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const token = authHeader.substring(7);
    if (!isValidAdminToken(token)) {
      return res.status(401).json({ error: 'Unauthorized - Invalid token' });
    }

    // Get total customers
    const totalCustomers = await querySingle<any>(
      'SELECT COUNT(*) as count FROM customers'
    );

    // Get customers by status
    const byStatus = await executeQuery<any>(
      'SELECT status, COUNT(*) as count FROM customers GROUP BY status ORDER BY count DESC'
    );

    // Get customers by account type
    const byAccountType = await executeQuery<any>(
      'SELECT account_type, COUNT(*) as count FROM customers GROUP BY account_type ORDER BY count DESC'
    );

    // Get customers by branch
    const byBranch = await executeQuery<any>(
      'SELECT branch_code, COUNT(*) as count FROM customers GROUP BY branch_code ORDER BY count DESC LIMIT 20'
    );

    // Enhance branch data with names
    const byBranchWithNames = byBranch.map((branch: any) => ({
      branch_code: branch.branch_code,
      branch_name: branchMapping[branch.branch_code] || 'Unknown',
      count: branch.count
    }));

    // Get contact info stats
    const contactStats = await querySingle<any>(
      `SELECT 
        COUNT(*) as total,
        COUNT(phone_number) as with_phone,
        COUNT(email) as with_email,
        COUNT(CASE WHEN phone_number IS NOT NULL AND email IS NOT NULL THEN 1 END) as with_both,
        COUNT(CASE WHEN phone_number IS NULL AND email IS NULL THEN 1 END) as with_neither
      FROM customers`
    );

    // Get account balance statistics
    const balanceStats = await querySingle<any>(
      `SELECT 
        COUNT(*) as total_accounts,
        COUNT(CASE WHEN ledger_balance > 0 THEN 1 END) as positive_balance,
        COUNT(CASE WHEN ledger_balance = 0 THEN 1 END) as zero_balance,
        COUNT(CASE WHEN ledger_balance < 0 THEN 1 END) as negative_balance,
        COALESCE(SUM(ledger_balance), 0) as total_balance,
        COALESCE(AVG(ledger_balance), 0) as average_balance,
        COALESCE(MAX(ledger_balance), 0) as max_balance,
        COALESCE(MIN(ledger_balance), 0) as min_balance
      FROM account_balances`
    );

    // Get recent account creation stats (last 30 days, 60 days, 90 days)
    const createdDateField = DB_TYPE === 'postgres' 
      ? `created_at >= CURRENT_DATE - INTERVAL '30 days'`
      : `created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)`;
    
    const recentStats = await querySingle<any>(
      DB_TYPE === 'postgres'
        ? `SELECT 
            COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as last_30_days,
            COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '60 days' THEN 1 END) as last_60_days,
            COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '90 days' THEN 1 END) as last_90_days
          FROM customers`
        : `SELECT 
            COUNT(CASE WHEN created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) THEN 1 END) as last_30_days,
            COUNT(CASE WHEN created_at >= DATE_SUB(CURDATE(), INTERVAL 60 DAY) THEN 1 END) as last_60_days,
            COUNT(CASE WHEN created_at >= DATE_SUB(CURDATE(), INTERVAL 90 DAY) THEN 1 END) as last_90_days
          FROM customers`
    );

    // Get demographic field coverage stats
    const demographicCoverage = await querySingle<any>(
      `SELECT 
        COUNT(*) as total,
        COUNT(gender) as with_gender,
        COUNT(id_type) as with_id_type,
        COUNT(id_number) as with_id_number,
        COUNT(date_of_birth) as with_dob,
        COUNT(home_address) as with_home_address,
        COUNT(postal_address) as with_postal_address,
        COUNT(first_name) as with_first_name,
        COUNT(middle_name) as with_middle_name,
        COUNT(surname) as with_surname,
        COUNT(customer_type) as with_customer_type
      FROM customers`
    );

    // Get customers by gender
    const byGender = await executeQuery<any>(
      'SELECT gender, COUNT(*) as count FROM customers WHERE gender IS NOT NULL AND gender != \'\' GROUP BY gender ORDER BY count DESC'
    );

    // Get customers by customer type
    const byCustomerType = await executeQuery<any>(
      'SELECT customer_type, COUNT(*) as count FROM customers WHERE customer_type IS NOT NULL AND customer_type != \'\' GROUP BY customer_type ORDER BY count DESC'
    );

    // Calculate age groups from date of birth
    const ageGroups = await executeQuery<any>(
      DB_TYPE === 'postgres'
        ? `SELECT 
            CASE 
              WHEN EXTRACT(YEAR FROM AGE(date_of_birth)) < 18 THEN 'Under 18'
              WHEN EXTRACT(YEAR FROM AGE(date_of_birth)) BETWEEN 18 AND 25 THEN '18-25'
              WHEN EXTRACT(YEAR FROM AGE(date_of_birth)) BETWEEN 26 AND 35 THEN '26-35'
              WHEN EXTRACT(YEAR FROM AGE(date_of_birth)) BETWEEN 36 AND 45 THEN '36-45'
              WHEN EXTRACT(YEAR FROM AGE(date_of_birth)) BETWEEN 46 AND 55 THEN '46-55'
              WHEN EXTRACT(YEAR FROM AGE(date_of_birth)) BETWEEN 56 AND 65 THEN '56-65'
              WHEN EXTRACT(YEAR FROM AGE(date_of_birth)) > 65 THEN 'Over 65'
              ELSE 'Unknown'
            END as age_group,
            COUNT(*) as count
          FROM customers 
          WHERE date_of_birth IS NOT NULL
          GROUP BY age_group
          ORDER BY age_group`
        : `SELECT 
            CASE 
              WHEN TIMESTAMPDIFF(YEAR, date_of_birth, CURDATE()) < 18 THEN 'Under 18'
              WHEN TIMESTAMPDIFF(YEAR, date_of_birth, CURDATE()) BETWEEN 18 AND 25 THEN '18-25'
              WHEN TIMESTAMPDIFF(YEAR, date_of_birth, CURDATE()) BETWEEN 26 AND 35 THEN '26-35'
              WHEN TIMESTAMPDIFF(YEAR, date_of_birth, CURDATE()) BETWEEN 36 AND 45 THEN '36-45'
              WHEN TIMESTAMPDIFF(YEAR, date_of_birth, CURDATE()) BETWEEN 46 AND 55 THEN '46-55'
              WHEN TIMESTAMPDIFF(YEAR, date_of_birth, CURDATE()) BETWEEN 56 AND 65 THEN '56-65'
              WHEN TIMESTAMPDIFF(YEAR, date_of_birth, CURDATE()) > 65 THEN 'Over 65'
              ELSE 'Unknown'
            END as age_group,
            COUNT(*) as count
          FROM customers 
          WHERE date_of_birth IS NOT NULL
          GROUP BY age_group
          ORDER BY age_group`
    );

    res.json({
      totalCustomers: totalCustomers.count,
      byStatus,
      byAccountType,
      byBranch: byBranchWithNames,
      contactInfo: {
        total: contactStats.total,
        withPhone: contactStats.with_phone,
        withEmail: contactStats.with_email,
        withBoth: contactStats.with_both,
        withNeither: contactStats.with_neither,
        phonePercentage: ((contactStats.with_phone / contactStats.total) * 100).toFixed(1),
        emailPercentage: ((contactStats.with_email / contactStats.total) * 100).toFixed(1)
      },
      balances: {
        totalAccounts: balanceStats.total_accounts,
        positiveBalance: balanceStats.positive_balance,
        zeroBalance: balanceStats.zero_balance,
        negativeBalance: balanceStats.negative_balance,
        totalBalance: parseFloat(balanceStats.total_balance),
        averageBalance: parseFloat(balanceStats.average_balance),
        maxBalance: parseFloat(balanceStats.max_balance),
        minBalance: parseFloat(balanceStats.min_balance)
      },
      recentActivity: {
        last30Days: recentStats.last_30_days,
        last60Days: recentStats.last_60_days,
        last90Days: recentStats.last_90_days
      },
      demographicCoverage: {
        total: demographicCoverage.total,
        withGender: demographicCoverage.with_gender,
        withIdType: demographicCoverage.with_id_type,
        withIdNumber: demographicCoverage.with_id_number,
        withDob: demographicCoverage.with_dob,
        withHomeAddress: demographicCoverage.with_home_address,
        withPostalAddress: demographicCoverage.with_postal_address,
        withFirstName: demographicCoverage.with_first_name,
        withMiddleName: demographicCoverage.with_middle_name,
        withSurname: demographicCoverage.with_surname,
        withCustomerType: demographicCoverage.with_customer_type,
        genderPercentage: ((demographicCoverage.with_gender / demographicCoverage.total) * 100).toFixed(1),
        idPercentage: ((demographicCoverage.with_id_number / demographicCoverage.total) * 100).toFixed(1),
        dobPercentage: ((demographicCoverage.with_dob / demographicCoverage.total) * 100).toFixed(1),
        addressPercentage: ((demographicCoverage.with_home_address / demographicCoverage.total) * 100).toFixed(1),
        namePercentage: ((demographicCoverage.with_first_name / demographicCoverage.total) * 100).toFixed(1)
      },
      byGender,
      byCustomerType,
      ageGroups
    });
  } catch (error: any) {
    console.error('[Admin] Demographics error:', error.message);
    console.error('[Admin] Demographics error stack:', error.stack);
    res.status(500).json({ error: 'Failed to get demographics' });
  }
});

// ============================================================
// ADMIN ROUTES - Loan Upload System
// ============================================================

// Upload loans endpoint
app.post('/api/admin/upload-loans', upload.single('loans'), async (req: Request, res: Response) => {
  try {
    // Check authentication
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const token = authHeader.substring(7);
    if (!isValidAdminToken(token)) {
      return res.status(401).json({ error: 'Unauthorized - Invalid token' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log('[Admin] Loan upload started:', req.file.originalname);

    // Parse CSV
    const loans = await loanManager.parseLoanCSV(req.file.buffer);
    console.log(`[Admin] Parsed ${loans.length} loan records`);

    // Import loans
    const result = await loanManager.importLoans(loans);
    console.log(`[Admin] Import result: ${result.successCount} success, ${result.errorCount} errors`);

    // Get statistics
    const stats = await loanManager.getLoanStats();

    res.json({
      success: true,
      totalRecords: result.totalRecords,
      successCount: result.successCount,
      errorCount: result.errorCount,
      errors: result.errors.slice(0, 100), // Limit error list
      stats
    });
  } catch (error: any) {
    console.error('[Admin] Loan upload error:', error.message);
    res.status(500).json({ 
      error: 'Failed to upload loans',
      details: error.message 
    });
  }
});

// Run database migration
app.post('/api/admin/run-migration', async (req: Request, res: Response) => {
  try {
    // Check authentication
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const token = authHeader.substring(7);
    if (!isValidAdminToken(token)) {
      return res.status(401).json({ error: 'Unauthorized - Invalid token' });
    }

    console.log('[Admin] Running database migration...');
    
    const result = await migration.runMigration001();
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error: any) {
    console.error('[Admin] Migration error:', error.message);
    res.status(500).json({ 
      success: false,
      error: 'Migration failed',
      details: error.message 
    });
  }
});

// Alias for migration 001
app.post('/api/admin/run-migration-001', async (req: Request, res: Response) => {
  try {
    // Check authentication
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const token = authHeader.substring(7);
    if (!isValidAdminToken(token)) {
      return res.status(401).json({ error: 'Unauthorized - Invalid token' });
    }

    console.log('[Admin] Running database migration 001...');
    
    const result = await migration.runMigration001();
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error: any) {
    console.error('[Admin] Migration error:', error.message);
    res.status(500).json({ 
      success: false,
      error: 'Migration failed',
      details: error.message 
    });
  }
});

// Migration 002: Analytics Phase 2 Tables
app.post('/api/admin/run-migration-002', async (req: Request, res: Response) => {
  try {
    // Check authentication
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const token = authHeader.substring(7);
    if (!isValidAdminToken(token)) {
      return res.status(401).json({ error: 'Unauthorized - Invalid token' });
    }

    console.log('[Admin] Running database migration 002 (Analytics Phase 2)...');
    
    const result = await migration.runMigration002();
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error: any) {
    console.error('[Admin] Migration 002 error:', error.message);
    res.status(500).json({ 
      success: false,
      error: 'Migration 002 failed',
      details: error.message 
    });
  }
});

// Get loan statistics
app.get('/api/admin/loan-stats', async (req: Request, res: Response) => {
  try {
    // Check authentication
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const token = authHeader.substring(7);
    if (!isValidAdminToken(token)) {
      return res.status(401).json({ error: 'Unauthorized - Invalid token' });
    }

    // Get statistics
    const stats = await loanManager.getLoanStats();
    res.json(stats);
  } catch (error: any) {
    console.error('[Admin] Loan stats error:', error.message);
    res.status(500).json({ error: 'Failed to get loan stats' });
  }
});

// Web crawler endpoints
let activeCrawl: { status: string; progress?: number; result?: CrawlResult } = { status: 'idle' };

// Start web crawl
app.post('/api/admin/crawler/start', async (req: Request, res: Response) => {
  try {
    // Check authentication
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const token = authHeader.substring(7);
    if (!isValidAdminToken(token)) {
      return res.status(401).json({ error: 'Unauthorized - Invalid token' });
    }

    if (activeCrawl.status === 'running') {
      return res.status(400).json({ error: 'Crawl already in progress' });
    }

    const config: CrawlConfig = req.body.config || {
      startUrls: req.body.urls || [],
      maxDepth: req.body.maxDepth || 2,
      maxPages: req.body.maxPages || 50,
      useJavaScript: req.body.useJavaScript || false,
      excludePatterns: (req.body.excludePatterns || []).map((p: string) => new RegExp(p))
    };

    if (!config.startUrls || config.startUrls.length === 0) {
      return res.status(400).json({ error: 'No URLs provided' });
    }

    // Start crawl in background
    activeCrawl = { status: 'running', progress: 0 };
    
    // Run crawl asynchronously
    (async () => {
      try {
        const crawler = new WebCrawler(config);
        const result = await crawler.crawl();
        
        // Convert to KB entries
        const kbEntries = convertToKBEntries(result.pages);
        
        // Update KB if configured
        if (req.body.autoUpdateKB !== false) {
          await updateKnowledgeBase(kbEntries);
          loadKB(); // Reload KB
        }
        
        // Save crawl results
        const outputPath = path.join(process.cwd(), 'data', `crawl_${Date.now()}.json`);
        await crawler.saveCrawlResults(result, outputPath);
        
        activeCrawl = { 
          status: 'completed', 
          result: result 
        };
        
        console.log(`[Crawler] Completed: ${result.totalPages} pages, KB updated with ${kbEntries.length} entries`);
      } catch (error: any) {
        console.error('[Crawler] Error:', error.message);
        activeCrawl = { status: 'error' };
      }
    })();

    res.json({ 
      message: 'Crawl started',
      config: {
        urls: config.startUrls,
        maxDepth: config.maxDepth,
        maxPages: config.maxPages
      }
    });
  } catch (error: any) {
    console.error('[Crawler] Start error:', error.message);
    res.status(500).json({ error: 'Failed to start crawl' });
  }
});

// Get crawl status
app.get('/api/admin/crawler/status', (req: Request, res: Response) => {
  try {
    // Check authentication
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const token = authHeader.substring(7);
    if (!adminTokens.has(token)) {
      return res.status(401).json({ error: 'Unauthorized - Invalid token' });
    }

    res.json(activeCrawl);
  } catch (error: any) {
    console.error('[Crawler] Status error:', error.message);
    res.status(500).json({ error: 'Failed to get status' });
  }
});

// Get crawler configuration
app.get('/api/admin/crawler/config', (req: Request, res: Response) => {
  try {
    // Check authentication
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const token = authHeader.substring(7);
    if (!adminTokens.has(token)) {
      return res.status(401).json({ error: 'Unauthorized - Invalid token' });
    }

    // Read crawler config
    const configPath = path.join(process.cwd(), 'config', 'crawler.json');
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      res.json(config);
    } else {
      res.json({ 
        enabled: false,
        crawlConfigs: [],
        message: 'No configuration file found'
      });
    }
  } catch (error: any) {
    console.error('[Crawler] Config error:', error.message);
    res.status(500).json({ error: 'Failed to get config' });
  }
});

// Update crawler configuration
app.post('/api/admin/crawler/config', (req: Request, res: Response) => {
  try {
    // Check authentication
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const token = authHeader.substring(7);
    if (!adminTokens.has(token)) {
      return res.status(401).json({ error: 'Unauthorized - Invalid token' });
    }

    // Save crawler config
    const configPath = path.join(process.cwd(), 'config', 'crawler.json');
    fs.writeFileSync(configPath, JSON.stringify(req.body, null, 2), 'utf-8');
    
    res.json({ success: true, message: 'Configuration saved' });
  } catch (error: any) {
    console.error('[Crawler] Config save error:', error.message);
    res.status(500).json({ error: 'Failed to save config' });
  }
});

// ===== Phase 3: Machine Learning Endpoints =====

/**
 * Get sentiment trends for admin dashboard
 */
app.get('/api/admin/ml/sentiment-trends', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1];
  
  if (!token || (!adminTokens.has(token) && token !== process.env.ADMIN_TOKEN)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Get overall sentiment distribution
    const sentimentQuery = DB_TYPE === 'postgres'
      ? `SELECT 
          sentiment,
          COUNT(*) as count,
          AVG(score) as avg_score,
          COUNT(CASE WHEN needs_escalation = TRUE THEN 1 END) as escalations
        FROM sentiment_analysis
        WHERE timestamp >= NOW() - INTERVAL '30 days'
        GROUP BY sentiment
        ORDER BY count DESC`
      : `SELECT 
          sentiment,
          COUNT(*) as count,
          AVG(score) as avg_score,
          COUNT(CASE WHEN needs_escalation = 1 THEN 1 END) as escalations
        FROM sentiment_analysis
        WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        GROUP BY sentiment
        ORDER BY count DESC`;
    
    const distribution = await executeQuery(sentimentQuery, []);
    
    // Get daily sentiment trends (last 7 days)
    const trendsQuery = DB_TYPE === 'postgres'
      ? `SELECT 
           DATE(timestamp) as date,
           AVG(score) as avg_score,
           COUNT(*) as count
         FROM sentiment_analysis
         WHERE timestamp >= NOW() - INTERVAL '7 days'
         GROUP BY DATE(timestamp)
         ORDER BY date`
      : `SELECT 
           DATE(timestamp) as date,
           AVG(score) as avg_score,
           COUNT(*) as count
         FROM sentiment_analysis
         WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 7 DAY)
         GROUP BY DATE(timestamp)
         ORDER BY date`;
    
    const trends = await executeQuery(trendsQuery, []);
    
    res.json({ distribution, trends });
  } catch (error: any) {
    console.error('[ML] Sentiment trends error:', error);
    res.status(500).json({ error: 'Failed to fetch sentiment trends' });
  }
});

/**
 * Get intent distribution analytics
 */
app.get('/api/admin/ml/intent-distribution', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1];
  
  if (!token || (!adminTokens.has(token) && token !== process.env.ADMIN_TOKEN)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const distribution = await analytics.getIntentDistribution();
    res.json({ distribution });
  } catch (error: any) {
    console.error('[ML] Intent distribution error:', error);
    res.status(500).json({ error: 'Failed to fetch intent distribution' });
  }
});

/**
 * Get escalation queue
 */
app.get('/api/admin/ml/escalations', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1];
  
  if (!token || (!adminTokens.has(token) && token !== process.env.ADMIN_TOKEN)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const escalations = await analytics.getEscalationQueue();
    console.log('[ML] Escalation queue results:', escalations.length, 'records');
    if (escalations.length > 0) {
      console.log('[ML] Sample escalation:', escalations[0]);
    }
    res.json({ escalations, count: escalations.length });
  } catch (error: any) {
    console.error('[ML] Escalations error:', error);
    res.status(500).json({ error: 'Failed to fetch escalations' });
  }
});

/**
 * Get conversation category insights
 */
app.get('/api/admin/ml/categories', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1];
  
  if (!token || (!adminTokens.has(token) && token !== process.env.ADMIN_TOKEN)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const insights = await analytics.getCategoryInsights();
    res.json({ categories: insights });
  } catch (error: any) {
    console.error('[ML] Categories error:', error);
    res.status(500).json({ error: 'Failed to fetch category insights' });
  }
});

/**
 * Get high churn risk users
 */
app.get('/api/admin/ml/churn-risk', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1];
  
  if (!token || (!adminTokens.has(token) && token !== process.env.ADMIN_TOKEN)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const highRiskUsers = await analytics.getHighChurnRiskUsers();
    res.json({ highRiskUsers, count: highRiskUsers.length });
  } catch (error: any) {
    console.error('[ML] Churn risk error:', error);
    res.status(500).json({ error: 'Failed to fetch churn predictions' });
  }
});

/**
 * Churn stats (low/medium/high) for admin dashboard validation
 */
app.get('/api/admin/ml/churn-stats', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1];

  if (!token || (!adminTokens.has(token) && token !== process.env.ADMIN_TOKEN)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const distributionQuery = `
      SELECT churn_risk, COUNT(*) as count, AVG(risk_score) as avg_risk
      FROM churn_predictions
      GROUP BY churn_risk
      ORDER BY count DESC
    `;
    const distribution = await executeQuery(distributionQuery, []);

    const totalsQuery = 'SELECT COUNT(*) as total, MAX(last_prediction) as last_prediction FROM churn_predictions';
    const totals = await executeQuery<{ total: string | number; last_prediction: any }>(totalsQuery, []);

    res.json({
      distribution,
      totalPredictions: Number(totals[0]?.total || 0),
      lastPrediction: totals[0]?.last_prediction || null
    });
  } catch (error: any) {
    console.error('[ML] Churn stats error:', error);
    res.status(500).json({ error: 'Failed to fetch churn stats' });
  }
});

/**
 * Reset AI/ML analytics counters (Admin only)
 */
app.post('/api/admin/ml/reset-counters', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1];

  if (!token || (!adminTokens.has(token) && token !== process.env.ADMIN_TOKEN)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Count records before deletion
    const intentCount = await executeQuery('SELECT COUNT(*) as count FROM intent_classification', []);
    const sentimentCount = await executeQuery('SELECT COUNT(*) as count FROM sentiment_analysis', []);
    const categoryCount = await executeQuery('SELECT COUNT(*) as count FROM conversation_categories', []);
    const churnCount = await executeQuery('SELECT COUNT(*) as count FROM churn_predictions', []);

    // Delete all ML analytics data
    await executeQuery('DELETE FROM intent_classification', []);
    await executeQuery('DELETE FROM sentiment_analysis', []);
    await executeQuery('DELETE FROM conversation_categories', []);
    await executeQuery('DELETE FROM churn_predictions', []);

    console.log('[ML] Reset counters - All AI/ML analytics data deleted');

    res.json({
      success: true,
      message: 'AI/ML analytics counters reset successfully',
      deleted: {
        intents: Number((intentCount[0] as any)?.count || 0),
        sentiments: Number((sentimentCount[0] as any)?.count || 0),
        categories: Number((categoryCount[0] as any)?.count || 0),
        churnPredictions: Number((churnCount[0] as any)?.count || 0)
      }
    });
  } catch (error: any) {
    console.error('[ML] Reset counters error:', error);
    res.status(500).json({ error: 'Failed to reset ML counters' });
  }
});

/**
 * Get engagement score for a user
 */
app.post('/api/ml/engagement-score', async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'userId required' });
    }

    const score = await analytics.calculateEngagementScore(userId);
    
    if (!score) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ engagementScore: score });
  } catch (error: any) {
    console.error('[ML] Engagement score error:', error);
    res.status(500).json({ error: 'Failed to calculate engagement score' });
  }
});

/**
 * Trigger churn prediction for a user
 */
app.post('/api/ml/predict-churn', async (req: Request, res: Response) => {
  try {
    const { userId, ipAddress } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'userId required' });
    }

    // If caller provides ipAddress, ensure a profile exists for that IP first.
    if (ipAddress) {
      await analytics.refreshUserProfileStatsFromIp(ipAddress).catch(() => undefined);
    }

    const prediction = await analytics.predictChurn(userId);
    
    if (!prediction) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ churnPrediction: prediction });
  } catch (error: any) {
    console.error('[ML] Churn prediction error:', error);
    res.status(500).json({ error: 'Failed to predict churn' });
  }
});

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  console.log('[Health] Request received');
  res.json({ 
    status: 'ok',
    port,
    kbEntries: kb.length
  });
});

// Global error handler for multer and other errors
app.use((err: any, req: Request, res: Response, next: any) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    console.error('[Upload] File too large:', err.message);
    return res.status(413).json({ error: 'File too large. Maximum size is 50MB.' });
  }
  
  if (err instanceof multer.MulterError) {
    console.error('[Upload] Multer error:', err.message);
    return res.status(400).json({ error: 'File upload error: ' + err.message });
  }
  
  console.error('[Server] Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Load KB on startup
console.log('[Startup] About to load KB...');
loadKB();

// Create HTTP server and attach Socket.IO
console.log(`[Startup] Creating HTTP server...`);
const httpServer = http.createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST']
  }
});

// Initialize Live Chat Manager
console.log(`[Startup] Initializing Live Chat Manager...`);
const pool = getPool();
const liveChatManager = new LiveChatManager(io, pool as any);
console.log(`[Startup] Live Chat Manager initialized`);

// Start server - bind to 0.0.0.0 for Render deployment
console.log(`[Startup] Starting server on port ${port}...`);
const server = process.env.RENDER 
  ? httpServer.listen(port, '0.0.0.0', () => {
      console.log(`[Startup] Server callback fired`);
      console.log(`✓ Server listening on http://0.0.0.0:${port}`);
      console.log(`✓ KB: ${kb.length} entries loaded`);
      console.log(`✓ OpenAI: ${process.env.OPENAI_API_KEY ? 'Configured' : 'Not configured'}`);
      console.log(`✓ Live Chat: Enabled`);
    })
  : httpServer.listen(port, () => {
      console.log(`[Startup] Server callback fired`);
      console.log(`✓ Server listening on http://localhost:${port}`);
      console.log(`✓ KB: ${kb.length} entries loaded`);
      console.log(`✓ OpenAI: ${process.env.OPENAI_API_KEY ? 'Configured' : 'Not configured'}`);
      console.log(`✓ Live Chat: Enabled`);
    });

server.on('error', (err: any) => {
  console.error('✗ Server error:', err.message);
  console.error('✗ Full error:', err);
  process.exit(1);
});

// Handle shutdown - DISABLED FOR TESTING
// process.on('SIGINT', () => {
//   console.log('\n✓ Shutting down...');
//   server.close(() => {
//     process.exit(0);
//   });
// });

process.on('unhandledRejection', (reason: any) => {
  console.error('✗ Unhandled rejection:', reason);
});

export default app;
