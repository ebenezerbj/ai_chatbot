const { Pool } = require('pg');
require('dotenv').config();

async function checkLoanTables() {
    let pool;
    try {
        // Use DATABASE_URL from environment (Render PostgreSQL)
        const dbUrl = process.env.DATABASE_URL;
        
        if (!dbUrl) {
            console.log('❌ DATABASE_URL not found in environment');
            console.log('   Using local MySQL instead...\n');
            
            // Fallback to MySQL
            const mysql = require('mysql2/promise');
            const connection = await mysql.createConnection({
                host: 'localhost',
                user: 'root',
                password: '',
                database: 'akcb_bank'
            });
            
            console.log('✅ Connected to MySQL database\n');
            
            // Check MySQL tables
            const [tables] = await connection.query("SHOW TABLES LIKE 'loans'");
            if (tables.length === 0) {
                console.log('❌ Loans table does NOT exist in MySQL');
            } else {
                console.log('✅ Loans table EXISTS in MySQL');
                const [count] = await connection.query('SELECT COUNT(*) as total FROM loans');
                console.log(`   Total loan records: ${count[0].total}`);
            }
            
            await connection.end();
            return;
        }
        
        // PostgreSQL connection
        pool = new Pool({
            connectionString: dbUrl,
            ssl: { rejectUnauthorized: false }
        });

        console.log('✅ Connected to PostgreSQL database (Render)\n');

        // Check if loans table exists
        const tableCheck = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'loans'
            ) as exists
        `);
        
        if (!tableCheck.rows[0].exists) {
            console.log('❌ Loans table does NOT exist');
            console.log('\n📋 To create the loans table, run:');
            console.log('   node setup_render_loans.js');
        } else {
            console.log('✅ Loans table EXISTS\n');
            
            // Get table structure
            const structure = await pool.query(`
                SELECT column_name, data_type, character_maximum_length, is_nullable
                FROM information_schema.columns
                WHERE table_name = 'loans'
                ORDER BY ordinal_position
            `);
            
            console.log('📋 Loans Table Structure:');
            console.log('─'.repeat(80));
            structure.rows.forEach(col => {
                const length = col.character_maximum_length ? `(${col.character_maximum_length})` : '';
                const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
                console.log(`  ${col.column_name.padEnd(30)} ${(col.data_type + length).padEnd(20)} ${nullable}`);
            });
            console.log('─'.repeat(80));
            
            // Count records
            const count = await pool.query('SELECT COUNT(*) as total FROM loans');
            console.log(`\n📊 Total loan records: ${count.rows[0].total}`);
            
            if (parseInt(count.rows[0].total) > 0) {
                // Show sample records
                const sample = await pool.query('SELECT * FROM loans LIMIT 3');
                console.log('\n📝 Sample loan records:\n');
                sample.rows.forEach((loan, i) => {
                    console.log(`${i + 1}. Account: ${loan.facility_account_number}`);
                    console.log(`   Customer: ${loan.customer_name} (${loan.phone_number})`);
                    console.log(`   Amount: GHS ${parseFloat(loan.facility_amount || 0).toFixed(2)}`);
                    console.log(`   Balance: GHS ${parseFloat(loan.current_balance || 0).toFixed(2)}`);
                    console.log(`   Status: ${loan.facility_status_code}`);
                    console.log('');
                });
            }
        }

        // Check if loan_applications table exists
        const loanAppCheck = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'loan_applications'
            ) as exists
        `);
        
        if (!loanAppCheck.rows[0].exists) {
            console.log('❌ Loan_applications table does NOT exist');
        } else {
            console.log('✅ Loan_applications table EXISTS');
            
            const appCount = await pool.query('SELECT COUNT(*) as total FROM loan_applications');
            console.log(`   Total loan applications: ${appCount.rows[0].total}`);
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        if (pool) {
            await pool.end();
        }
    }
}

checkLoanTables();
