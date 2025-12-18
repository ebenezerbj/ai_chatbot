// Test the admin account openings endpoint
const fetch = require('node-fetch');

const API_URL = 'http://localhost:4000';

async function testAdminAccountOpenings() {
  console.log('Testing admin account openings endpoint...\n');

  try {
    // First, attempt without auth (should fail)
    console.log('[1] Testing without authentication...');
    const noAuthResp = await fetch(`${API_URL}/api/admin/account-openings`);
    console.log(`Status: ${noAuthResp.status}`);
    const noAuthData = await noAuthResp.json().catch(() => ({}));
    console.log(`Response:`, noAuthData);
    
    if (noAuthResp.status === 401) {
      console.log('✓ Correctly requires authentication\n');
    } else {
      console.log('⚠ Expected 401 but got', noAuthResp.status, '\n');
    }

    // For testing with auth, you would need a valid token
    // console.log('[2] Testing with authentication...');
    // const authResp = await fetch(`${API_URL}/api/admin/account-openings`, {
    //   headers: { 'Authorization': 'Bearer YOUR_TOKEN_HERE' }
    // });
    // console.log(`Status: ${authResp.status}`);
    // const authData = await authResp.json();
    // console.log(`Response:`, authData);

    console.log('\n✓ Admin endpoint test completed');
    console.log('\nNote: To fully test this endpoint, you need to:');
    console.log('1. Login to the admin portal at /admin-portal.html');
    console.log('2. Click on "Account Openings" in the sidebar');
    console.log('3. The table should show the test application we created earlier');

  } catch (error) {
    console.error('✗ Error:', error.message);
    process.exit(1);
  }
}

testAdminAccountOpenings();
