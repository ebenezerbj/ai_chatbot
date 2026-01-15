const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes('render.com') ? { rejectUnauthorized: false } : false
});

async function checkBalanceChanges() {
  try {
    console.log('Checking balance update history...\n');
    
    // Check when balances were last updated
    const lastUpdateResult = await pool.query(`
      SELECT 
        COUNT(*) as total_accounts,
        MAX(last_updated) as most_recent_update,
        MIN(last_updated) as oldest_update
      FROM account_balances
    `);
    
    const stats = lastUpdateResult.rows[0];
    console.log('Balance Update Statistics:');
    console.log(`  Total Accounts with Balances: ${stats.total_accounts}`);
    console.log(`  Most Recent Update: ${new Date(stats.most_recent_update).toLocaleString()}`);
    console.log(`  Oldest Update: ${new Date(stats.oldest_update).toLocaleString()}`);
    
    // Check how many accounts were updated today
    const todayUpdatesResult = await pool.query(`
      SELECT COUNT(*) as count 
      FROM account_balances 
      WHERE DATE(last_updated) = CURRENT_DATE
    `);
    console.log(`  Accounts Updated Today: ${todayUpdatesResult.rows[0].count}\n`);
    
    // Sample some recent balance updates
    const recentBalancesResult = await pool.query(`
      SELECT 
        ab.account_number,
        c.account_name,
        ab.ledger_balance,
        ab.available_balance,
        ab.last_updated
      FROM account_balances ab
      LEFT JOIN customers c ON ab.account_number = c.account_number
      ORDER BY ab.last_updated DESC
      LIMIT 10
    `);
    
    console.log('📊 Most Recently Updated Accounts:\n');
    console.log('='.repeat(110));
    recentBalancesResult.rows.forEach(row => {
      console.log(`Account: ${row.account_number} | ${row.account_name || 'N/A'}`);
      console.log(`  Ledger: GHS ${parseFloat(row.ledger_balance).toFixed(2)} | Available: GHS ${parseFloat(row.available_balance).toFixed(2)}`);
      console.log(`  Last Updated: ${new Date(row.last_updated).toLocaleString()}`);
      console.log('-'.repeat(110));
    });
    
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    await pool.end();
    process.exit(1);
  }
}

checkBalanceChanges();
