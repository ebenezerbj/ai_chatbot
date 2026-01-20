const axios = require('axios');
require('dotenv').config();

async function testOpenAI() {
  console.log('Testing OpenAI API directly...\n');
  console.log('API Key:', process.env.OPENAI_API_KEY ? 'SET (' + process.env.OPENAI_API_KEY.substring(0, 15) + '...)' : 'NOT SET');
  
  if (!process.env.OPENAI_API_KEY) {
    console.error('ERROR: OPENAI_API_KEY not configured!');
    return;
  }

  try {
    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-3.5-turbo',
      messages: [{
        role: 'user',
        content: 'Say "Hello"'
      }],
      temperature: 0.3,
      max_tokens: 10
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      timeout: 10000
    });

    console.log('\n✅ OpenAI API is working!');
    console.log('Response:', response.data.choices[0].message.content);
    console.log('\nThis means OpenAI is configured correctly locally.');
    console.log('The issue is likely on Render production server.');
    
  } catch (error) {
    console.error('\n❌ OpenAI API Error:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Error:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

testOpenAI();
