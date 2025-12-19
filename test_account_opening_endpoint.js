// Test the account opening endpoint with realistic data
const fetch = require('node-fetch');

async function testAccountOpening() {
  console.log('=== Testing Account Opening Endpoint ===\n');
  
  const testPayload = {
    sessionId: 'test_session_' + Date.now(),
    fullName: 'Kwame Mensah',
    dateOfBirth: '1995-03-15',
    gender: 'Male',
    maritalStatus: 'Single',
    phoneNumber: '0244567890',
    email: 'kwame.mensah@example.com',
    residentialAddress: '45 Independence Avenue, Amantin',
    digitalAddress: 'AK-456-7890',
    postalAddress: 'P.O. Box 456, Amantin',
    ghanaCardNumber: 'GHA-987654321-5',
    occupation: 'Software Developer',
    employerName: 'Tech Solutions Ltd',
    monthlyIncome: '5500',
    sourceOfFunds: 'Salary',
    accountType: 'Savings',
    modeOfOperation: 'Individual',
    initialDeposit: '200',
    nextOfKinName: 'Ama Mensah',
    nextOfKinRelationship: 'Sister',
    nextOfKinPhone: '0245678901',
    specimenSignatureAcknowledged: true,
    customerDeclaration: true,
    termsAccepted: true,
    dataProcessingConsent: true
  };

  try {
    console.log('1. Sending POST request to /api/account-opening...');
    console.log('Payload:', JSON.stringify(testPayload, null, 2));
    console.log('');

    const response = await fetch('http://localhost:4000/api/account-opening', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testPayload)
    });

    console.log('2. Response Status:', response.status, response.statusText);
    
    const data = await response.json().catch(() => ({}));
    console.log('3. Response Data:', JSON.stringify(data, null, 2));
    console.log('');

    if (response.ok && data?.ok) {
      console.log('✓ SUCCESS! Account opening created.');
      console.log('  Application ID:', data.applicationId);
      
      // Verify it was saved
      const { executeQuery } = require('./dist/database');
      const record = await executeQuery(
        'SELECT * FROM account_openings WHERE id = ?',
        [data.applicationId]
      );
      
      if (record.length > 0) {
        console.log('✓ Record verified in database');
        console.log('  Full Name:', record[0].full_name);
        console.log('  Email:', record[0].email);
        console.log('  Phone:', record[0].phone_number);
      }
    } else {
      console.log('✗ FAILED!');
      console.log('Error:', data?.error || 'Unknown error');
    }

  } catch (error) {
    console.error('✗ Request failed:', error.message);
  }
  
  process.exit(0);
}

testAccountOpening();
