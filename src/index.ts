import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

// Load environment variables
dotenv.config();

const app = express();
const port = Number(process.env.PORT || 4000);

// Middleware
app.use(express.json());

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
    
    if (typeof req.body === 'string') {
      try {
        const parsed = JSON.parse(req.body);
        message = parsed.message;
      } catch (e) {
        message = req.body;
      }
    } else if (req.body && typeof req.body === 'object') {
      message = (req.body as any).message;
    }
    
    console.log('[Chat] Received message:', message);
    
    if (!message) {
      console.log('[Chat] No message provided, returning 400');
      return res.status(400).json({ error: 'Message required' });
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
