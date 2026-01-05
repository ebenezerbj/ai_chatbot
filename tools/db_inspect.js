/* Utility script: inspect DB schema for troubleshooting (safe output). */

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require('dotenv').config();
} catch {
  // ignore
}

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { executeQuery, DB_TYPE } = require('../dist/database');

async function main() {
  console.log('DB_TYPE:', DB_TYPE);

  try {
    const columns = await executeQuery(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='intent_classification' ORDER BY ordinal_position"
    );
    console.log('intent_classification columns:');
    console.table(columns);
  } catch (e) {
    console.error('intent_classification columns error:', e?.message || e);
  }

  try {
    const sample = await executeQuery(
      "SELECT * FROM intent_classification ORDER BY timestamp DESC NULLS LAST LIMIT 1"
    );
    console.log('intent_classification sample keys:', Object.keys(sample[0] || {}));
  } catch (e) {
    console.error('intent_classification sample error:', e?.message || e);
  }

  try {
    const chatTables = await executeQuery(
      "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name ILIKE '%chat%' ORDER BY table_name"
    );
    console.log('chat-related tables:');
    console.table(chatTables);
  } catch (e) {
    console.error('chat tables error:', e?.message || e);
  }
}

main().catch((e) => {
  console.error('db_inspect error:', e?.message || e);
  process.exitCode = 1;
});
