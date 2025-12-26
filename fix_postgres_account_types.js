const { Pool } = require('pg');
require('dotenv').config();

async function fixPostgresAccountTypes() {
  // Render requires external database URL with -a.oregon-postgres.render.com
  const databaseUrl = process.env.DATABASE_URL?.replace('dpg-d4u410ali9vc73am148g-a/', 'dpg-d4u410ali9vc73am148g-a.oregon-postgres.render.com/');
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL not found in environment variables');
    process.exit(1);
  }

  console.log('🔗 Connecting to PostgreSQL on Render...');
  console.log('📍 Host:', databaseUrl.match(/@([^/]+)/)?.[1] || 'unknown');
  console.log('');

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {

    // First, check current state
    console.log('📊 Current state BEFORE updates:\n');
    const beforeQuery = `
      SELECT 
        SUBSTRING(account_number, 6, 1) as type_indicator,
        account_type,
        COUNT(*) as count
      FROM customers
      WHERE LENGTH(REPLACE(account_number, 'v', '')) >= 6
      GROUP BY SUBSTRING(account_number, 6, 1), account_type
      ORDER BY type_indicator, count DESC
      LIMIT 20;
    `;
    const beforeResult = await pool.query(beforeQuery);
    console.table(beforeResult.rows);

    // Update Savings Accounts (type indicator = 1)
    console.log('\n🔄 Updating Savings Accounts (position 6 = 1 → account_type = 1850)...');
    const savingsUpdate = await pool.query(`
      UPDATE customers
      SET account_type = '1850'
      WHERE LENGTH(REPLACE(account_number, 'v', '')) >= 6
        AND SUBSTRING(REPLACE(account_number, 'v', ''), 6, 1) = '1'
        AND account_type != '1850';
    `);
    console.log(`✅ Updated ${savingsUpdate.rowCount} savings accounts\n`);

    // Update Current Accounts (type indicator = 2)
    console.log('🔄 Updating Current Accounts (position 6 = 2 → account_type = 1800)...');
    const currentUpdate = await pool.query(`
      UPDATE customers
      SET account_type = '1800'
      WHERE LENGTH(REPLACE(account_number, 'v', '')) >= 6
        AND SUBSTRING(REPLACE(account_number, 'v', ''), 6, 1) = '2'
        AND account_type != '1800';
    `);
    console.log(`✅ Updated ${currentUpdate.rowCount} current accounts\n`);

    // Verify the changes
    console.log('📊 State AFTER updates:\n');
    const afterQuery = `
      SELECT 
        SUBSTRING(account_number, 6, 1) as type_indicator,
        account_type,
        COUNT(*) as count
      FROM customers
      WHERE LENGTH(REPLACE(account_number, 'v', '')) >= 6
      GROUP BY SUBSTRING(account_number, 6, 1), account_type
      ORDER BY type_indicator, count DESC
      LIMIT 20;
    `;
    const afterResult = await pool.query(afterQuery);
    console.table(afterResult.rows);

    // Show the specific accounts that were mentioned
    console.log('\n🔍 Checking specific accounts:\n');
    const specificQuery = `
      SELECT 
        account_number,
        SUBSTRING(REPLACE(account_number, 'v', ''), 6, 1) as type_indicator,
        account_type,
        CASE 
          WHEN SUBSTRING(REPLACE(account_number, 'v', ''), 6, 1) = '1' THEN 'Savings Account'
          WHEN SUBSTRING(REPLACE(account_number, 'v', ''), 6, 1) = '2' THEN 'Current Account'
          ELSE 'Unknown'
        END as derived_type
      FROM customers
      WHERE account_number IN ('1511520000230861', '1511510000230861')
      ORDER BY account_number;
    `;
    const specificResult = await pool.query(specificQuery);
    console.table(specificResult.rows);

    console.log('\n✅ PostgreSQL database update completed successfully!');
    console.log(`📝 Summary:`);
    console.log(`   - Savings accounts fixed: ${savingsUpdate.rowCount}`);
    console.log(`   - Current accounts fixed: ${currentUpdate.rowCount}`);
    console.log(`   - Total accounts updated: ${savingsUpdate.rowCount + currentUpdate.rowCount}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

fixPostgresAccountTypes();
