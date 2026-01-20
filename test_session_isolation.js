/**
 * Test Script: Session Isolation Verification
 * 
 * This script tests that sessions are properly isolated and don't leak data between users.
 */

const axios = require('axios');

const BASE_URL = process.env.TEST_URL || 'http://localhost:4000';

async function testSessionIsolation() {
  console.log('🧪 Testing Session Isolation...\n');
  
  try {
    // Test 1: Verify unique session IDs
    console.log('Test 1: Creating multiple sessions...');
    const sessions = [];
    for (let i = 0; i < 5; i++) {
      const response = await axios.post(`${BASE_URL}/api/session`);
      sessions.push(response.data.sessionId);
      console.log(`  Session ${i + 1}: ${response.data.sessionId.substring(0, 30)}...`);
    }
    
    // Check for duplicates
    const uniqueSessions = new Set(sessions);
    if (uniqueSessions.size !== sessions.length) {
      console.error('❌ FAIL: Duplicate session IDs detected!');
      return false;
    }
    console.log('✅ PASS: All session IDs are unique\n');
    
    // Test 2: Verify session data isolation
    console.log('Test 2: Testing session data isolation...');
    
    // Create first session and submit visitor form
    const session1Response = await axios.post(`${BASE_URL}/api/session`);
    const session1Id = session1Response.data.sessionId;
    console.log(`  Session 1 ID: ${session1Id.substring(0, 30)}...`);
    
    // First message triggers customer identification
    const msg1 = await axios.post(`${BASE_URL}/api/chat`, {
      sessionId: session1Id,
      message: 'Hello'
    });
    console.log(`  Session 1 Response: ${msg1.data.response.substring(0, 50)}...`);
    
    // Say "No" to being a customer
    const msg2 = await axios.post(`${BASE_URL}/api/chat`, {
      sessionId: session1Id,
      message: 'No'
    });
    console.log(`  Session 1 Response: ${msg2.data.response.substring(0, 50)}...`);
    
    // Submit visitor form with name
    const visitorFormData = JSON.stringify({
      __visitorForm: true,
      fullname: 'Test User Session1',
      phone: '0241234567'
    });
    
    const msg3 = await axios.post(`${BASE_URL}/api/chat`, {
      sessionId: session1Id,
      message: visitorFormData
    });
    console.log(`  Session 1 Visitor: ${msg3.data.visitorInfo?.name || 'Not captured'}`);
    
    if (msg3.data.response.includes('Test User Session1')) {
      console.log('✅ Session 1 visitor data saved correctly');
    }
    
    // Create SECOND session (different user)
    const session2Response = await axios.post(`${BASE_URL}/api/session`);
    const session2Id = session2Response.data.sessionId;
    console.log(`\n  Session 2 ID: ${session2Id.substring(0, 30)}...`);
    
    // First message for second user
    const msg4 = await axios.post(`${BASE_URL}/api/chat`, {
      sessionId: session2Id,
      message: 'Hello'
    });
    
    console.log(`  Session 2 Response: ${msg4.data.response.substring(0, 100)}...`);
    
    // CRITICAL CHECK: Session 2 should NOT see Session 1's visitor name
    if (msg4.data.response.includes('Test User Session1')) {
      console.error('❌ FAIL: Session 2 can see Session 1 visitor data!');
      console.error('   This indicates a DATA LEAKAGE bug!');
      return false;
    }
    
    if (msg4.data.response.includes('Welcome back')) {
      console.error('❌ FAIL: Session 2 incorrectly identified as returning visitor!');
      return false;
    }
    
    if (msg4.data.response.includes('Welcome to Amantin and Kasei')) {
      console.log('✅ PASS: Session 2 correctly identified as NEW visitor');
    }
    
    console.log('✅ PASS: Sessions are properly isolated\n');
    
    // Test 3: Test session ID entropy (no collisions under load)
    console.log('Test 3: Testing session ID collision resistance...');
    const rapidSessions = [];
    const startTime = Date.now();
    
    // Create 100 sessions rapidly
    for (let i = 0; i < 100; i++) {
      const response = await axios.post(`${BASE_URL}/api/session`);
      rapidSessions.push(response.data.sessionId);
    }
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    const uniqueRapidSessions = new Set(rapidSessions);
    if (uniqueRapidSessions.size !== rapidSessions.length) {
      console.error(`❌ FAIL: Found ${rapidSessions.length - uniqueRapidSessions.size} duplicate session IDs!`);
      return false;
    }
    
    console.log(`✅ PASS: Created 100 unique sessions in ${duration}ms with no collisions\n`);
    
    // Success!
    console.log('🎉 All tests passed! Session isolation is working correctly.');
    return true;
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    if (error.code) {
      console.error('Error code:', error.code);
    }
    console.error('Full error:', error);
    return false;
  }
}

// Run tests
testSessionIsolation().then(success => {
  process.exit(success ? 0 : 1);
});
