const mysql = require('mysql2/promise');

async function verifyDatabase() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'akcb_bank'
    });

    console.log('\n🔍 Verifying Salary Overdraft Records in Database\n');
    console.log('='.repeat(100) + '\n');

    // Get all salary overdraft applications
    const [rows] = await connection.execute(
      `SELECT id, full_name, account_number, branch_name, branch_code, 
              employer_name, position, net_monthly_salary, requested_amount, 
              approved_amount, repayment_months, monthly_repayment, status, 
              created_at 
       FROM salary_overdrafts 
       ORDER BY id DESC 
       LIMIT 10`
    );

    if (rows.length === 0) {
      console.log('⚠️  No records found in database\n');
    } else {
      console.log(`✅ Found ${rows.length} salary overdraft applications:\n`);
      
      rows.forEach((row, index) => {
        console.log(`📋 Application #${row.id}`);
        console.log(`   👤 Name: ${row.full_name}`);
        console.log(`   🏦 Account: ${row.account_number}`);
        console.log(`   🏢 Branch: ${row.branch_name} (${row.branch_code})`);
        console.log(`   💼 Employer: ${row.employer_name} - ${row.position}`);
        console.log(`   💰 Salary: GHS ${Number(row.net_monthly_salary).toFixed(2)}/month`);
        console.log(`   📊 Requested: GHS ${Number(row.requested_amount).toFixed(2)}`);
        console.log(`   ✅ Approved: GHS ${Number(row.approved_amount).toFixed(2)}`);
        console.log(`   📅 Repayment: GHS ${Number(row.monthly_repayment).toFixed(2)} × ${row.repayment_months} months`);
        console.log(`   📌 Status: ${row.status}`);
        console.log(`   🕐 Created: ${row.created_at}`);
        console.log('');
      });

      // Get summary statistics
      const [stats] = await connection.execute(
        `SELECT 
          COUNT(*) as total_applications,
          SUM(requested_amount) as total_requested,
          SUM(approved_amount) as total_approved,
          AVG(net_monthly_salary) as avg_salary,
          AVG(approved_amount) as avg_approved
         FROM salary_overdrafts`
      );

      console.log('='.repeat(100));
      console.log('📊 SUMMARY STATISTICS');
      console.log('='.repeat(100));
      console.log(`   Total Applications: ${stats[0].total_applications}`);
      console.log(`   Total Requested: GHS ${Number(stats[0].total_requested).toFixed(2)}`);
      console.log(`   Total Approved: GHS ${Number(stats[0].total_approved).toFixed(2)}`);
      console.log(`   Average Salary: GHS ${Number(stats[0].avg_salary).toFixed(2)}`);
      console.log(`   Average Approved Amount: GHS ${Number(stats[0].avg_approved).toFixed(2)}`);
      console.log('='.repeat(100) + '\n');

      // Verify 3x salary rule
      console.log('🔐 VERIFICATION: 3x Salary Rule');
      console.log('='.repeat(100));
      const [violations] = await connection.execute(
        `SELECT id, full_name, net_monthly_salary, approved_amount
         FROM salary_overdrafts
         WHERE approved_amount > (net_monthly_salary * 3)`
      );
      
      if (violations.length === 0) {
        console.log('✅ All applications comply with 3x salary limit rule');
      } else {
        console.log(`⚠️  Found ${violations.length} violations of 3x salary rule:`);
        violations.forEach(v => {
          console.log(`   - ${v.full_name}: Approved GHS ${v.approved_amount}, Salary GHS ${v.net_monthly_salary} (Max: ${v.net_monthly_salary * 3})`);
        });
      }
      console.log('='.repeat(100) + '\n');
    }

    await connection.end();
    console.log('✅ Database verification complete!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

verifyDatabase();
