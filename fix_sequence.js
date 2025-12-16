/**
 * Fix PostgreSQL customer ID sequence
 * This fixes the issue where the auto-increment ID conflicts with existing records
 */

const { Pool } = require('pg');

const RENDER_DATABASE_URL = process.env.RENDER_DATABASE_URL || 'postgresql://akcb_bank_user:IlcndVR943byznoByTRzN1zBQS3gB9lI@dpg-d4u410ali9vc73am148g-a.oregon-postgres.render.com/akcb_bank';

async function fixSequence() {
    console.log('🔧 Connecting to Render PostgreSQL database...\n');

    const pool = new Pool({
        connectionString: RENDER_DATABASE_URL,
        ssl: {
            rejectUnauthorized: false
        }
    });

    try {
        await pool.query('SELECT NOW()');
        console.log('✅ Connected successfully!\n');

        // Get the maximum ID currently in the customers table
        console.log('📊 Checking current maximum customer ID...');
        const maxIdResult = await pool.query('SELECT MAX(id) as max_id FROM customers');
        const maxId = maxIdResult.rows[0].max_id || 0;
        console.log(`   Current max ID: ${maxId}\n`);

        // Reset the sequence to start from max_id + 1
        const newSequenceValue = maxId + 1;
        console.log(`🔄 Resetting sequence to start from: ${newSequenceValue}`);
        
        await pool.query(`SELECT setval('customers_id_seq', $1, false)`, [newSequenceValue]);
        
        console.log('✅ Sequence reset successfully!\n');

        // Verify the sequence
        const seqResult = await pool.query(`SELECT last_value FROM customers_id_seq`);
        console.log(`📊 Sequence verification:`);
        console.log(`   Next ID will be: ${seqResult.rows[0].last_value}\n`);

        console.log('✨ All done! You can now retry the balance upload.');

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('\nFull error:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

fixSequence().catch(console.error);
