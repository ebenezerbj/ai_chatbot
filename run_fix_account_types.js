const mysql = require('mysql2/promise');
const fs = require('fs');

(async () => {
  try {
    const conn = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'akcb_bank',
      multipleStatements: true
    });

    const sql = fs.readFileSync('fix_account_types.sql', 'utf-8');
    const [results] = await conn.query(sql);

    console.log('=== DATABASE UPDATE RESULTS ===\n');
    
    results.forEach((result, i) => {
      if (result && result.length) {
        console.log(`\nQuery ${i + 1} results:`);
        console.table(result);
      } else if (result.affectedRows !== undefined) {
        console.log(`\nQuery ${i + 1}: ${result.affectedRows} rows affected`);
      }
    });

    await conn.end();
    console.log('\n✅ Database update completed successfully');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
