import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import crypto from 'crypto';
import * as customerAuth from './customerAuth';
import { testConnection } from './database';
import * as balanceUpdater from './balanceUpdater';
import * as customerImporter from './customerImporter';
import { WebCrawler, CrawlConfig, CrawlResult, convertToKBEntries, updateKnowledgeBase } from './webCrawler';

// Load environment variables
dotenv.config();

const app = express();
const port = Number(process.env.PORT || 4000);

// Test database connection on startup
(async () => {
  const dbConnected = await testConnection();
  if (dbConnected) {
    console.log('[Server] Database connection established');
  } else {
    console.warn('[Server] Database connection failed - authentication features will not work');
  }
})();

// Middleware
app.use(express.json());

// Configure multer for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Admin authentication
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const adminTokens = new Set<string>();

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

// KB Entry interface
interface KBEntry {
  id?: string;
  product?: string;
  patterns?: string[];
  answer?: string;
  response?: string; // fallback
  pattern?: string; // fallback
}

let kb: KBEntry[] = [];

// Load KB from file
function loadKB() {
  try {
    const kbPath = path.join(process.cwd(), 'data', 'kb.json');
    const data = fs.readFileSync(kbPath, 'utf-8');
    kb = JSON.parse(data);
    console.log(`[KB] Loaded ${kb.length} entries`);
  } catch (err) {
    console.error('[KB] Failed to load:', err);
    kb = [];
  }
}

// Retrieve KB matches
function retrieveKB(query: string | undefined): string[] {
  const matches: string[] = [];
  console.log(`[KB] retrieveKB called with: query="${query}", type=${typeof query}`);
  if (!query) {
    console.log('[KB] Query is undefined/falsy, returning empty');
    return [];
  }
  const lowerQuery = query.toLowerCase();
  
  for (const entry of kb) {
    // Handle both formats: patterns array and single pattern string
    let entryPatterns: string[] = [];
    
    if (Array.isArray(entry.patterns)) {
      entryPatterns = entry.patterns;
    } else if (typeof entry.pattern === 'string') {
      entryPatterns = [entry.pattern];
    }
    
    // Check if any pattern matches
    for (const pattern of entryPatterns) {
      const patternLower = pattern.toLowerCase();
      
      // Determine if pattern should be treated as regex
      let isMatch = false;
      
      // Check if pattern contains regex special characters
      const hasRegexChars = /[.*+?^${}()|[\]\\]/.test(patternLower);
      
      if (hasRegexChars) {
        // Treat as regex pattern
        try {
          const regex = new RegExp(patternLower, 'i');
          isMatch = regex.test(lowerQuery);
        } catch (e) {
          console.log(`[KB] Invalid regex pattern: ${patternLower}`);
          // Invalid regex, fall back to simple includes
          isMatch = lowerQuery.includes(patternLower.replace(/[.*+?^${}()|[\]\\]/g, ''));
        }
      } else {
        // Simple keyword matching - check if query contains the pattern as a word/phrase
        isMatch = lowerQuery.includes(patternLower);
      }
      
      if (isMatch) {
        console.log(`[KB] Matched pattern "${pattern}" for entry "${entry.id}"`);
        const response = entry.answer || entry.response || '';
        if (response) {
          matches.push(response);
        }
        break; // Found a match in this entry, move to next entry
      }
    }
  }
  
  console.log(`[KB] Found ${matches.length} matches`);
  return matches;
}

