const { Pool } = require('pg');
require('dotenv').config();

async function debugCustomerLoan() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('🔍 Debugging loan retrieval for BLANKSON JACOBS EBENEZER\n');
        
        // Find the customer
        const customerSearch = await pool.query(`
            SELECT 
                account_number,
                account_name,
                id as customer_id,
                phone_number
            FROM customers
            WHERE account_name ILIKE '%BLANKSON%' OR account_name ILIKE '%EBENEZER%'
            LIMIT 5
        `);

        console.log(`Found ${customerSearch.rows.length} customers:\n`);
        customerSearch.rows.forEach((c, i) => {
            console.log(`${i + 1}. Account: ${c.account_number}`);
            console.log(`   Name: ${c.account_name}`);
            console.log(`   ID: ${c.customer_id}`);
            console.log(`   Phone: ${c.phone_number}\n`);
        });

        if (customerSearch.rows.length === 0) {
            console.log('❌ Customer not found in database');
            return;
        }

        const customer = customerSearch.rows[0];
        console.log(`\n📋 Checking loans for:`);
        console.log(`   Account: ${customer.account_number}`);
        console.log(`   Customer ID: ${customer.customer_id}\n`);

        // Check for loans using the same query as the code
        const loans = await pool.query(`
            SELECT 
                arrangement,
                product_name,
                commitment,
                principal,
                status,
                account_number,
                customer_id
            FROM historical_loans 
            WHERE account_number = $1 OR customer_id = $2
        `, [customer.account_number, customer.customer_id?.toString()]);

        console.log(`✅ Found ${loans.rows.length} loans\n`);

        if (loans.rows.length === 0) {
            // Check what account_numbers and customer_ids exist in historical_loans
            console.log('🔍 Checking what values exist in historical_loans...\n');
            
            const check1 = await pool.query(`
                SELECT COUNT(*) as count
                FROM historical_loans
                WHERE account_number = $1
            `, [customer.account_number]);
            console.log(`Loans with exact account match: ${check1.rows[0].count}`);

            const check2 = await pool.query(`
                SELECT COUNT(*) as count
                FROM historical_loans
                WHERE customer_id = $1
            `, [customer.customer_id?.toString()]);
            console.log(`Loans with exact customer_id match: ${check2.rows[0].count}`);

            // Check for similar account numbers
            const similar = await pool.query(`
                SELECT DISTINCT account_number
                FROM historical_loans
                WHERE account_number LIKE $1
                LIMIT 5
            `, [`%${customer.account_number.substring(customer.account_number.length - 6)}%`]);
            
            console.log(`\nSimilar account numbers in historical_loans:`);
            similar.rows.forEach(r => console.log(`  - ${r.account_number}`));

            // Check if customer_id format matches
            const customerIdCheck = await pool.query(`
                SELECT DISTINCT customer_id
                FROM historical_loans
                WHERE customer_id IS NOT NULL
                ORDER BY customer_id
                LIMIT 10
            `);
            
            console.log(`\nSample customer_ids in historical_loans:`);
            customerIdCheck.rows.forEach(r => console.log(`  - ${r.customer_id}`));

        } else {
            loans.rows.forEach((loan, i) => {
                console.log(`Loan ${i + 1}:`);
                console.log(`  Arrangement: ${loan.arrangement}`);
                console.log(`  Type: ${loan.product_name}`);
                console.log(`  Commitment: GHS ${parseFloat(loan.commitment || 0).toFixed(2)}`);
                console.log(`  Outstanding: GHS ${parseFloat(loan.principal || 0).toFixed(2)}`);
                console.log(`  Status: ${loan.status}`);
                console.log(`  Matched by account: ${loan.account_number === customer.account_number}`);
                console.log(`  Matched by customer_id: ${loan.customer_id === customer.customer_id?.toString()}`);
                console.log('');
            });
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await pool.end();
    }
}

debugCustomerLoan();
