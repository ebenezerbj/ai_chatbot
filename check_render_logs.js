const axios = require('axios');

async function checkRenderStatus() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('   CHECKING RENDER DEPLOYMENT STATUS');
  console.log('═══════════════════════════════════════════════════════════\n');

  const PRODUCTION_URL = 'https://ai-chatbot-1-a596.onrender.com';

  try {
    // Check health endpoint
    const health = await axios.get(`${PRODUCTION_URL}/health`);
    console.log('✅ Server is online');
    console.log('Health:', health.data);
    console.log('');

    // Check if we can see any version info
    console.log('To check Render deployment:');
    console.log('1. Go to: https://dashboard.render.com/');
    console.log('2. Find your ai-chatbot service');
    console.log('3. Check "Events" tab for deployment status');
    console.log('4. Check "Logs" tab for runtime errors');
    console.log('');
    console.log('Common issues:');
    console.log('- Render may take 2-5 minutes to deploy after git push');
    console.log('- Environment variables must be set in Render dashboard');
    console.log('- SMS_ONLINE_API_KEY must be configured on Render');
    console.log('- ADMIN_ALERT_PHONE must be set to 0243082750');
    console.log('');
    console.log('To force redeploy:');
    console.log('- Go to Render dashboard → Manual Deploy → Deploy latest commit');
    console.log('');

  } catch (error) {
    console.log('❌ Cannot connect to server');
    console.log('Error:', error.message);
  }
}

checkRenderStatus();
