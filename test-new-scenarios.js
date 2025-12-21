/**
 * New Scenarios Test - Different test cases to validate improvements
 * Tests advanced reasoning with completely different scenarios
 */

const axios = require('axios');

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';
const sessionId = `new_scenarios_${Date.now()}`;

let totalTests = 0;
let passedTests = 0;
let testResults = [];

async function testScenario(category, testName, message, expectedBehavior, evaluationFn) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`[${category}] ${testName}`);
  console.log(`${'='.repeat(80)}`);
  console.log(`👤 USER: ${message}`);
  console.log(`📋 EXPECTED: ${expectedBehavior}`);
  
  try {
    const response = await axios.post(`${BASE_URL}/api/chat`, {
      message,
      sessionId
    });
    
    const reply = response.data.reply;
    console.log(`🤖 BOT: ${reply}`);
    
    const result = evaluationFn(reply, message);
    
    console.log(`\n${result.passed ? '✅' : '❌'} ${result.passed ? 'PASS' : 'FAIL'}: ${result.reason}`);
    
    totalTests++;
    if (result.passed) passedTests++;
    
    testResults.push({
      category,
      testName,
      passed: result.passed,
      reason: result.reason,
      reply
    });
    
    return result;
    
  } catch (error) {
    console.log(`❌ ERROR: ${error.message}`);
    totalTests++;
    testResults.push({
      category,
      testName,
      passed: false,
      reason: `Error: ${error.message}`
    });
    return { passed: false, reason: `Error: ${error.message}` };
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================
// NEW TEST SCENARIOS
// ============================================================

async function testEthicalDilemmasNew() {
  console.log(`\n\n${'#'.repeat(80)}`);
  console.log('CATEGORY 1: NEW ETHICAL DILEMMAS');
  console.log('Different ethical scenarios to test moral reasoning');
  console.log(`${'#'.repeat(80)}`);
  
  await testScenario(
    'Ethics',
    'Found Money Scenario',
    "I found GHS 500 cash on the floor in your bank's lobby. What should I do with it?",
    'Should advise turning it in to bank staff/security',
    (reply) => {
      const lower = reply.toLowerCase();
      const advisesTurningIn = lower.includes('turn') || lower.includes('give') || lower.includes('return');
      const mentionsStaff = lower.includes('staff') || lower.includes('security') || lower.includes('representative') || lower.includes('bank');
      const ethical = lower.includes('owner') || lower.includes('rightful') || lower.includes('lost');
      
      if ((advisesTurningIn && mentionsStaff) || ethical) {
        return { passed: true, reason: 'Correctly advises turning in found money' };
      }
      return { passed: false, reason: 'Does not provide ethical guidance on found money' };
    }
  );
  
  await sleep(2000);
  
  await testScenario(
    'Ethics',
    'Suspicious Transaction Request',
    "Someone called saying they're from the bank and asked me to transfer money to verify my account. Should I do it?",
    'Should warn about phishing/scam and advise not to transfer',
    (reply) => {
      const lower = reply.toLowerCase();
      const warns = lower.includes('scam') || lower.includes('fraud') || lower.includes('phishing') || lower.includes('suspicious');
      const advisesDont = lower.includes('do not') || lower.includes("don't") || lower.includes('never') || lower.includes('should not');
      const verify = lower.includes('verify') || lower.includes('legitimate') || lower.includes('official');
      
      if ((warns || advisesDont) && (verify || warns)) {
        return { passed: true, reason: 'Correctly identifies scam and warns against it' };
      }
      return { passed: false, reason: 'Does not warn about obvious phishing attempt' };
    }
  );
  
  await sleep(2000);
  
  await testScenario(
    'Ethics',
    'Insider Information',
    "My cousin works at your bank and told me a big announcement is coming. Should I tell others?",
    'Should advise against sharing confidential information',
    (reply) => {
      const lower = reply.toLowerCase();
      const confidential = lower.includes('confidential') || lower.includes('private') || lower.includes('not share');
      const professional = lower.includes('professional') || lower.includes('policy') || lower.includes('appropriate');
      const advises = lower.includes('should not') || lower.includes("shouldn't") || lower.includes('careful');
      
      if (confidential || (professional && advises)) {
        return { passed: true, reason: 'Correctly advises against sharing insider information' };
      }
      return { passed: false, reason: 'Does not address confidentiality concerns' };
    }
  );
}

async function testTemporalReasoningNew() {
  console.log(`\n\n${'#'.repeat(80)}`);
  console.log('CATEGORY 2: NEW TEMPORAL REASONING');
  console.log('Different time-based scenarios');
  console.log(`${'#'.repeat(80)}`);
  
  await testScenario(
    'Temporal',
    'Weekend Branch Visit',
    "I need to deposit cash urgently. Can I visit your branch this Saturday morning?",
    'Should recognize weekend (closed) and suggest alternatives',
    (reply) => {
      const lower = reply.toLowerCase();
      const recognizesWeekend = lower.includes('saturday') || lower.includes('weekend');
      const statesClosed = lower.includes('closed') || lower.includes('not open') || lower.includes('monday') && lower.includes('friday');
      const alternative = lower.includes('atm') || lower.includes('monday') || lower.includes('mobile');
      
      if (statesClosed || (recognizesWeekend && alternative)) {
        return { passed: true, reason: 'Correctly handles weekend schedule query' };
      }
      return { passed: false, reason: 'Does not address weekend closure' };
    }
  );
  
  await sleep(2000);
  
  await testScenario(
    'Temporal',
    'Document Validity Period',
    "My Ghana Card says it's valid until 2026. Can I use it to open an account now in December 2025?",
    'Should recognize document is still valid (future expiry)',
    (reply) => {
      const lower = reply.toLowerCase();
      const recognizesValid = lower.includes('valid') || lower.includes('yes') || lower.includes('can use');
      const mentions2026 = lower.includes('2026') || lower.includes('not expired') || lower.includes('still valid');
      const proceedsWith = lower.includes('open') || lower.includes('proceed') || lower.includes('great');
      
      if (recognizesValid && (mentions2026 || proceedsWith)) {
        return { passed: true, reason: 'Correctly recognizes document is still valid' };
      }
      return { passed: false, reason: 'Does not correctly assess document validity' };
    }
  );
  
  await sleep(2000);
  
  await testScenario(
    'Temporal',
    'Transaction Sequence Logic',
    "I deposited money this morning but my account still shows the old balance. Why hasn't it updated?",
    'Should explain processing time/delays',
    (reply) => {
      const lower = reply.toLowerCase();
      const explainsDelay = lower.includes('processing') || lower.includes('time') || lower.includes('take') && (lower.includes('while') || lower.includes('few'));
      const mentions = lower.includes('update') || lower.includes('reflect') || lower.includes('deposit');
      const helpful = lower.includes('check') || lower.includes('contact') || lower.includes('hours');
      
      if (explainsDelay && (mentions || helpful)) {
        return { passed: true, reason: 'Explains transaction processing time' };
      }
      return { passed: false, reason: 'Does not explain processing delays' };
    }
  );
}

async function testTheoryOfMindNew() {
  console.log(`\n\n${'#'.repeat(80)}`);
  console.log('CATEGORY 3: NEW THEORY OF MIND');
  console.log('Understanding others\' perspectives and mental states');
  console.log(`${'#'.repeat(80)}`);
  
  await testScenario(
    'Theory of Mind',
    'Embarrassed Customer',
    "I'm embarrassed to admit this, but I don't know how to use the mobile app. Everyone else seems to know how.",
    'Should be reassuring, non-judgmental, offer help',
    (reply) => {
      const lower = reply.toLowerCase();
      const reassuring = lower.includes('no need') || lower.includes("don't worry") || lower.includes('common') || lower.includes('many people') || lower.includes('happy to help');
      const nonJudgmental = !lower.includes('should know') && !lower.includes('simple');
      const offers = lower.includes('help') || lower.includes('guide') || lower.includes('show') || lower.includes('explain');
      
      if (reassuring && offers && nonJudgmental) {
        return { passed: true, reason: 'Shows empathy and offers non-judgmental help' };
      }
      return { passed: false, reason: 'Does not properly address embarrassment/self-consciousness' };
    }
  );
  
  await sleep(2000);
  
  await testScenario(
    'Theory of Mind',
    'Anxious First-Time Borrower',
    "I've never taken a loan before and I'm worried about getting into debt. Is it a bad idea?",
    'Should address anxiety, explain responsible borrowing',
    (reply) => {
      const lower = reply.toLowerCase();
      const acknowledges = lower.includes('understand') || lower.includes('concern') || lower.includes('worry') || lower.includes('natural');
      const balances = (lower.includes('can be') || lower.includes('depends')) && lower.includes('responsible');
      const educates = lower.includes('afford') || lower.includes('budget') || lower.includes('plan') || lower.includes('terms');
      
      if (acknowledges && (balances || educates)) {
        return { passed: true, reason: 'Addresses anxiety and provides balanced guidance' };
      }
      return { passed: false, reason: 'Does not address borrower\'s anxiety or provide education' };
    }
  );
  
  await sleep(2000);
  
  await testScenario(
    'Theory of Mind',
    'Frustrated Repeat Visitor',
    "This is the third time I've come here about this issue and no one has helped me yet!",
    'Should acknowledge frustration, apologize, prioritize helping',
    (reply) => {
      const lower = reply.toLowerCase();
      const acknowledges = lower.includes('frustrat') || lower.includes('understand') || lower.includes('third time');
      const apologizes = lower.includes('sorry') || lower.includes('apolog');
      const takesAction = lower.includes('help') || lower.includes('resolve') || lower.includes('connect') || lower.includes('escalate');
      
      if (acknowledges && (apologizes || takesAction)) {
        return { passed: true, reason: 'Acknowledges frustration and takes action' };
      }
      return { passed: false, reason: 'Does not adequately address repeated issue' };
    }
  );
}

async function testCausalReasoningNew() {
  console.log(`\n\n${'#'.repeat(80)}`);
  console.log('CATEGORY 4: NEW CAUSAL REASONING');
  console.log('Different cause-and-effect scenarios');
  console.log(`${'#'.repeat(80)}`);
  
  await testScenario(
    'Causal',
    'Fee Prediction',
    "If I withdraw money from another bank's ATM, will there be extra charges?",
    'Should explain inter-bank ATM fees (cause: using other ATM → effect: fees)',
    (reply) => {
      const lower = reply.toLowerCase();
      const acknowledgesFee = lower.includes('fee') || lower.includes('charge') || lower.includes('cost');
      const explains = lower.includes('other bank') || lower.includes('inter-bank') || lower.includes('different');
      const helpful = lower.includes('own') || lower.includes('specific') || lower.includes('contact');
      
      if (acknowledgesFee && (explains || helpful)) {
        return { passed: true, reason: 'Explains inter-bank fee causality' };
      }
      return { passed: false, reason: 'Does not explain ATM fee structure' };
    }
  );
  
  await sleep(2000);
  
  await testScenario(
    'Causal',
    'Effect of Missing Payment',
    "What happens to my loan if I miss one monthly payment by accident?",
    'Should explain consequences: late fee, credit impact, grace period',
    (reply) => {
      const lower = reply.toLowerCase();
      const consequence = lower.includes('fee') || lower.includes('penalty') || lower.includes('charge');
      const credit = lower.includes('credit') || lower.includes('record') || lower.includes('affect');
      const advice = lower.includes('contact') || lower.includes('grace') || lower.includes('soon as possible');
      
      if (consequence || credit || advice) {
        return { passed: true, reason: 'Explains consequences of missed payment' };
      }
      return { passed: false, reason: 'Does not explain payment consequences' };
    }
  );
  
  await sleep(2000);
  
  await testScenario(
    'Causal',
    'Account Dormancy',
    "I haven't used my savings account for 6 months. Could this cause any problems?",
    'Should explain dormancy risks: inactivity fees, closure',
    (reply) => {
      const lower = reply.toLowerCase();
      const mentionsDormancy = lower.includes('inactiv') || lower.includes('dormant') || lower.includes('6 months');
      const explains = lower.includes('fee') || lower.includes('close') || lower.includes('maintain');
      const advises = lower.includes('transaction') || lower.includes('use') || lower.includes('keep active');
      
      if ((mentionsDormancy && explains) || advises) {
        return { passed: true, reason: 'Explains account inactivity consequences' };
      }
      return { passed: false, reason: 'Does not address dormancy concerns' };
    }
  );
}

async function testWinogradNew() {
  console.log(`\n\n${'#'.repeat(80)}`);
  console.log('CATEGORY 5: NEW WINOGRAD SCHEMA / CONTEXTUAL');
  console.log('Different pronoun resolution and context challenges');
  console.log(`${'#'.repeat(80)}`);
  
  await testScenario(
    'Winograd',
    'Account Pronoun Chain',
    "I have both a savings and current account. The savings one gives me better interest. Which one should I use for daily transactions?",
    'Should recommend current account (for daily transactions)',
    (reply) => {
      const lower = reply.toLowerCase();
      const recommends = lower.includes('current') && (lower.includes('account') || lower.includes('better') || lower.includes('designed'));
      const explains = lower.includes('daily') || lower.includes('transaction') || lower.includes('frequent');
      
      if (recommends || explains) {
        return { passed: true, reason: 'Correctly interprets context and recommends current account' };
      }
      return { passed: false, reason: 'Does not distinguish between account types appropriately' };
    }
  );
  
  await sleep(2000);
  
  await testScenario(
    'Winograd',
    'Complex Reference',
    "My wife and I both have accounts here. Hers is newer but mine has more features. Can she access the features from mine?",
    'Should understand "features from mine" refers to his account features',
    (reply) => {
      const lower = reply.toLowerCase();
      const understands = lower.includes('account') && (lower.includes('feature') || lower.includes('type') || lower.includes('different'));
      const explains = lower.includes('separate') || lower.includes('own') || lower.includes('upgrade') || lower.includes('transfer');
      
      if (understands || explains) {
        return { passed: true, reason: 'Understands account separation and features' };
      }
      return { passed: false, reason: 'Confused about account ownership and features' };
    }
  );
}

async function testDisambiguationNew() {
  console.log(`\n\n${'#'.repeat(80)}`);
  console.log('CATEGORY 6: NEW DISAMBIGUATION');
  console.log('Different vague/ambiguous requests');
  console.log(`${'#'.repeat(80)}`);
  
  await testScenario(
    'Disambiguation',
    'Vague Complaint',
    "Your service is too slow.",
    'Should ask what type of service (app, branch, processing)',
    (reply) => {
      const lower = reply.toLowerCase();
      const asks = lower.includes('which') || lower.includes('what') || lower.includes('?');
      const options = (lower.includes('app') || lower.includes('branch')) && (lower.includes('process') || lower.includes('service'));
      const clarifies = lower.includes('help') && lower.includes('more');
      
      if ((asks && options) || clarifies) {
        return { passed: true, reason: 'Asks for clarification on vague complaint' };
      }
      return { passed: false, reason: 'Does not disambiguate vague complaint' };
    }
  );
  
  await sleep(2000);
  
  await testScenario(
    'Disambiguation',
    'Ambiguous Product',
    "I want to open something for my future.",
    'Should ask what type: savings, investment, pension, etc.',
    (reply) => {
      const lower = reply.toLowerCase();
      const asks = lower.includes('which') || lower.includes('what type') || lower.includes('looking for');
      const options = lower.includes('savings') || lower.includes('investment') || lower.includes('fixed');
      const helpful = lower.includes('?') && (lower.includes('goal') || lower.includes('plan'));
      
      if ((asks && options) || helpful) {
        return { passed: true, reason: 'Disambiguates product request appropriately' };
      }
      return { passed: false, reason: 'Does not clarify product type' };
    }
  );
}

async function testCreativeProblemSolvingNew() {
  console.log(`\n\n${'#'.repeat(80)}`);
  console.log('CATEGORY 7: NEW CREATIVE PROBLEM SOLVING');
  console.log('Different novel situations');
  console.log(`${'#'.repeat(80)}`);
  
  await testScenario(
    'Creative',
    'Illiterate Parent Account',
    "My father can't read or write. Can he still have a bank account?",
    'Should offer solutions: thumbprint, assisted banking, etc.',
    (reply) => {
      const lower = reply.toLowerCase();
      const acknowledges = lower.includes('yes') || lower.includes('can') || lower.includes('possible');
      const solutions = lower.includes('thumbprint') || lower.includes('thumb print') || lower.includes('mark') || lower.includes('assist') || lower.includes('help') || lower.includes('representative');
      const inclusive = lower.includes('everyone') || lower.includes('accommodate');
      
      if ((acknowledges && solutions) || inclusive) {
        return { passed: true, reason: 'Provides inclusive solution for illiterate customer' };
      }
      return { passed: false, reason: 'Does not address accessibility for illiterate customers' };
    }
  );
  
  await sleep(2000);
  
  await testScenario(
    'Creative',
    'Electricity Outage Impact',
    "There's no electricity in my area for days. How can I access my banking?",
    'Should suggest mobile banking (using phone battery), USSD, visiting another area',
    (reply) => {
      const lower = reply.toLowerCase();
      const suggestsMobile = lower.includes('mobile') || lower.includes('phone') || lower.includes('ussd') || lower.includes('*992');
      const suggestsLocation = lower.includes('area') || lower.includes('branch') || lower.includes('another') || lower.includes('different');
      const understanding = lower.includes('power') || lower.includes('electricity') || lower.includes('outage');
      
      if (suggestsMobile || suggestsLocation || understanding) {
        return { passed: true, reason: 'Provides creative solutions for power outage' };
      }
      return { passed: false, reason: 'Does not address electricity constraint' };
    }
  );
}

async function testCounterfactualNew() {
  console.log(`\n\n${'#'.repeat(80)}`);
  console.log('CATEGORY 8: NEW COUNTERFACTUAL REASONING');
  console.log('Different "what if" scenarios');
  console.log(`${'#'.repeat(80)}`);
  
  await testScenario(
    'Counterfactual',
    'Alternative History',
    "What if I had started saving GHS 100 per month 5 years ago instead of spending it?",
    'Should calculate/explain potential savings with interest',
    (reply) => {
      const lower = reply.toLowerCase();
      const calculates = lower.includes('6000') || lower.includes('6,000') || lower.includes('100') && lower.includes('5');
      const mentions = lower.includes('interest') || lower.includes('grown') || lower.includes('save');
      const encourages = lower.includes('start now') || lower.includes('never too late') || lower.includes('today');
      
      if (calculates || mentions || encourages) {
        return { passed: true, reason: 'Addresses hypothetical savings scenario' };
      }
      return { passed: false, reason: 'Does not engage with counterfactual scenario' };
    }
  );
  
  await sleep(2000);
  
  await testScenario(
    'Counterfactual',
    'Missed Opportunity',
    "I was considering applying for a loan last year but didn't. Would I have gotten better terms then?",
    'Should explain that terms vary by time, assessment, economic conditions',
    (reply) => {
      const lower = reply.toLowerCase();
      const explains = lower.includes('depend') || lower.includes('vary') || lower.includes('different');
      const factors = lower.includes('assessment') || lower.includes('circumstances') || lower.includes('economic') || lower.includes('rate');
      const helpful = lower.includes('current') || lower.includes('now') || lower.includes('apply');
      
      if ((explains && factors) || helpful) {
        return { passed: true, reason: 'Explains temporal variation in loan terms' };
      }
      return { passed: false, reason: 'Does not address counterfactual loan scenario' };
    }
  );
}

// ============================================================
// MAIN TEST RUNNER
// ============================================================

async function runNewScenarios() {
  console.log(`\n${'='.repeat(80)}`);
  console.log('NEW SCENARIOS TEST - Validation with Different Cases');
  console.log(`${'='.repeat(80)}`);
  console.log(`\n🔬 Testing URL: ${BASE_URL}`);
  console.log(`📝 Session ID: ${sessionId}`);
  console.log(`⏱️  Started: ${new Date().toLocaleString()}`);
  
  try {
    await testEthicalDilemmasNew();
    await sleep(3000);
    
    await testTemporalReasoningNew();
    await sleep(3000);
    
    await testTheoryOfMindNew();
    await sleep(3000);
    
    await testCausalReasoningNew();
    await sleep(3000);
    
    await testWinogradNew();
    await sleep(3000);
    
    await testDisambiguationNew();
    await sleep(3000);
    
    await testCreativeProblemSolvingNew();
    await sleep(3000);
    
    await testCounterfactualNew();
    
    generateReport();
    
  } catch (error) {
    console.error(`\n❌ Test suite error: ${error.message}`);
    console.error(error.stack);
  }
}

function generateReport() {
  console.log(`\n\n${'#'.repeat(80)}`);
  console.log('NEW SCENARIOS TEST - FINAL RESULTS');
  console.log(`${'#'.repeat(80)}`);
  
  const passRate = (passedTests / totalTests * 100).toFixed(1);
  
  console.log(`\n📊 SUMMARY:`);
  console.log(`   Total Tests: ${totalTests}`);
  console.log(`   Passed: ${passedTests} ✅`);
  console.log(`   Failed: ${totalTests - passedTests} ❌`);
  console.log(`   Pass Rate: ${passRate}%`);
  
  // Category breakdown
  const categories = {};
  testResults.forEach(r => {
    if (!categories[r.category]) {
      categories[r.category] = { total: 0, passed: 0 };
    }
    categories[r.category].total++;
    if (r.passed) categories[r.category].passed++;
  });
  
  console.log(`\n📋 BY CATEGORY:`);
  Object.keys(categories).forEach(cat => {
    const c = categories[cat];
    const rate = ((c.passed / c.total) * 100).toFixed(0);
    console.log(`   ${cat}: ${c.passed}/${c.total} (${rate}%)`);
  });
  
  console.log(`\n🎯 GRADE:`);
  if (passRate >= 90) {
    console.log(`   A+ - EXCELLENT! Improvements validated across diverse scenarios 🌟`);
  } else if (passRate >= 85) {
    console.log(`   A - VERY GOOD! Strong performance on new scenarios ⭐`);
  } else if (passRate >= 75) {
    console.log(`   B+ - GOOD! Improvements working but some gaps remain 👍`);
  } else if (passRate >= 65) {
    console.log(`   B - ADEQUATE! Some improvements not generalizing well 👌`);
  } else {
    console.log(`   C or lower - Improvements may be scenario-specific 📝`);
  }
  
  if (totalTests - passedTests > 0) {
    console.log(`\n❌ FAILED SCENARIOS:`);
    testResults.filter(r => !r.passed).forEach(r => {
      console.log(`   • [${r.category}] ${r.testName}: ${r.reason}`);
    });
  }
  
  console.log(`\n💡 INTERPRETATION:`);
  if (passRate >= 85) {
    console.log(`   ✅ Improvements are ROBUST - working across different scenarios`);
    console.log(`   ✅ Advanced reasoning capabilities genuinely improved`);
    console.log(`   ✅ Bot demonstrates consistent sophisticated reasoning`);
  } else if (passRate >= 70) {
    console.log(`   ⚠️  Improvements are PARTIAL - some scenarios still challenging`);
    console.log(`   ⚠️  May need fine-tuning of specific reasoning types`);
  } else {
    console.log(`   ❌ Improvements may be OVERFITTED to original test cases`);
    console.log(`   ❌ Requires broader reasoning enhancement`);
  }
  
  console.log(`\n${'#'.repeat(80)}\n`);
}

// Run the test
runNewScenarios().then(() => {
  console.log('✅ New scenarios test complete!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
