// Debug script to test knowledge base retrieval
import { retrieveKB } from './src/knowledge/kb.js';

const query = 'TELL ME ABOUT SAVINGS';
console.log('Testing query:', query);
const results = retrieveKB(query);
console.log('KB Results:', JSON.stringify(results, null, 2));

// Test individual patterns
const patterns = [
  /savings.*(interest|apy|rate)/i,
  /savings.*rate/i,
  /(interest|apy).*savings/i,
  /tell.*about.*savings/i,
  /savings.*account/i,
  /what.*savings/i
];

console.log('\nPattern matches:');
patterns.forEach((pattern, i) => {
  console.log(`Pattern ${i + 1}: ${pattern} -> ${pattern.test(query)}`);
});
