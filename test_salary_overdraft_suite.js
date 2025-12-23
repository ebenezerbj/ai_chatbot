const http = require('http');

// Color codes for terminal output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m'
};

function makeRequest(data, testName) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    const options = {
      hostname: 'localhost',
      port: 4000,
      path: '/api/salary-overdraft',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => { responseData += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(responseData) });
        } catch (e) {
          resolve({ status: res.statusCode, data: responseData });
        }
      });
    });

    req.on('error', (error) => reject(error));
    req.write(postData);
    req.end();
  });
}

async function runTests() {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`${colors.cyan}🧪 SALARY OVERDRAFT COMPREHENSIVE TEST SUITE${colors.reset}`);
  console.log(`${'='.repeat(70)}\n`);

  let passed = 0;
  let failed = 0;

  // Test 1: Valid application
  console.log(`${colors.blue}TEST 1: Valid Salary Overdraft Application${colors.reset}`);
  try {
    const result = await makeRequest({
      fullName: 'Jane Doe',
      phoneNumber: '0244987654',
      nationalIdNumber: 'GHA-987654321-0',
      accountNumber: 'ACC67890',
      branchName: 'Atebubu Branch',
      branchCode: 'GH1510013',
      employerName: 'Ministry of Health',
      position: 'Registered Nurse',
      employmentType: 'Permanent',
      lengthOfService: '8 years',
      netMonthlySalary: 4500,
      requestedAmount: 10000,
      repaymentMonths: 6,
      salaryAccountConsent: true,
      employerConfirmation: true,
      borrowerDeclaration: true
    }, 'Valid Application');
    
    if (result.status === 200 && result.data.ok) {
      console.log(`${colors.green}✅ PASSED${colors.reset}`);
      console.log(`   Application ID: ${result.data.applicationId}`);
      console.log(`   Approved Amount: GHS ${result.data.approvedAmount} (Max 3x salary: GHS 13,500)`);
      console.log(`   Monthly Repayment: GHS ${result.data.monthlyRepayment}\n`);
      passed++;
    } else {
      console.log(`${colors.red}❌ FAILED${colors.reset}`);
      console.log(`   Status: ${result.status}, Response: ${JSON.stringify(result.data)}\n`);
      failed++;
    }
  } catch (error) {
    console.log(`${colors.red}❌ FAILED - ${error.message}${colors.reset}\n`);
    failed++;
  }

  // Test 2: Requested amount exceeds 3x salary
  console.log(`${colors.blue}TEST 2: Amount Exceeds 3x Salary Limit${colors.reset}`);
  try {
    const result = await makeRequest({
      fullName: 'Kofi Mensah',
      phoneNumber: '0244111222',
      nationalIdNumber: 'GHA-111222333-0',
      accountNumber: 'ACC11122',
      branchName: 'Yeji Branch',
      branchCode: 'GH1510014',
      employerName: 'Ghana Water Company',
      position: 'Engineer',
      employmentType: 'Permanent',
      lengthOfService: '4 years',
      netMonthlySalary: 2500,
      requestedAmount: 10000, // Exceeds 3x2500 = 7500
      repaymentMonths: 4,
      salaryAccountConsent: true,
      employerConfirmation: true,
      borrowerDeclaration: true
    }, 'Amount Exceeds Limit');
    
    if (result.status === 200 && result.data.approvedAmount === 7500) {
      console.log(`${colors.green}✅ PASSED${colors.reset}`);
      console.log(`   System correctly capped at 3x salary: GHS ${result.data.approvedAmount}`);
      console.log(`   (Requested: GHS 10,000, Max allowed: GHS 7,500)\n`);
      passed++;
    } else {
      console.log(`${colors.red}❌ FAILED${colors.reset}`);
      console.log(`   Expected approved amount: GHS 7500, Got: GHS ${result.data.approvedAmount}\n`);
      failed++;
    }
  } catch (error) {
    console.log(`${colors.red}❌ FAILED - ${error.message}${colors.reset}\n`);
    failed++;
  }

  // Test 3: Missing required fields
  console.log(`${colors.blue}TEST 3: Missing Required Fields (Validation)${colors.reset}`);
  try {
    const result = await makeRequest({
      fullName: 'Ama Yeboah',
      phoneNumber: '0244333444',
      // Missing nationalIdNumber
      accountNumber: 'ACC33344',
      branchName: 'Ahwiaa Branch',
      branchCode: 'GH1510016',
      employerName: 'Ghana Education Service',
      position: 'Teacher',
      employmentType: 'Contract',
      lengthOfService: '2 years',
      netMonthlySalary: 1800,
      requestedAmount: 3000,
      repaymentMonths: 3,
      salaryAccountConsent: true,
      employerConfirmation: true,
      borrowerDeclaration: true
    }, 'Missing Fields');
    
    if (result.status === 400 && !result.data.ok) {
      console.log(`${colors.green}✅ PASSED${colors.reset}`);
      console.log(`   Validation correctly rejected: ${result.data.error}\n`);
      passed++;
    } else {
      console.log(`${colors.red}❌ FAILED${colors.reset}`);
      console.log(`   Expected status 400, Got: ${result.status}\n`);
      failed++;
    }
  } catch (error) {
    console.log(`${colors.red}❌ FAILED - ${error.message}${colors.reset}\n`);
    failed++;
  }

  // Test 4: Missing consent checkboxes
  console.log(`${colors.blue}TEST 4: Missing Consent Checkboxes${colors.reset}`);
  try {
    const result = await makeRequest({
      fullName: 'Kwame Asante',
      phoneNumber: '0244555666',
      nationalIdNumber: 'GHA-555666777-0',
      accountNumber: 'ACC55566',
      branchName: 'Ejura Branch',
      branchCode: 'GH1510011',
      employerName: 'Cocoa Board',
      position: 'Officer',
      employmentType: 'Permanent',
      lengthOfService: '6 years',
      netMonthlySalary: 3200,
      requestedAmount: 5000,
      repaymentMonths: 5,
      salaryAccountConsent: true,
      employerConfirmation: false, // Missing consent
      borrowerDeclaration: true
    }, 'Missing Consent');
    
    if (result.status === 400 && !result.data.ok) {
      console.log(`${colors.green}✅ PASSED${colors.reset}`);
      console.log(`   Validation correctly rejected: ${result.data.error}\n`);
      passed++;
    } else {
      console.log(`${colors.red}❌ FAILED${colors.reset}`);
      console.log(`   Expected status 400, Got: ${result.status}\n`);
      failed++;
    }
  } catch (error) {
    console.log(`${colors.red}❌ FAILED - ${error.message}${colors.reset}\n`);
    failed++;
  }

  // Test 5: Branch selection validation
  console.log(`${colors.blue}TEST 5: Valid Branch Selection${colors.reset}`);
  try {
    const result = await makeRequest({
      fullName: 'Abena Owusu',
      phoneNumber: '0244777888',
      nationalIdNumber: 'GHA-777888999-0',
      accountNumber: 'ACC77788',
      branchName: 'Kejetia Mobilization Center',
      branchCode: 'GH1510018',
      employerName: 'Ghana Ports Authority',
      position: 'Administrator',
      employmentType: 'Permanent',
      lengthOfService: '3 years',
      netMonthlySalary: 2800,
      requestedAmount: 4000,
      repaymentMonths: 2,
      salaryAccountConsent: true,
      employerConfirmation: true,
      borrowerDeclaration: true
    }, 'Branch Selection');
    
    if (result.status === 200 && result.data.ok) {
      console.log(`${colors.green}✅ PASSED${colors.reset}`);
      console.log(`   Branch: Kejetia Mobilization Center (GH1510018)`);
      console.log(`   Application ID: ${result.data.applicationId}\n`);
      passed++;
    } else {
      console.log(`${colors.red}❌ FAILED${colors.reset}`);
      console.log(`   Status: ${result.status}, Response: ${JSON.stringify(result.data)}\n`);
      failed++;
    }
  } catch (error) {
    console.log(`${colors.red}❌ FAILED - ${error.message}${colors.reset}\n`);
    failed++;
  }

  // Test 6: Short repayment period (1 month)
  console.log(`${colors.blue}TEST 6: Minimum Repayment Period (1 month)${colors.reset}`);
  try {
    const result = await makeRequest({
      fullName: 'Yaw Boateng',
      phoneNumber: '0244999000',
      nationalIdNumber: 'GHA-999000111-0',
      accountNumber: 'ACC99900',
      branchName: 'Amantin Head Office',
      branchCode: 'GH1510010',
      employerName: 'GCB Bank',
      position: 'Branch Manager',
      employmentType: 'Permanent',
      lengthOfService: '10 years',
      netMonthlySalary: 5000,
      requestedAmount: 5000,
      repaymentMonths: 1,
      salaryAccountConsent: true,
      employerConfirmation: true,
      borrowerDeclaration: true
    }, 'One Month Repayment');
    
    if (result.status === 200 && result.data.monthlyRepayment === 5000) {
      console.log(`${colors.green}✅ PASSED${colors.reset}`);
      console.log(`   Monthly repayment correctly calculated: GHS ${result.data.monthlyRepayment}`);
      console.log(`   (Full amount due in 1 month)\n`);
      passed++;
    } else {
      console.log(`${colors.red}❌ FAILED${colors.reset}`);
      console.log(`   Expected monthly payment: GHS 5000, Got: GHS ${result.data.monthlyRepayment}\n`);
      failed++;
    }
  } catch (error) {
    console.log(`${colors.red}❌ FAILED - ${error.message}${colors.reset}\n`);
    failed++;
  }

  // Test 7: Maximum repayment period (6 months)
  console.log(`${colors.blue}TEST 7: Maximum Repayment Period (6 months)${colors.reset}`);
  try {
    const result = await makeRequest({
      fullName: 'Akosua Frimpong',
      phoneNumber: '0244121212',
      nationalIdNumber: 'GHA-121212131-0',
      accountNumber: 'ACC12121',
      branchName: 'Kwame Danso Branch',
      branchCode: 'GH1510012',
      employerName: 'MTN Ghana',
      position: 'Customer Service Rep',
      employmentType: 'Permanent',
      lengthOfService: '5 years',
      netMonthlySalary: 3600,
      requestedAmount: 10800, // Exactly 3x salary
      repaymentMonths: 6,
      salaryAccountConsent: true,
      employerConfirmation: true,
      borrowerDeclaration: true
    }, 'Six Months Repayment');
    
    if (result.status === 200 && result.data.approvedAmount === 10800 && result.data.monthlyRepayment === 1800) {
      console.log(`${colors.green}✅ PASSED${colors.reset}`);
      console.log(`   Approved amount: GHS ${result.data.approvedAmount} (Exactly 3x salary)`);
      console.log(`   Monthly repayment: GHS ${result.data.monthlyRepayment} × 6 months\n`);
      passed++;
    } else {
      console.log(`${colors.red}❌ FAILED${colors.reset}`);
      console.log(`   Expected: GHS 10800 approved, GHS 1800/month`);
      console.log(`   Got: GHS ${result.data.approvedAmount} approved, GHS ${result.data.monthlyRepayment}/month\n`);
      failed++;
    }
  } catch (error) {
    console.log(`${colors.red}❌ FAILED - ${error.message}${colors.reset}\n`);
    failed++;
  }

  // Summary
  console.log(`\n${'='.repeat(70)}`);
  console.log(`${colors.cyan}📊 TEST SUMMARY${colors.reset}`);
  console.log(`${'='.repeat(70)}`);
  console.log(`${colors.green}✅ Passed: ${passed}${colors.reset}`);
  console.log(`${colors.red}❌ Failed: ${failed}${colors.reset}`);
  console.log(`📈 Total: ${passed + failed}`);
  console.log(`🎯 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
  console.log(`${'='.repeat(70)}\n`);

  if (failed === 0) {
    console.log(`${colors.green}🎉 ALL TESTS PASSED! Salary overdraft system is working perfectly!${colors.reset}\n`);
  } else {
    console.log(`${colors.yellow}⚠️  Some tests failed. Please review the errors above.${colors.reset}\n`);
  }
}

// Run the tests
console.log(`${colors.cyan}Starting test suite...${colors.reset}`);
runTests().catch(error => {
  console.error(`${colors.red}Test suite failed:${colors.reset}`, error);
  process.exit(1);
});
