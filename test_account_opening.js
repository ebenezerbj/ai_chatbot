// Test the account opening endpoint
const fetch = require('node-fetch');

const testPayload = {
  sessionId: 'test_session_123',
  fullName: 'Kwame Asante',
  dateOfBirth: '1990-05-15',
  gender: 'Male',
  maritalStatus: 'Single',
  phoneNumber: '0241234567',
  email: 'kwame.asante@example.com',
  residentialAddress: '123 Main Street, Amantin',
  digitalAddress: 'AK-123-4567',
  postalAddress: 'P.O. Box 123, Amantin',
  ghanaCardNumber: 'GHA-123456789-0',
  occupation: 'Teacher',
  employerName: 'Ghana Education Service',
  monthlyIncome: '3500',
  sourceOfFunds: 'Salary',
  accountType: 'Savings',
  modeOfOperation: 'Individual',
  initialDeposit: '100',
  nextOfKinName: 'Ama Asante',
  nextOfKinRelationship: 'Sister',
  nextOfKinPhone: '0243456789',
  specimenSignatureAcknowledged: true,
  customerDeclaration: true,
  termsAccepted: true,
  dataProcessingConsent: true
};

async function testEndpoint() {
  try {
    console.log('Testing account opening endpoint with payload:');
    console.log(JSON.stringify(testPayload, null, 2));
    console.log('\n---\n');
    
    const response = await fetch('http://localhost:4000/api/account-opening', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testPayload)
    });

    const data = await response.json();
    
    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(data, null, 2));
    
    if (response.ok) {
      console.log('\n✓ SUCCESS: Account opening endpoint is working!');
      console.log(`Application ID: ${data.applicationId}`);
    } else {
      console.log('\n✗ FAILED:', data.error || 'Unknown error');
    }
  } catch (error) {
    console.error('\n✗ ERROR:', error.message);
  }
}

testEndpoint();
