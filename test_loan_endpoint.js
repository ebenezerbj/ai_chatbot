// Test the loan application endpoint
const fetch = require('node-fetch');

const testPayload = {
  sessionId: 'test_session_123',
  fullName: 'John Doe',
  phoneNumber: '0241234567',
  nationalIdNumber: 'GHA-123456789-0',
  accountNumber: '1001',
  employerName: 'Test Company',
  position: 'Manager',
  employmentType: 'Permanent',
  lengthOfService: '5 years',
  netMonthlySalary: '5000',
  loanAmount: '10000',
  loanPurpose: 'Business',
  loanTenorMonths: '12',
  salaryDeductionConsent: true,
  employerConfirmation: true,
  borrowerDeclaration: true
};

async function testEndpoint() {
  try {
    console.log('Testing loan endpoint with payload:', JSON.stringify(testPayload, null, 2));
    
    const response = await fetch('http://localhost:4000/api/loan-application', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testPayload)
    });

    const data = await response.json();
    
    console.log('\nResponse status:', response.status);
    console.log('Response data:', JSON.stringify(data, null, 2));
    
    if (response.ok) {
      console.log('\n✓ SUCCESS: Loan application endpoint is working!');
    } else {
      console.log('\n✗ FAILED:', data.error || 'Unknown error');
    }
  } catch (error) {
    console.error('\n✗ ERROR:', error.message);
  }
}

testEndpoint();
