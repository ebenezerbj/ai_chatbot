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

// Knowledge Base interface
interface KBEntry {
  pattern: string;
  response: string;
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
function retrieveKB(query: string): string[] {
  const matches: string[] = [];
  const lowerQuery = query.toLowerCase();
  
  for (const entry of kb) {
    const patternLower = entry.pattern.toLowerCase();
    if (lowerQuery.includes(patternLower) || patternLower.includes(lowerQuery)) {
      matches.push(entry.response);
    }
  }
  
  return matches;
}

// Chat endpoint
app.post('/api/chat', async (req: Request, res: Response) => {
  try {
    const { message } = req.body;
    
    console.log(`[Chat] Request received for message: "${message}"`);
    
    if (!message) {
      return res.status(400).json({ error: 'Message required' });
    }
    
    // Get KB context
    const kbMatches = retrieveKB(message);
    console.log(`[Chat] KB matches: ${kbMatches.length}`);

    // If KB has matches, use those
    if (kbMatches.length > 0) {
      const response = kbMatches[0];
      return res.json({ 
        response,
        source: 'kb',
        kbMatches: kbMatches.length
      });
    }

    // Try OpenAI if configured
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.json({ 
        response: 'I can help with banking questions. Please ask about our services, fees, or products.',
        source: 'default'
      });
    }

    // Call OpenAI
    try {
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'You are a helpful banking assistant for AK Commerzbank.' },
            { role: 'user', content: message }
          ],
          max_tokens: 150,
          temperature: 0.7
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
        response: reply,
        source: 'openai'
      });
    } catch (error: any) {
      console.error('[OpenAI] Error:', error.message);
      return res.json({ 
        response: 'I encountered an issue processing your request. Please try again.',
        source: 'error'
      });
    }
  } catch (err: any) {
    console.error('[Chat] Error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
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
loadKB();

// Start server
const server = app.listen(port, '0.0.0.0', () => {
  console.log(`✓ Server listening on http://localhost:${port}`);
  console.log(`✓ KB: ${kb.length} entries loaded`);
  console.log(`✓ OpenAI: ${process.env.OPENAI_API_KEY ? 'Configured' : 'Not configured'}`);
}).on('error', (err: any) => {
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
