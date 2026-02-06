/**
 * Setup Loans Table
 * Creates the loans table in the database (works for both MySQL and PostgreSQL)
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function setupLoansTable() {
    const dbUrl = process.env.DATABASE_URL;
    
    if (!dbUrl) {
        console.log('❌ DATABASE_URL not found in .env file');
        console.log('   Please ensure DATABASE_URL is configured.');
        process.exit(1);
    }

    console.log('🔧 Connecting to PostgreSQL database...\n');

    const pool = new Pool({
        connectionString: dbUrl,
        ssl: { rejectUnauthorized: false }
    });

    try {
        // Test connection
        const result = await pool.query('SELECT NOW()');
        console.log('✅ Connected to database successfully!');
        console.log('📅 Server time:', result.rows[0].now);
        console.log('');

        // Read the PostgreSQL schema
        const schemaSQL = fs.readFileSync(
            path.join(__dirname, 'database', 'schema_loans.postgres.sql'), 
            'utf8'
        );
        
        console.log('📝 Creating loans table and indexes...\n');
        
        // Execute the schema
        await pool.query(schemaSQL);
        
        console.log('✅ Loans table created successfully!\n');

        // Verify table exists
        const tableCheck = await pool.query(`
            SELECT column_name, data_type, character_maximum_length 
            FROM information_schema.columns 
            WHERE table_name = 'loans' 
            ORDER BY ordinal_position
        `);
        
        console.log('📋 Loans table structure:');
        console.log('─'.repeat(70));
        tableCheck.rows.forEach(col => {
            const length = col.character_maximum_length ? `(${col.character_maximum_length})` : '';
            console.log(`  ${col.column_name.padEnd(30)} ${col.data_type}${length}`);
        });
        console.log('─'.repeat(70));
        console.log('');

        // Check indexes
        const indexCheck = await pool.query(`
            SELECT indexname 
            FROM pg_indexes 
            WHERE tablename = 'loans'
        `);
        
        console.log('🔍 Indexes created:');
        indexCheck.rows.forEach(idx => {
            console.log(`  ✓ ${idx.indexname}`);
        });
        console.log('');

        // Check trigger
        const triggerCheck = await pool.query(`
            SELECT trigger_name 
            FROM information_schema.triggers 
            WHERE event_object_table = 'loans'
        `);
        
        if (triggerCheck.rows.length > 0) {
            console.log('⚙️  Triggers created:');
            triggerCheck.rows.forEach(trg => {
                console.log(`  ✓ ${trg.trigger_name}`);
            });
            console.log('');
        }

        console.log('✅ Setup complete! The loans table is ready.');
        console.log('📝 Next step: Upload loan data via the admin portal');
        console.log('   URL: /admin-portal.html → Loan Management');

    } catch (error) {
        console.error('❌ Error setting up loans table:');
        console.error(error.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

// Run the setup
setupLoansTable();
