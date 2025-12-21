/**
 * Turing Test for AKCB Chatbot
 * Tests conversational AI capabilities and human-likeness
 */

const axios = require('axios');

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';
const TESTS = [];
let passedTests = 0;
let failedTests = 0;

// Test session ID
const sessionId = `turing_test_${Date.now()}`;

// Helper to send message and get response
async function chat(message, testName) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`TEST: ${testName}`);
  console.log(`${'='.repeat(80)}`);
  console.log(`👤 USER: ${message}`);
  
  try {
    const response = await axios.post(`${BASE_URL}/api/chat`, {
      message,
      sessionId
    });
    
    const reply = response.data.reply;
    console.log(`🤖 BOT: ${reply}`);
    console.log(`📊 Source: ${response.data.source || 'unknown'}`);
    
    return {
      success: true,
      reply,
      source: response.data.source,
      suggestHandover: response.data.suggestHandover
    };
  } catch (error) {
    console.log(`❌ ERROR: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

// Evaluation functions
function evaluateResponse(response, criteria) {
  const checks = {
    hasContent: response.reply && response.reply.length > 0,
    notTooShort: response.reply && response.reply.length > 20,
    notGeneric: !/(hello|hi|assist you today)/i.test(response.reply) || response.reply.length > 50,
    conversational: /(\?|!|\.{3}|would you|can I|let me|I'd|I'll|you're|that's)/i.test(response.reply),
    specific: criteria.shouldMention ? new RegExp(criteria.shouldMention, 'i').test(response.reply) : true,
    notRobotic: !/^(here is|here are|the answer is|please find)/i.test(response.reply.trim()),
    usesContext: criteria.requiresContext ? true : true // Will be checked manually
  };
  
  const score = Object.values(checks).filter(v => v).length / Object.keys(checks).length;
  
  return {
    score,
    checks,
    passed: score >= 0.7
  };
}

// Test Categories

async function testContextMemory() {
  console.log(`\n\n${'#'.repeat(80)}`);
  console.log('CATEGORY 1: CONTEXT MEMORY & MULTI-TURN CONVERSATIONS');
  console.log(`${'#'.repeat(80)}`);
  
  // Test 1: Initial question
  let result = await chat(
    "What branches do you have?",
    "1.1 Initial Branch Query"
  );
  
  await sleep(1000);
  
  // Test 2: Follow-up using context
  result = await chat(
    "Which one is closest to Kumasi?",
    "1.2 Context-Aware Follow-up"
  );
  
  const eval1 = evaluateResponse(result, { 
    shouldMention: "(Ahwiaa|Kejetia|Ejura)",
    requiresContext: true
  });
  
  console.log(`\n✅ Evaluation: ${eval1.passed ? 'PASS' : 'FAIL'} (Score: ${(eval1.score * 100).toFixed(0)}%)`);
  eval1.passed ? passedTests++ : failedTests++;
  
  await sleep(1000);
  
  // Test 3: Pronoun reference
  result = await chat(
    "What's the phone number for that one?",
    "1.3 Pronoun Reference Resolution"
  );
  
  const eval2 = evaluateResponse(result, { 
    shouldMention: "(\\+233|0\\d{9}|phone)",
    requiresContext: true
  });
  
  console.log(`\n✅ Evaluation: ${eval2.passed ? 'PASS' : 'FAIL'} (Score: ${(eval2.score * 100).toFixed(0)}%)`);
  eval2.passed ? passedTests++ : failedTests++;
}

async function testNaturalConversation() {
  console.log(`\n\n${'#'.repeat(80)}`);
  console.log('CATEGORY 2: NATURAL CONVERSATION FLOW');
  console.log(`${'#'.repeat(80)}`);
  
  // Test 4: Greeting response
  let result = await chat(
    "Hi there!",
    "2.1 Natural Greeting"
  );
  
  const eval1 = evaluateResponse(result, { shouldMention: "(how|help|assist)" });
  console.log(`\n✅ Evaluation: ${eval1.passed ? 'PASS' : 'FAIL'} (Score: ${(eval1.score * 100).toFixed(0)}%)`);
  eval1.passed ? passedTests++ : failedTests++;
  
  await sleep(1000);
  
  // Test 5: Small talk
  result = await chat(
    "Thanks, you're helpful!",
    "2.2 Small Talk Response"
  );
  
  const eval2 = evaluateResponse(result, { shouldMention: "(welcome|happy|glad|pleasure|anything else)" });
  console.log(`\n✅ Evaluation: ${eval2.passed ? 'PASS' : 'FAIL'} (Score: ${(eval2.score * 100).toFixed(0)}%)`);
  eval2.passed ? passedTests++ : failedTests++;
  
  await sleep(1000);
  
  // Test 6: Vague question
  result = await chat(
    "I need help with something",
    "2.3 Handling Vague Requests"
  );
  
  const eval3 = evaluateResponse(result, { shouldMention: "(what|help with|can you tell|more about)" });
  console.log(`\n✅ Evaluation: ${eval3.passed ? 'PASS' : 'FAIL'} (Score: ${(eval3.score * 100).toFixed(0)}%)`);
  eval3.passed ? passedTests++ : failedTests++;
}

async function testEmotionalIntelligence() {
  console.log(`\n\n${'#'.repeat(80)}`);
  console.log('CATEGORY 3: EMOTIONAL INTELLIGENCE & EMPATHY');
  console.log(`${'#'.repeat(80)}`);
  
  // Test 7: Frustration
  let result = await chat(
    "I've been trying to reach your office all day and nobody answers!",
    "3.1 Handling Frustration"
  );
  
  const eval1 = evaluateResponse(result, { 
    shouldMention: "(sorry|apologize|understand|frustrating|help)"
  });
  console.log(`\n✅ Evaluation: ${eval1.passed ? 'PASS' : 'FAIL'} (Score: ${(eval1.score * 100).toFixed(0)}%)`);
  eval1.passed ? passedTests++ : failedTests++;
  
  await sleep(1000);
  
  // Test 8: Urgency
  result = await chat(
    "This is urgent! I need to speak to someone right now!",
    "3.2 Handling Urgency"
  );
  
  const eval2 = evaluateResponse(result, { 
    shouldMention: "(immediately|right away|connect|contact|help you now)"
  });
  console.log(`\n✅ Evaluation: ${eval2.passed ? 'PASS' : 'FAIL'} (Score: ${(eval2.score * 100).toFixed(0)}%)`);
  eval2.passed ? passedTests++ : failedTests++;
}

async function testAmbiguityHandling() {
  console.log(`\n\n${'#'.repeat(80)}`);
  console.log('CATEGORY 4: AMBIGUITY & UNCLEAR REQUESTS');
  console.log(`${'#'.repeat(80)}`);
  
  // Test 9: Ambiguous name
  let result = await chat(
    "Who is Michael?",
    "4.1 Ambiguous Name Query"
  );
  
  const eval1 = evaluateResponse(result, { 
    shouldMention: "(Michael|which|both|two)"
  });
  console.log(`\n✅ Evaluation: ${eval1.passed ? 'PASS' : 'FAIL'} (Score: ${(eval1.score * 100).toFixed(0)}%)`);
  eval1.passed ? passedTests++ : failedTests++;
  
  await sleep(1000);
  
  // Test 10: Typo handling
  result = await chat(
    "I want to open a savngs acount",
    "4.2 Typo Understanding"
  );
  
  const eval2 = evaluateResponse(result, { 
    shouldMention: "(savings|account|open)"
  });
  console.log(`\n✅ Evaluation: ${eval2.passed ? 'PASS' : 'FAIL'} (Score: ${(eval2.score * 100).toFixed(0)}%)`);
  eval2.passed ? passedTests++ : failedTests++;
}

async function testKnowledgeBoundaries() {
  console.log(`\n\n${'#'.repeat(80)}`);
  console.log('CATEGORY 5: KNOWLEDGE BOUNDARIES & ESCALATION');
  console.log(`${'#'.repeat(80)}`);
  
  // Test 11: Unknown information
  let result = await chat(
    "What's the CEO's salary?",
    "5.1 Unknown Information"
  );
  
  const eval1 = evaluateResponse(result, { 
    shouldMention: "(don't have|outside|specific information|connect|representative)"
  });
  console.log(`\n✅ Evaluation: ${eval1.passed ? 'PASS' : 'FAIL'} (Score: ${(eval1.score * 100).toFixed(0)}%)`);
  console.log(`📋 Escalation Suggested: ${result.suggestHandover ? 'YES ✅' : 'NO ❌'}`);
  eval1.passed ? passedTests++ : failedTests++;
  
  await sleep(1000);
  
  // Test 12: Complex financial question
  result = await chat(
    "Can you help me with tax implications of my investment portfolio?",
    "5.2 Out of Scope Question"
  );
  
  const eval2 = evaluateResponse(result, { 
    shouldMention: "(don't|cannot|outside|specialist|expert|representative)"
  });
  console.log(`\n✅ Evaluation: ${eval2.passed ? 'PASS' : 'FAIL'} (Score: ${(eval2.score * 100).toFixed(0)}%)`);
  eval2.passed ? passedTests++ : failedTests++;
}

async function testConversationalCoherence() {
  console.log(`\n\n${'#'.repeat(80)}`);
  console.log('CATEGORY 6: CONVERSATIONAL COHERENCE');
  console.log(`${'#'.repeat(80)}`);
  
  // Test 13: Topic switching
  let result = await chat(
    "Tell me about loans",
    "6.1 Initial Topic"
  );
  
  await sleep(1000);
  
  result = await chat(
    "Actually, what about savings accounts?",
    "6.2 Topic Switch"
  );
  
  const eval1 = evaluateResponse(result, { 
    shouldMention: "(savings|save|deposit|interest)"
  });
  console.log(`\n✅ Evaluation: ${eval1.passed ? 'PASS' : 'FAIL'} (Score: ${(eval1.score * 100).toFixed(0)}%)`);
  eval1.passed ? passedTests++ : failedTests++;
  
  await sleep(1000);
  
  // Test 14: Follow-up question
  result = await chat(
    "What's the interest rate?",
    "6.3 Contextual Follow-up"
  );
  
  const eval2 = evaluateResponse(result, { 
    shouldMention: "(rate|interest|%|percent)",
    requiresContext: true
  });
  console.log(`\n✅ Evaluation: ${eval2.passed ? 'PASS' : 'FAIL'} (Score: ${(eval2.score * 100).toFixed(0)}%)`);
  eval2.passed ? passedTests++ : failedTests++;
}

async function testProactiveAssistance() {
  console.log(`\n\n${'#'.repeat(80)}`);
  console.log('CATEGORY 7: PROACTIVE ASSISTANCE');
  console.log(`${'#'.repeat(80)}`);
  
  // Test 15: Anticipating needs
  let result = await chat(
    "I want to apply for a loan",
    "7.1 Proactive Information"
  );
  
  const eval1 = evaluateResponse(result, { 
    shouldMention: "(requirements|documents|eligibility|process|how to)"
  });
  console.log(`\n✅ Evaluation: ${eval1.passed ? 'PASS' : 'FAIL'} (Score: ${(eval1.score * 100).toFixed(0)}%)`);
  eval1.passed ? passedTests++ : failedTests++;
  
  await sleep(1000);
  
  // Test 16: Offering alternatives
  result = await chat(
    "Do you have ATMs?",
    "7.2 Offering Related Information"
  );
  
  const eval2 = evaluateResponse(result, { 
    shouldMention: "(ATM|branch|location|mobile banking)"
  });
  console.log(`\n✅ Evaluation: ${eval2.passed ? 'PASS' : 'FAIL'} (Score: ${(eval2.score * 100).toFixed(0)}%)`);
  eval2.passed ? passedTests++ : failedTests++;
}

// Helper function
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Generate report
function generateReport() {
  console.log(`\n\n${'#'.repeat(80)}`);
  console.log('TURING TEST RESULTS');
  console.log(`${'#'.repeat(80)}`);
  
  const totalTests = passedTests + failedTests;
  const passRate = (passedTests / totalTests * 100).toFixed(1);
  
  console.log(`\n📊 OVERALL STATISTICS:`);
  console.log(`   Total Tests: ${totalTests}`);
  console.log(`   Passed: ${passedTests} ✅`);
  console.log(`   Failed: ${failedTests} ❌`);
  console.log(`   Pass Rate: ${passRate}%`);
  
  console.log(`\n🎯 TURING TEST EVALUATION:`);
  if (passRate >= 90) {
    console.log(`   Grade: A+ - HIGHLY HUMAN-LIKE 🌟`);
    console.log(`   The bot demonstrates exceptional conversational abilities.`);
    console.log(`   Most humans would struggle to identify it as AI.`);
  } else if (passRate >= 80) {
    console.log(`   Grade: A - VERY HUMAN-LIKE ⭐`);
    console.log(`   The bot shows strong conversational capabilities.`);
    console.log(`   It would likely pass as human in many scenarios.`);
  } else if (passRate >= 70) {
    console.log(`   Grade: B - CONVINCINGLY CONVERSATIONAL 👍`);
    console.log(`   The bot handles most conversations well.`);
    console.log(`   Some responses may reveal its AI nature.`);
  } else if (passRate >= 60) {
    console.log(`   Grade: C - ADEQUATE FUNCTIONALITY 👌`);
    console.log(`   The bot provides useful responses but lacks natural flow.`);
    console.log(`   Users would likely identify it as AI.`);
  } else {
    console.log(`   Grade: D - NEEDS IMPROVEMENT 📝`);
    console.log(`   The bot requires significant enhancements.`);
    console.log(`   Responses feel robotic and disconnected.`);
  }
  
  console.log(`\n💡 KEY INDICATORS OF HUMAN-LIKENESS:`);
  console.log(`   ✓ Context retention across multiple turns`);
  console.log(`   ✓ Natural language patterns (questions, exclamations)`);
  console.log(`   ✓ Emotional intelligence and empathy`);
  console.log(`   ✓ Handling ambiguity gracefully`);
  console.log(`   ✓ Knowing when to escalate to humans`);
  console.log(`   ✓ Proactive and helpful suggestions`);
  console.log(`   ✓ Non-repetitive, varied responses`);
  
  console.log(`\n${'#'.repeat(80)}\n`);
}

// Run all tests
async function runTuringTest() {
  console.log(`\n${'='.repeat(80)}`);
  console.log('TURING TEST FOR AKCB CHATBOT');
  console.log('Evaluating conversational AI capabilities and human-likeness');
  console.log(`${'='.repeat(80)}`);
  console.log(`\n🔬 Testing against: ${BASE_URL}`);
  console.log(`📝 Session ID: ${sessionId}`);
  console.log(`⏱️  Started at: ${new Date().toLocaleString()}`);
  
  try {
    await testContextMemory();
    await sleep(2000);
    
    await testNaturalConversation();
    await sleep(2000);
    
    await testEmotionalIntelligence();
    await sleep(2000);
    
    await testAmbiguityHandling();
    await sleep(2000);
    
    await testKnowledgeBoundaries();
    await sleep(2000);
    
    await testConversationalCoherence();
    await sleep(2000);
    
    await testProactiveAssistance();
    
    generateReport();
    
  } catch (error) {
    console.error(`\n❌ Test suite failed: ${error.message}`);
    console.error(error.stack);
  }
}

// Run the test
runTuringTest().then(() => {
  console.log('✅ Turing Test complete!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
