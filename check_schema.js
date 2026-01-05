require('dotenv').config();
const { executeQuery } = require('./dist/database');

async function checkSchema() {
  try {
    console.log('\n=== intent_classification columns ===');
    const ic = await executeQuery(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema='public' AND table_name='intent_classification' 
      ORDER BY ordinal_position
    `);
    console.table(ic);
    
    console.log('\n=== chat_sessions columns ===');
    const cs = await executeQuery(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema='public' AND table_name='chat_sessions' 
      ORDER BY ordinal_position
    `);
    console.table(cs);
    
    console.log('\n=== Sample intent_classification row ===');
    const sample = await executeQuery(`SELECT * FROM intent_classification LIMIT 1`);
    console.log(JSON.stringify(sample[0], null, 2));
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkSchema();
