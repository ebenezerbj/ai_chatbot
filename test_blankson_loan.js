const { Pool } = require('pg');
require('dotenv').config();

async function testBlankonLoan() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('✅ Testing loan retrieval for BLANKSON JACOBS EBENEZER\n');
        
        const accountNumber = '1511520000230861'; // The repayment account that matches
        
        console.log(`📋 Customer Account: ${accountNumber}\n`);

        // Query using the updated logic (repayment_account)
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
            WHERE repayment_account = $1
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
        `, [accountNumber]);

        console.log(`✅ Found ${loans.rows.length} loan(s)\n`);

        if (loans.rows.length > 0) {
            loans.rows.forEach((loan, i) => {
                // Parse term
                let termMonths = 0;
                if (loan.term) {
                    const termStr = loan.term.toString();
                    if (termStr.endsWith('D')) {
                        const days = parseInt(termStr.replace('D', ''));
                        termMonths = Math.round(days / 30);
                    } else if (termStr.endsWith('M')) {
                        termMonths = parseInt(termStr.replace('M', ''));
                    }
                }
                
                const monthlyInstallment = termMonths > 0 
                    ? parseFloat(loan.outstanding_balance || 0) / termMonths 
                    : 0;

                console.log(`**Loan ${i + 1}:** ${loan.loan_account_number}`);
                console.log(`Type: ${loan.product_name}`);
                console.log(`Original Amount: GHS ${parseFloat(loan.original_amount || 0).toFixed(2)}`);
                console.log(`Outstanding Balance: GHS ${parseFloat(loan.outstanding_balance || 0).toFixed(2)}`);
                
                if (monthlyInstallment > 0) {
                    console.log(`Monthly Payment: GHS ${monthlyInstallment.toFixed(2)}`);
                }
                
                if (loan.interest_rate) {
                    console.log(`Interest Rate: ${loan.interest_rate}% per annum`);
                }
                
                if (loan.maturity_date) {
                    const matDate = new Date(loan.maturity_date);
                    const today = new Date();
                    const daysRemaining = Math.ceil((matDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                    
                    if (daysRemaining > 0) {
                        console.log(`Maturity Date: ${matDate.toLocaleDateString('en-GB')} (${daysRemaining} days remaining)`);
                    } else {
                        console.log(`Maturity Date: ${matDate.toLocaleDateString('en-GB')} (matured ${Math.abs(daysRemaining)} days ago)`);
                    }
                }
                
                console.log(`Duration: ${termMonths} months`);
                console.log(`Status: ${loan.status}`);
                
                if (loan.arrears_amount && parseFloat(loan.arrears_amount) > 0) {
                    console.log(`⚠️ Amount in Arrears: GHS ${parseFloat(loan.arrears_amount).toFixed(2)}`);
                }
                
                console.log('');
            });

            console.log('✅ Success! Customer will now see their loan details.');
        } else {
            console.log('❌ No loans found with this account number.');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await pool.end();
    }
}

testBlankonLoan();
