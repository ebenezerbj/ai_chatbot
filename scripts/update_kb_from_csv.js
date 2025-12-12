const fs = require('fs');
const path = require('path');

// Read CSV file
const csvPath = path.join(__dirname, '..', 'bank_chatbot_training_data_all_expanded.csv');
const kbPath = path.join(__dirname, '..', 'data', 'kb.json');

const csvContent = fs.readFileSync(csvPath, 'utf-8');
const lines = csvContent.split('\n').slice(1); // Skip header

// Group utterances by intent
const intents = {};
lines.forEach(line => {
  if (!line.trim()) return;
  
  const [intent, intent_group, description, utterance] = line.split(',').map(s => s.trim());
  
  if (!intents[intent]) {
    intents[intent] = {
      intent,
      intent_group,
      description,
      utterances: []
    };
  }
  
  if (utterance) {
    intents[intent].utterances.push(utterance);
  }
});

// Read existing KB
const existingKB = JSON.parse(fs.readFileSync(kbPath, 'utf-8'));

// Create new KB entries from intents
const newEntries = Object.values(intents).map(intent => {
  // Generate patterns from utterances (extract key phrases)
  const patterns = intent.utterances.map(u => {
    // Convert to regex-friendly pattern
    return u
      .toLowerCase()
      .replace(/\?/g, '')
      .replace(/\./g, '')
      .replace(/my |the |a |an |your /gi, '')
      .trim();
  });
  
  // Create a general response based on intent
  let answer = `${intent.description}.\n\n`;
  
  // Add intent-specific responses
  switch(intent.intent_group) {
    case 'account_information':
      answer += `To ${intent.description.toLowerCase()}, please log in to your mobile banking app or visit any of our branches. You can also call our customer service at +233 20 205 5170 for assistance.`;
      break;
    case 'transfers_payments':
      answer += `For ${intent.description.toLowerCase()}, you can use our mobile banking app, internet banking, or visit any branch. Transfers are subject to daily limits and applicable fees may apply.`;
      break;
    case 'card_management':
      answer += `For ${intent.description.toLowerCase()}, please contact our customer service immediately at +233 20 205 5170 or use the mobile banking app. Our team is available to assist you 24/7.`;
      break;
    case 'digital_banking':
      answer += `To ${intent.description.toLowerCase()}, please use our mobile banking app or contact customer service at +233 20 205 5170. For security reasons, some actions may require identity verification.`;
      break;
    case 'loans_credit':
      answer += `For information about ${intent.description.toLowerCase()}, please visit any branch or call +233 20 205 5170. Our loan officers will be happy to discuss options and eligibility requirements.`;
      break;
    case 'savings_investments':
      answer += `For ${intent.description.toLowerCase()}, please visit any branch or contact us at +233 20 205 5170. Our financial advisors can provide detailed information and help you get started.`;
      break;
    case 'fees_charges':
      answer += `For details about ${intent.description.toLowerCase()}, please refer to our fee schedule available at any branch or on our website. You can also contact customer service at +233 20 205 5170.`;
      break;
    case 'customer_profile':
      answer += `To ${intent.description.toLowerCase()}, please visit any branch with valid identification documents or use our mobile banking app. Some changes may require in-person verification.`;
      break;
    case 'branch_atm':
      answer += `To ${intent.description.toLowerCase()}, please use our branch locator on the mobile app or visit our website. You can also call +233 20 205 5170 for directions.`;
      break;
    case 'security_fraud':
      answer += `For ${intent.description.toLowerCase()}, please contact our fraud hotline immediately at +233 20 205 5170. Time-sensitive reports can also be made through the mobile banking app.`;
      break;
    case 'general':
      answer += `For more information about ${intent.description.toLowerCase()}, please visit any branch, check our website, or call customer service at +233 20 205 5170.`;
      break;
    case 'complaints_disputes':
      answer += `To ${intent.description.toLowerCase()}, please contact customer service at +233 20 205 5170 or visit any branch. We aim to resolve all issues within 24-48 hours.`;
      break;
    case 'human_agent':
      answer += `I'll connect you with a human agent who can better assist you. Please call +233 20 205 5170 or visit any of our branches for personalized service.`;
      break;
    default:
      answer += `For assistance with this request, please contact customer service at +233 20 205 5170 or visit any of our branches.`;
  }
  
  return {
    id: intent.intent,
    product: intent.intent_group,
    patterns: [...new Set(patterns)].slice(0, 10), // Unique patterns, max 10
    answer: answer
  };
});

// Merge with existing KB (keep existing, add new)
const existingIds = new Set(existingKB.map(e => e.id));
const entriesToAdd = newEntries.filter(e => !existingIds.has(e.id));

const updatedKB = [...existingKB, ...entriesToAdd];

// Backup existing KB
fs.copyFileSync(kbPath, kbPath + '.backup');
console.log(`Backed up existing KB to ${kbPath}.backup`);

// Write updated KB
fs.writeFileSync(kbPath, JSON.stringify(updatedKB, null, 2));
console.log(`\nKB Update Summary:`);
console.log(`- Existing entries: ${existingKB.length}`);
console.log(`- New entries added: ${entriesToAdd.length}`);
console.log(`- Total entries: ${updatedKB.length}`);
console.log(`\nNew intents added:`);
entriesToAdd.forEach(e => console.log(`  - ${e.id} (${e.product})`));
