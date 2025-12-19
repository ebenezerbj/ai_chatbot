/**
 * Check what's in the account_openings table on Render
 */

const { Pool } = require('pg');

const RENDER_DATABASE_URL = process.env.RENDER_DATABASE_URL || process.env.DATABASE_URL;

async function checkRecords() {
    console.log('🔍 Checking Account Opening Records on Render\n');

    const pool = new Pool({
        connectionString: RENDER_DATABASE_URL,
        ssl: {
            rejectUnauthorized: false
        }
    });

    try {
        // Count total records
        const count = await pool.query('SELECT COUNT(*) as count FROM account_openings');
        console.log(`📊 Total Records: ${count.rows[0].count}\n`);

        // Get all records
        const records = await pool.query(`
            SELECT 
                id,
                full_name,
                email,
                phone_number,
                account_type,
                initial_deposit,
                status,
                created_at
            FROM account_openings
            ORDER BY created_at DESC
        `);

        if (records.rows.length === 0) {
            console.log('❌ No records found in the table.');
            console.log('');
            console.log('This means:');
            console.log('  1. The earlier submission failed (table didn\'t exist yet)');
            console.log('  2. Or the data wasn\'t saved due to an error');
            console.log('');
            console.log('The table is now ready and working. Please try submitting again.');
        } else {
            console.log('✅ Found records:\n');
            records.rows.forEach((record, idx) => {
                console.log(`${idx + 1}. Application #${record.id}`);
                console.log(`   Name: ${record.full_name}`);
                console.log(`   Email: ${record.email}`);
                console.log(`   Phone: ${record.phone_number}`);
                console.log(`   Account Type: ${record.account_type}`);
                console.log(`   Initial Deposit: GHS ${record.initial_deposit}`);
                console.log(`   Status: ${record.status}`);
                console.log(`   Submitted: ${record.created_at}`);
                console.log('');
            });
        }

    } catch (error) {
        console.error('❌ ERROR:', error.message);
    } finally {
        await pool.end();
    }
}

checkRecords();
