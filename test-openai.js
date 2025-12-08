#!/usr/bin/env node

// Load environment variables
require('dotenv').config();

const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');

console.log('Testing OpenAI Integration\n');
console.log('===========================\n');

// Check if API key is set
const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.log('❌ ERROR: OPENAI_API_KEY not found in environment');
  console.log(`  Checked in: ${path.join(process.cwd(), '.env')}`);
  process.exit(1);
}

console.log('✓ API Key found');
console.log(`  Key preview: ${apiKey.substring(0, 20)}...${apiKey.substring(apiKey.length - 10)}\n`);

// Test the OpenAI client
async function testOpenAI() {
  try {
    const client = new OpenAI({ apiKey });
    
    console.log('Testing OpenAI API call...\n');
    
    const testMessage = 'What are the checking account fees?';
    
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful bank customer service chatbot. Answer questions about banking products and services.'
        },
        {
          role: 'user',
          content: testMessage
        }
      ],
      max_tokens: 200
    });
    
    console.log('✓ OpenAI API Call Successful\n');
    console.log('Response Details:');
    console.log(`  Model: ${response.model}`);
    console.log(`  Tokens - Prompt: ${response.usage.prompt_tokens}, Completion: ${response.usage.completion_tokens}`);
    console.log(`  Status: ${response.choices[0].finish_reason}\n`);
    console.log('ChatBot Reply:');
    console.log(`  "${response.choices[0].message.content}"\n`);
    
  } catch (error) {
    console.log(`❌ OpenAI API Error: ${error.message}`);
    if (error.response) {
      console.log(`  Status: ${error.response.status}`);
      console.log(`  Data: ${JSON.stringify(error.response.data)}`);
    }
    process.exit(1);
  }
}

testOpenAI();
