const { Pool } = require('pg');
require('dotenv').config();

async function analyzeMatching() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('🔍 Analyzing data matching between customers and historical_loans\n');
        
        // Check the BLANKSON loan details
        const loan = await pool.query(`
            SELECT 
                arrangement,
                customer_name,
                customer_id,
                account_number,
                repayment_account,
                product_name,
                principal,
                status
            FROM historical_loans
            WHERE customer_name ILIKE '%BLANKSON%JACOBS%EBENEZER%'
        `);

        console.log('📋 Loan Details:');
        const l = loan.rows[0];
        console.log(`   Loan Account: ${l.arrangement}`);
        console.log(`   Customer Name: ${l.customer_name}`);
        console.log(`   Customer ID in loans: ${l.customer_id}`);
        console.log(`   Account Number in loans: ${l.account_number}`);
        console.log(`   Repayment Account: ${l.repayment_account}`);
        console.log(`   Type: ${l.product_name}`);
        console.log(`   Balance: GHS ${parseFloat(l.principal).toFixed(2)}\n`);

        // Check if repayment_account matches any customer accounts
        const repaymentMatch = await pool.query(`
            SELECT 
                account_number,
                account_name,
                id,
                phone_number
            FROM customers
            WHERE account_number = $1
        `, [l.repayment_account]);

        console.log('🔍 Repayment Account Match:');
        if (repaymentMatch.rows.length > 0) {
            const c = repaymentMatch.rows[0];
            console.log(`   ✅ FOUND in customers table!`);
            console.log(`   Account: ${c.account_number}`);
            console.log(`   Name: ${c.account_name}`);
            console.log(`   ID: ${c.id}`);
            console.log(`   Phone: ${c.phone_number}\n`);
        } else {
            console.log(`   ❌ No match found\n`);
        }

        // Check how many loans can be matched by repayment_account
        const matchByRepayment = await pool.query(`
            SELECT COUNT(*) as count
            FROM historical_loans hl
            INNER JOIN customers c ON c.account_number = hl.repayment_account
        `);

        const matchByAccount = await pool.query(`
            SELECT COUNT(*) as count
            FROM historical_loans hl
            INNER JOIN customers c ON c.account_number = hl.account_number
        `);

        const matchByCustomerId = await pool.query(`
            SELECT COUNT(*) as count
            FROM historical_loans hl
            INNER JOIN customers c ON c.id::text = hl.customer_id
        `);

        console.log('📊 Matching Statistics:');
        console.log(`   Total loans: 4585`);
        console.log(`   Loans matched by repayment_account: ${matchByRepayment.rows[0].count}`);
        console.log(`   Loans matched by account_number: ${matchByAccount.rows[0].count}`);
        console.log(`   Loans matched by customer_id: ${matchByCustomerId.rows[0].count}\n`);

        console.log('💡 Solution: Use repayment_account to match loans!');

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error.stack);
    } finally {
        await pool.end();
    }
}

analyzeMatching();