// Chat endpoint
app.post('/api/chat', async (req: Request, res: Response) => {
  try {
    // Handle both req.body and raw body parsing
    let message: string | undefined;
    let sessionId: string | undefined;
    
    if (typeof req.body === 'string') {
      try {
        const parsed = JSON.parse(req.body);
        message = parsed.message;
        sessionId = parsed.sessionId;
      } catch (e) {
        message = req.body;
      }
    } else if (req.body && typeof req.body === 'object') {
      message = (req.body as any).message;
      sessionId = (req.body as any).sessionId;
    }
    
    console.log('[Chat] Received message:', message);
    console.log('[Chat] Session ID:', sessionId);
    
    if (!message) {
      console.log('[Chat] No message provided, returning 400');
      return res.status(400).json({ error: 'Message required' });
    }

    // Check if customer needs authentication for account information
    const authDetails = customerAuth.extractAuthDetails(message);
    const hasAuthCredentials = !!(authDetails.accountNumber || authDetails.phoneNumber || authDetails.otp);
    
    if (customerAuth.needsAuthentication(message) || hasAuthCredentials) {
      console.log('[Chat] Authentication required for this query or credentials detected');
      
      // Get or create session
      const effectiveSessionId = sessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Check if already authenticated
      if (customerAuth.isSessionAuthenticated(effectiveSessionId)) {
        console.log('[Chat] Session authenticated, fetching account data');
        
        const session = customerAuth.getOrCreateSession(effectiveSessionId);
        const accountData = await customerAuth.getCustomerAccountData(session.accountNumber!);
        
        // Determine what info they want
        if (/balance/i.test(message)) {
          const response = customerAuth.formatBalanceResponse(accountData);
          return res.json({ 
            reply: response,
            source: 'authenticated',
            sessionId: effectiveSessionId
          });
        } else if (/(transaction|statement|history)/i.test(message)) {
          const response = customerAuth.formatTransactionsResponse(accountData);
          return res.json({ 
            reply: response,
            source: 'authenticated',
            sessionId: effectiveSessionId
          });
        }
      }
      
      // Not authenticated - attempt authentication with OTP flow
      const authResult = await customerAuth.authenticateCustomer(
        effectiveSessionId,
        authDetails.accountNumber,
        authDetails.phoneNumber,
        authDetails.otp
      );
      
      return res.json({ 
        reply: authResult.message,
        source: 'authentication',
        sessionId: effectiveSessionId,
        requiresAuth: !authResult.success,
        awaitingOTP: authResult.awaitingOTP || false
      });
    }
    
    // Check if user is sending OTP when session is awaiting verification
    const effectiveSessionId = sessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const session = customerAuth.getOrCreateSession(effectiveSessionId);
    
    if (session.awaitingOTP) {
      const authDetails = customerAuth.extractAuthDetails(message);
      
      if (authDetails.otp) {
        const authResult = await customerAuth.authenticateCustomer(
          effectiveSessionId,
          undefined,
          undefined,
          authDetails.otp
        );
        
        return res.json({ 
          reply: authResult.message,
          source: 'authentication',
          sessionId: effectiveSessionId,
          requiresAuth: !authResult.success,
          awaitingOTP: authResult.awaitingOTP || false
        });
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

    // If KB has matches, return those
    if (kbMatches.length > 0) {
      console.log('[Chat] Returning KB response');
      const response = kbMatches[0];
      return res.json({ 
        reply: response,
        source: 'kb',
        kbMatches: kbMatches.length
      });
    }

    // No KB match, try OpenAI with KB context
    console.log('[Chat] No KB match, trying OpenAI with KB context...');

    // Try OpenAI if configured
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.json({ 
        reply: 'I can help with banking questions. Please ask about our services, fees, or products.',
        source: 'default'
      });
    }

    // Build KB context summary for OpenAI
    const kbContext = kb.map(entry => {
      const patterns = Array.isArray(entry.patterns) ? entry.patterns.join(', ') : entry.pattern || '';
      return `Topic: ${entry.product}\nInfo: ${entry.answer || entry.response || ''}`;
    }).join('\n\n');

    // Call OpenAI with KB context
    try {
      const systemPrompt = `You are Ama, a friendly and helpful banking assistant for AKCB - Amantin and Kasei Community Bank PLC, a community bank in Ghana.

KNOWLEDGE BASE:
${kbContext}

IMPORTANT INSTRUCTIONS:
1. **Always search the Knowledge Base first** - Look for relevant information about staff, branches, products, services, loans, accounts, etc.
2. **Handle name queries intelligently**:
   - "Opoku" or "Daniel" → Daniel Opoku (Unit Head, Marketing)
   - "Eric" → Eric Nanjor Janja (Head of Operations)
   - "Debrah" or "Michael Debrah" → Michael Debrah Bempong (Head of Credit)
   - Search the KB for any name mentioned
3. **Product queries**: When asked about "products", "services", "savings", "loans", provide specific offerings from the KB
4. **Agent requests**: If someone asks to "talk to an agent" or "speak to a human", provide contact info (0202055171) and offer to help with their question
5. **Misspellings**: Handle typos intelligently (e.g., "prodicts" → "products")
6. **Be conversational and helpful**: Don't give generic responses - actively provide relevant information from the KB
7. **Be specific**: Use actual names, numbers, and details from the KB
8. If truly not in KB, say you don't have that specific info and suggest calling 0202055171

Respond naturally and helpfully using the knowledge base!`;

      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: message }
          ],
          max_tokens: 300,
          temperature: 0.3
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const reply = response.data.choices[0]?.message?.content || 'I could not generate a response.';
      console.log(`[Chat] OpenAI response: ${reply}`);
      
      return res.json({ 
        reply: reply,
        source: 'openai'
      });
    } catch (error: any) {
      console.error('[OpenAI] Error:', error.message);
      return res.json({ 
        reply: 'I encountered an issue processing your request. Please try again.',
        source: 'error'
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
  res.json({ sessionId });
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
      { name: 'Amantin (Head Office)', lat: 7.6667, lng: -1.4167, phone: '+233 20 205 5170', address: 'Amantin High Street' },
      { name: 'Atebubu', lat: 7.7558, lng: -0.9922, phone: '+233 20 205 5173', address: 'Atebubu' },
      { name: 'Kajaji', lat: 7.7367, lng: -1.4939, phone: '+233 24 052 6372', address: 'Kajaji East, Tatobatoi', plusCode: 'QQJG+P27' },
      { name: 'Kwame Danso', lat: 7.6303, lng: -1.4770, phone: '+233 20 205 5174', address: 'Kwame Danso', plusCode: 'P8JF+2C6' },
      { name: 'Yeji', lat: 7.8265, lng: -0.5043, phone: '+233 20 205 5175', address: 'Yeji', plusCode: '68GW+FHJ' },
      { name: 'Ahwiaa', lat: 6.8047, lng: -1.4987, phone: '+233 20 209 9931', address: 'Kumasi-Techiman Road, Ahwiaa', plusCode: 'QC32+V79' },
      { name: 'Ejura', lat: 7.3850, lng: -1.3622, phone: '+233 20 205 5172', address: 'Ejura' },
      { name: 'Kumasi (Kejetia market)', lat: 6.6928, lng: -1.6236, phone: '+233 24 869 8267', address: 'Kejetia market, Kumasi' }
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

    const mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${lat},${lng}&destination=${nearest.lat},${nearest.lng}`;

    const responseText = `📍 **Nearest Branch: ${nearest.name}**\n\n` +
      `📏 Distance: ~${distanceText}\n` +
      `📞 Phone: ${nearest.phone}\n` +
      `📌 Address: ${nearest.address}\n\n` +
      `[Get Directions on Google Maps](${mapsUrl})`;

    console.log('[NearestBranch] Found:', nearest.name, distanceText);

    res.json({ 
      success: true,
      text: responseText,
      branch: nearest,
      distance: minDistance,
      mapsUrl
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

// Balance upload endpoint
app.post('/api/admin/upload-balances', upload.single('balances'), async (req: Request, res: Response) => {
  try {
    // Check authentication
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized - No token provided' });
    }
    
    const token = authHeader.substring(7);
    if (!adminTokens.has(token)) {
      return res.status(401).json({ error: 'Unauthorized - Invalid token' });
    }
    
    // Check file upload
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    console.log('[Admin] Processing balance upload, file size:', req.file.size, 'bytes');
    
    // Parse CSV
    const updates = await balanceUpdater.parseCSV(req.file.buffer);
    console.log('[Admin] Parsed', updates.length, 'records from CSV');
    
    // Update balances
    const result = await balanceUpdater.updateBalances(updates);
    console.log('[Admin] Update complete:', result.successCount, 'successful,', result.errorCount, 'errors');
    
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
    console.error('[Admin] Upload error:', error.message);
    res.status(500).json({ error: 'Upload failed: ' + error.message });
  }
});

// Customer & Balance import endpoint (combined)
app.post('/api/admin/import-customers', upload.single('customers'), async (req: Request, res: Response) => {
  try {
    // Check authentication
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized - No token provided' });
    }
    
    const token = authHeader.substring(7);
    if (!adminTokens.has(token)) {
      return res.status(401).json({ error: 'Unauthorized - Invalid token' });
    }
    
    // Check file upload
    if (!req.file) {
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
    res.status(500).json({ error: 'Import failed: ' + error.message });
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
    if (!adminTokens.has(token)) {
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
    if (!adminTokens.has(token)) {
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

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  console.log('[Health] Request received');
  res.json({ 
    status: 'ok',
    port,
    kbEntries: kb.length
  });
});

// Load KB on startup
console.log('[Startup] About to load KB...');
loadKB();

// Start server - bind to 0.0.0.0 for Render deployment
console.log(`[Startup] Starting server on port ${port}...`);
const server = process.env.RENDER 
  ? app.listen(port, '0.0.0.0', () => {
      console.log(`[Startup] Server callback fired`);
      console.log(`✓ Server listening on http://0.0.0.0:${port}`);
      console.log(`✓ KB: ${kb.length} entries loaded`);
      console.log(`✓ OpenAI: ${process.env.OPENAI_API_KEY ? 'Configured' : 'Not configured'}`);
    })
  : app.listen(port, () => {
      console.log(`[Startup] Server callback fired`);
      console.log(`✓ Server listening on http://localhost:${port}`);
      console.log(`✓ KB: ${kb.length} entries loaded`);
      console.log(`✓ OpenAI: ${process.env.OPENAI_API_KEY ? 'Configured' : 'Not configured'}`);
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
