#!/usr/bin/env node

// Direct test of chat endpoint by loading the chat service
require('dotenv').config();

const { ChatService } = require('./dist/services/chatService');
const { OpenAIProvider } = require('./dist/providers/openaiProvider');

async function testChat() {
  console.log('Testing Chat Service Directly\n');
  console.log('=============================\n');
  
  try {
    const provider = new OpenAIProvider();
    const chatService = new ChatService(provider);
    
    const testQueries = [
      'hi',
      'hello',
      'What are the checking account fees?'
    ];
    
    for (const query of testQueries) {
      console.log(`\nTesting: "${query}"`);
      console.log('-'.repeat(50));
      
      try {
        const result = await chatService.sendMessage(query, 'test-session-' + Date.now());
        
        if (result && result.reply) {
          console.log(`✓ Response received:`);
          console.log(`  "${result.reply.substring(0, 200)}..."`);
          
          if (result.suggestHandover) {
            console.log(`  (Handover suggested)`);
          }
        } else {
          console.log(`✗ No reply in result:`, result);
        }
      } catch (err) {
        console.log(`✗ Chat error: ${err.message}`);
        console.error(err);
      }
    }
    
  } catch (err) {
    console.log(`✗ Error: ${err.message}`);
    console.error(err);
    process.exit(1);
  }
}

testChat();
