const http = require('http');

async function login() {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({username: 'admin', password: 'admin123'});
    const options = {
      hostname: 'localhost',
      port: 4000,
      path: '/api/rep/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };
    
    const req = http.request(options, res => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        const result = JSON.parse(body);
        if (result.token) {
          resolve(result.token);
        } else {
          reject(new Error('Login failed'));
        }
      });
    });
    
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function checkEndpoint(token, path, name) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 4000,
      path: path,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    };
    
    http.get(options, res => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        try {
          const result = JSON.parse(body);
          console.log(`\n${name}:`);
          console.log(`  Total: ${result.total || result.items?.length || 0}`);
          console.log(`  Items returned: ${result.items?.length || 0}`);
          if (result.items && result.items.length > 0) {
            console.log(`  First item: ${result.items[0].fullName || result.items[0].full_name || 'N/A'}`);
            console.log(`  Last item: ${result.items[result.items.length-1].fullName || result.items[result.items.length-1].full_name || 'N/A'}`);
          }
          resolve(result);
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

(async () => {
  try {
    console.log('Logging in...');
    const token = await login();
    console.log('Login successful!\n');
    console.log('='.repeat(60));
    
    await checkEndpoint(token, '/api/admin/loan-applications?limit=100', 'LOAN APPLICATIONS');
    await checkEndpoint(token, '/api/admin/salary-overdrafts?limit=100', 'SALARY OVERDRAFTS');
    await checkEndpoint(token, '/api/admin/account-openings?limit=100', 'ACCOUNT OPENINGS');
    
    console.log('\n' + '='.repeat(60));
    console.log('\nSummary: All three endpoints checked successfully!');
    console.log('The CS Rep dashboard should display all these applications.');
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
})();
