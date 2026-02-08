const axios = require('axios');

// Use local server for testing
const BASE_URL = 'http://localhost:4000';

async function testEscalationFlow() {
  console.log('========================================');
  console.log('TESTING: Customer Escalation Contact Flow');
  console.log('========================================\n');
  
  let sessionId = null;
  
  // Step 1: Start session
  console.log('Step 1: Starting new session...');
  try {
    const sessionResp = await axios.post(BASE_URL + '/api/session');
    sessionId = sessionResp.data.sessionId;
    console.log('Session ID:', sessionId.substring(0, 30) + '...');
  } catch (e) {
    console.log('Error starting session:', e.message);
    return;
  }
  
  // Step 2: Send first message (triggers welcome)
  console.log('\nStep 2: Sending initial message...');
  let resp = await axios.post(BASE_URL + '/api/chat', {
    sessionId,
    message: 'Hello'
  });
  console.log('Bot:', resp.data.response?.substring(0, 100) || resp.data.reply?.substring(0, 100));
  console.log('Buttons:', resp.data.buttons?.map(b => b.text).join(', ') || 'none');
  
  // Step 3: Say 'Yes' I'm a customer
  console.log('\n\nStep 3: Saying "Yes" to being a customer...');
  resp = await axios.post(BASE_URL + '/api/chat', {
    sessionId,
    message: 'Yes'
  });
  console.log('Bot:', resp.data.response?.substring(0, 150) || resp.data.reply?.substring(0, 150));
  
  // Step 4: Skip verification and make a complaint directly
  console.log('\n\nStep 4: Making complaint without providing account/phone...');
  resp = await axios.post(BASE_URL + '/api/chat', {
    sessionId,
    message: 'I have a serious complaint about your services. My money was deducted wrongly and I need help immediately!'
  });
  console.log('Bot:', resp.data.response?.substring(0, 400) || resp.data.reply?.substring(0, 400));
  console.log('\n--- Response Flags ---');
  console.log('suggestHandover:', resp.data.suggestHandover);
  console.log('requiresContactInfo:', resp.data.requiresContactInfo);
  console.log('showEscalationContactForm:', resp.data.showEscalationContactForm);
  
  // Step 5: If contact form shown, provide phone number
  if (resp.data.showEscalationContactForm || resp.data.requiresContactInfo) {
    console.log('\n\n✅ SUCCESS: Bot requested contact info before escalation!');
    
    console.log('\nStep 5: Providing phone number...');
    resp = await axios.post(BASE_URL + '/api/chat', {
      sessionId,
      message: JSON.stringify({
        __escalationContactForm: true,
        name: 'Test Customer',
        phone: '0241234567'
      })
    });
    console.log('Bot:', resp.data.response?.substring(0, 200) || resp.data.reply?.substring(0, 200));
    console.log('\n--- Response Flags ---');
    console.log('escalationContactSuccess:', resp.data.escalationContactSuccess);
    console.log('suggestHandover:', resp.data.suggestHandover);
    console.log('customerInfo:', JSON.stringify(resp.data.customerInfo));
    
    if (resp.data.escalationContactSuccess) {
      console.log('\n✅ SUCCESS: Contact info collected, ready for escalation!');
    }
  } else {
    console.log('\n❌ ISSUE: Bot did not request contact info before escalation');
  }
  
  console.log('\n========================================');
  console.log('TEST COMPLETE');
  console.log('========================================');
}

testEscalationFlow().catch(e => console.error('Test failed:', e.message));
