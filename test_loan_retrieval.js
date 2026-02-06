const { Pool } = require('pg');
require('dotenv').config();

async function testLoanRetrieval() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('✅ Connected to database\n');
        
        // Get a sample customer account that has loans
        const customerWithLoan = await pool.query(`
            SELECT DISTINCT 
                c.account_number,
                c.account_name,
                c.id as customer_id
            FROM customers c
            INNER JOIN historical_loans hl ON (hl.account_number = c.account_number OR hl.customer_id = c.id::text)
            LIMIT 1
        `);

        if (customerWithLoan.rows.length === 0) {
            console.log('❌ No customers found with loans');
            return;
        }

        const customer = customerWithLoan.rows[0];
        console.log('📋 Testing with customer:');
        console.log(`   Account: ${customer.account_number}`);
        console.log(`   Name: ${customer.account_name}`);
        console.log(`   Customer ID: ${customer.customer_id}\n`);

        // Query loans the same way the updated code does
        const loans = await pool.query(`
            SELECT 
                arrangement as loan_account_number,
                product_name,
                commitment as original_amount,
                principal as outstanding_balance,
                opening_date,
                first_payment_date,
                maturity_date,
                term,
                interest_rate,
                status,
                overdue as arrears_amount,
                currency
            FROM historical_loans 
            WHERE account_number = $1 OR customer_id = $2
            ORDER BY 
                CASE 
                    WHEN status = 'Current' THEN 1
                    WHEN status = 'Delinquent' THEN 2
                    WHEN status = 'Grace' THEN 3
                    WHEN status = 'Non Accrual' THEN 4
                    WHEN status = 'Expired' THEN 5
                    ELSE 6
                END,
                opening_date DESC
        `, [customer.account_number, customer.customer_id.toString()]);

        console.log(`✅ Found ${loans.rows.length} loan(s)\n`);

        loans.rows.forEach((loan, i) => {
            console.log(`Loan ${i + 1}:`);
            console.log(`  Account: ${loan.loan_account_number}`);
            console.log(`  Type: ${loan.product_name}`);
            console.log(`  Original: GHS ${parseFloat(loan.original_amount || 0).toFixed(2)}`);
            console.log(`  Outstanding: GHS ${parseFloat(loan.outstanding_balance || 0).toFixed(2)}`);
            console.log(`  Interest: ${loan.interest_rate}%`);
            console.log(`  Status: ${loan.status}`);
            console.log(`  Term: ${loan.term}`);
            
            if (loan.opening_date) {
                console.log(`  Opened: ${new Date(loan.opening_date).toLocaleDateString('en-GB')}`);
            }
            if (loan.maturity_date) {
                const matDate = new Date(loan.maturity_date);
                const today = new Date();
                const daysRemaining = Math.ceil((matDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                console.log(`  Maturity: ${matDate.toLocaleDateString('en-GB')} (${daysRemaining > 0 ? daysRemaining + ' days remaining' : 'matured'})`);
            }
            
            if (loan.arrears_amount && parseFloat(loan.arrears_amount) > 0) {
                console.log(`  ⚠️ Arrears: GHS ${parseFloat(loan.arrears_amount).toFixed(2)}`);
            }
            
            console.log('');
        });

        console.log('✅ Test successful! Customers can now check their loan balances from historical_loans table.');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await pool.end();
    }
}

testLoanRetrieval();
