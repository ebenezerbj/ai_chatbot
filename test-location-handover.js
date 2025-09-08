// Test location-based handover routing
const fetch = require('node-fetch');

async function testLocationHandover() {
  const baseUrl = 'http://localhost:3000';
  
  try {
    // First create a session
    console.log('Creating session...');
    const sessionRes = await fetch(`${baseUrl}/api/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const sessionData = await sessionRes.json();
    console.log('Session created:', sessionData.sessionId);
    
    // Test 1: Handover with location near Amantin (Head Office)
    console.log('\n--- Test 1: Location near Amantin (Head Office) ---');
    const amantinHandover = await fetch(`${baseUrl}/api/handover`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-admin-token': 'mysecretadmintoken' // for preview
      },
      body: JSON.stringify({
        sessionId: sessionData.sessionId,
        name: 'John Doe',
        phone: '0243082750',
        message: 'I need help with my account near Amantin',
        lat: 7.708,  // Amantin coordinates
        lng: -1.039
      })
    });
    const amantinResult = await amantinHandover.json();
    console.log('Amantin handover result:', JSON.stringify(amantinResult, null, 2));
    
    // Test 2: Handover with location near Yeji
    console.log('\n--- Test 2: Location near Yeji ---');
    const yejiHandover = await fetch(`${baseUrl}/api/handover`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-admin-token': 'mysecretadmintoken'
      },
      body: JSON.stringify({
        sessionId: sessionData.sessionId,
        name: 'Jane Smith',
        phone: '0248862932',
        message: 'Need assistance with loan application',
        lat: 8.154,  // Yeji coordinates
        lng: -0.106
      })
    });
    const yejiResult = await yejiHandover.json();
    console.log('Yeji handover result:', JSON.stringify(yejiResult, null, 2));
    
    // Test 3: Handover without location (global routing)
    console.log('\n--- Test 3: No location (global routing) ---');
    const globalHandover = await fetch(`${baseUrl}/api/handover`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-admin-token': 'mysecretadmintoken'
      },
      body: JSON.stringify({
        sessionId: sessionData.sessionId,
        name: 'Bob Wilson',
        phone: '0246892797',
        message: 'General inquiry about services'
      })
    });
    const globalResult = await globalHandover.json();
    console.log('Global handover result:', JSON.stringify(globalResult, null, 2));
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

testLocationHandover();
