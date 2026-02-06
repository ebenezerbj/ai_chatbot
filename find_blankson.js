const { Pool } = require('pg');
require('dotenv').config();

async function findBlankson() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        // Search for BLANKSON
        const customer = await pool.query(`
            SELECT 
                account_number,
                account_name,
                id as customer_id,
                phone_number
            FROM customers
            WHERE account_name ILIKE '%BLANKSON%'
            LIMIT 10
        `);

        console.log(`Found ${customer.rows.length} customers with "BLANKSON":\n`);
        customer.rows.forEach((c, i) => {
            console.log(`${i + 1}. Account: ${c.account_number}`);
            console.log(`   Name: ${c.account_name}`);
            console.log(`   ID: ${c.customer_id}`);
            console.log(`   Phone: ${c.phone_number}\n`);
        });

        // Also search in historical_loans for BLANKSON
        const loansSearch = await pool.query(`
            SELECT 
                arrangement,
                customer_name,
                customer_id,
                account_number,
                product_name,
                principal,
                status
            FROM historical_loans
            WHERE customer_name ILIKE '%BLANKSON%'
            LIMIT 10
        `);

        console.log(`\nFound ${loansSearch.rows.length} loans with "BLANKSON" in historical_loans:\n`);
        loansSearch.rows.forEach((loan, i) => {
            console.log(`${i + 1}. Name: ${loan.customer_name}`);
            console.log(`   Account: ${loan.account_number}`);
            console.log(`   Customer ID: ${loan.customer_id}`);
            console.log(`   Loan: ${loan.arrangement}`);
            console.log(`   Type: ${loan.product_name}`);
            console.log(`   Balance: GHS ${parseFloat(loan.principal || 0).toFixed(2)}`);
            console.log(`   Status: ${loan.status}\n`);
        });

        // Check how many customers have matching loans
        const matchStats = await pool.query(`
            SELECT 
                COUNT(DISTINCT c.id) as customers_with_accounts,
                COUNT(DISTINCT hl.customer_id) as unique_customer_ids_in_loans,
                COUNT(*) as total_customers
            FROM customers c
            LEFT JOIN historical_loans hl ON (c.account_number = hl.account_number OR c.id::text = hl.customer_id)
        `);

        console.log('\n📊 Matching Statistics:');
        console.log(`   Total customers: ${matchStats.rows[0].total_customers}`);
        console.log(`   Customers with matched loans: ${matchStats.rows[0].customers_with_accounts}`);
        console.log(`   Unique customer IDs in loans: ${matchStats.rows[0].unique_customer_ids_in_loans}`);

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await pool.end();
    }
}

findBlankson();
