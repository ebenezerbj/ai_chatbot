/**
 * Setup Loans Table on Render PostgreSQL Database
 * This script creates the loans table with all necessary indexes and triggers
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// IMPORTANT: Replace this with your actual Render PostgreSQL connection string
// Get it from: Render Dashboard > Your Database > "External Connection"
// Format: postgresql://user:password@host:port/database
const RENDER_DATABASE_URL = process.env.RENDER_DATABASE_URL || 'postgresql://USER:PASSWORD@HOST:PORT/DATABASE';

async function setupLoansTable() {
    console.log('🔧 Connecting to Render PostgreSQL database...\n');

    const pool = new Pool({
        connectionString: RENDER_DATABASE_URL,
        ssl: {
            rejectUnauthorized: false
        }
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
        
        // Execute the schema (split by semicolons for safer execution)
        await pool.query(schemaSQL);
        
        console.log('✅ Loans table created successfully!\n');

        // Verify table exists
        const tableCheck = await pool.query(`
            SELECT column_name, data_type, character_maximum_length 
            FROM information_schema.columns 
            WHERE table_name = 'loans' 
            ORDER BY ordinal_position
        `);
        
        console.log('📊 Loans table structure:');
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
            console.log('⚡ Triggers created:');
            triggerCheck.rows.forEach(trg => {
                console.log(`  ✓ ${trg.trigger_name}`);
            });
        } else {
            console.log('ℹ️  No triggers found (this is okay)');
        }
        console.log('');

        console.log('🎉 SUCCESS! Loans table is ready on Render PostgreSQL!');
        console.log('');
        console.log('📋 Next steps:');
        console.log('  1. Go to your production admin portal');
        console.log('  2. Navigate to Loan Upload page');
        console.log('  3. Upload your loan CSV file');
        console.log('  4. Monitor import statistics');
        console.log('');

    } catch (error) {
        console.error('❌ Error setting up loans table:');
        console.error(error.message);
        console.error('');
        console.error('💡 Troubleshooting:');
        console.error('  1. Check your RENDER_DATABASE_URL is correct');
        console.error('  2. Verify database connection in Render dashboard');
        console.error('  3. Ensure database is running and accessible');
        console.error('');
        process.exit(1);
    } finally {
        await pool.end();
    }
}

// Run the setup
setupLoansTable();
