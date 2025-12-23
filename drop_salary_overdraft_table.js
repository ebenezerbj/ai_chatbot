const { executeQuery, testConnection } = require('./dist/database');

(async () => {
  const connected = await testConnection();
  if (!connected) {
    console.error('Database connection failed');
    process.exit(1);
  }

  console.log('Dropping salary_overdrafts table...');
  await executeQuery('DROP TABLE IF EXISTS salary_overdrafts', []);
  console.log('✓ Table dropped successfully');
  console.log('Restart the server to recreate table with branch fields');
})();
