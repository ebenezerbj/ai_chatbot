const http = require('http');

// Test data
const testData = {
  fullName: 'John Mensah',
  phoneNumber: '0244123456',
  nationalIdNumber: 'GHA-123456789-0',
  accountNumber: 'ACC12345',
  branchName: 'Amantin Head Office',
  branchCode: 'GH1510010',
  employerName: 'Ghana Education Service',
  position: 'Senior Teacher',
  employmentType: 'Permanent',
  lengthOfService: '5 years',
  netMonthlySalary: 3000,
  requestedAmount: 6000,
  repaymentMonths: 3,
  salaryAccountConsent: true,
  employerConfirmation: true,
  borrowerDeclaration: true
};

const postData = JSON.stringify(testData);

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

console.log('\n🧪 Testing Salary Overdraft API...\n');
console.log('📤 Sending Request:');
console.log(JSON.stringify(testData, null, 2));
console.log('\n' + '='.repeat(60) + '\n');

const req = http.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log(`📊 Status Code: ${res.statusCode}`);
    console.log('\n📥 Response:');
    
    try {
      const response = JSON.parse(data);
      console.log(JSON.stringify(response, null, 2));
      
      if (res.statusCode === 200 || res.statusCode === 201) {
        console.log('\n✅ SUCCESS: Salary overdraft application submitted!');
        console.log(`\n📝 Application ID: ${response.applicationId}`);
        console.log(`💰 Approved Amount: GHS ${response.approvedAmount.toFixed(2)}`);
        console.log(`📅 Monthly Repayment: GHS ${response.monthlyRepayment.toFixed(2)} × ${testData.repaymentMonths} months`);
      } else {
        console.log('\n❌ ERROR: Application failed');
      }
    } catch (e) {
      console.log(data);
      console.log('\n❌ Failed to parse response');
    }
  });
});

req.on('error', (error) => {
  console.error('\n❌ Request Failed:', error.message);
  console.log('\n💡 Make sure the server is running on http://localhost:4000');
});

req.write(postData);
req.end();
