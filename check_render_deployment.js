const axios = require('axios');

async function checkRenderDeployment() {
  const PRODUCTION_URL = 'https://ai-chatbot-1-a596.onrender.com';
  
  console.log('═══════════════════════════════════════════════════════════');
  console.log('   CHECKING RENDER DEPLOYMENT STATUS');
  console.log('═══════════════════════════════════════════════════════════\n');
  console.log('Production URL:', PRODUCTION_URL);
  console.log('');

  try {
    console.log('Checking server health...');
    const response = await axios.get(`${PRODUCTION_URL}/health`, { timeout: 10000 });
    
    console.log('✅ Server is online!\n');
    console.log('Health Check Response:');
    console.log(JSON.stringify(response.data, null, 2));
    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('   READY TO TEST ESCALATION SMS');
    console.log('═══════════════════════════════════════════════════════════\n');
    console.log('Run this command to test:');
    console.log('   node test_live_production.js');
    console.log('');
    
  } catch (error) {
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      console.log('⏳ Server is starting up (Render free tier)...\n');
      console.log('This is normal for Render free tier deployments.');
      console.log('The server will be ready in 30-60 seconds.');
      console.log('');
      console.log('Wait a moment and run this command again:');
      console.log('   node check_render_deployment.js');
    } else if (error.response) {
      console.log('⚠️  Server responded but with an error:\n');
      console.log('Status:', error.response.status);
      console.log('Data:', error.response.data);
    } else {
      console.log('❌ Cannot connect to server\n');
      console.log('Error:', error.message);
      console.log('');
      console.log('Possible reasons:');
      console.log('1. Deployment is still in progress');
      console.log('2. Server is starting up (cold start)');
      console.log('3. Network issue');
      console.log('');
      console.log('Check deployment status at:');
      console.log('https://dashboard.render.com/');
    }
    console.log('');
  }
}

checkRenderDeployment();
