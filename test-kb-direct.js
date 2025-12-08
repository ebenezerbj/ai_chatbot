#!/usr/bin/env node

// Test the KB loading directly without needing HTTP
const fs = require('fs');
const path = require('path');

console.log('Testing KB Loading and Retrieval\n');
console.log('=================================\n');

try {
  // Read KB file
  const kbPath = path.join(__dirname, 'data', 'kb.json');
  const kbContent = fs.readFileSync(kbPath, 'utf-8');
  const kbData = JSON.parse(kbContent);
  
  console.log(`✓ KB File Found: ${kbPath}`);
  console.log(`✓ KB Entries Loaded: ${kbData.length}\n`);
  
  // Display KB entries
  console.log('Knowledge Base Entries:');
  console.log('----------------------\n');
  
  for (let i = 0; i < Math.min(10, kbData.length); i++) {
    const entry = kbData[i];
    console.log(`${i + 1}. [${entry.product}] - ${entry.id}`);
    console.log(`   Patterns: ${entry.patterns.slice(0, 2).join(', ')}`);
    console.log(`   Answer Preview: ${entry.answer.substring(0, 80)}...`);
    console.log('');
  }
  
  if (kbData.length > 10) {
    console.log(`... and ${kbData.length - 10} more entries\n`);
  }
  
  // Test pattern matching
  console.log('\nTesting Pattern Matching:');
  console.log('------------------------\n');
  
  const testQueries = [
    'What are the checking account fees?',
    'Tell me about the bank history',
    'Who is the board chairman?'
  ];
  
  for (const query of testQueries) {
    console.log(`Query: "${query}"`);
    
    let matches = 0;
    for (const entry of kbData) {
      for (const pattern of entry.patterns) {
        const regex = new RegExp(pattern, 'i');
        if (regex.test(query)) {
          console.log(`  ✓ Matched [${entry.product}]: ${entry.id}`);
          console.log(`    Answer: ${entry.answer.substring(0, 100)}...`);
          matches++;
          break;
        }
      }
    }
    
    if (matches === 0) {
      console.log(`  ✗ No matches found`);
    }
    console.log('');
  }
  
} catch (err) {
  console.error('ERROR:', err.message);
  process.exit(1);
}
