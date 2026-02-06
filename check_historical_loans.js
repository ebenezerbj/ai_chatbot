const { Pool } = require('pg');
require('dotenv').config();

async function checkHistoricalLoans() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('✅ Connected to database\n');

        // Get table structure
        const structure = await pool.query(`
            SELECT column_name, data_type, character_maximum_length
            FROM information_schema.columns
            WHERE table_name = 'historical_loans'
            ORDER BY ordinal_position
        `);

        console.log('📋 Historical Loans Table Structure:');
        console.log('═'.repeat(80));
        structure.rows.forEach(col => {
            const length = col.character_maximum_length ? `(${col.character_maximum_length})` : '';
            console.log(`  ${col.column_name.padEnd(35)} ${col.data_type}${length}`);
        });
        console.log('═'.repeat(80));

        // Get sample records
        const sample = await pool.query('SELECT * FROM historical_loans LIMIT 3');
        
        console.log('\n📝 Sample Records:\n');
        sample.rows.forEach((loan, i) => {
            console.log(`Record ${i + 1}:`);
            Object.keys(loan).forEach(key => {
                const value = loan[key];
                if (value !== null && value !== '') {
                    console.log(`  ${key}: ${value}`);
                }
            });
            console.log('');
        });

        // Get count by status
        const statusCount = await pool.query(`
            SELECT 
                COALESCE(status, 'NULL') as status,
                COUNT(*) as count
            FROM historical_loans
            GROUP BY status
            ORDER BY count DESC
        `);

        console.log('📊 Loans by Status:');
        statusCount.rows.forEach(row => {
            console.log(`  ${row.status}: ${row.count}`);
        });

        // Total stats
        const stats = await pool.query(`
            SELECT 
                COUNT(*) as total_loans,
                SUM(principal) as total_outstanding,
                SUM(overdue) as total_overdue,
                COUNT(CASE WHEN status = 'Current' THEN 1 END) as current_loans,
                COUNT(CASE WHEN overdue > 0 THEN 1 END) as loans_in_arrears
            FROM historical_loans
        `);

        console.log('\n📊 Overall Statistics:');
        const s = stats.rows[0];
        console.log(`  Total Loans: ${s.total_loans}`);
        console.log(`  Total Outstanding: GHS ${parseFloat(s.total_outstanding || 0).toFixed(2)}`);
        console.log(`  Total Overdue: GHS ${parseFloat(s.total_overdue || 0).toFixed(2)}`);
        console.log(`  Current Loans: ${s.current_loans}`);
        console.log(`  Loans in Arrears: ${s.loans_in_arrears}`);

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await pool.end();
    }
}

checkHistoricalLoans();
