/**
 * Setup Account Openings Table on Render PostgreSQL Database
 * Run this script to create the account_openings table on your live Render database
 */

const { Pool } = require('pg');

// IMPORTANT: Set your Render database URL
// Get it from: Render Dashboard > Your PostgreSQL Database > "External Connection"
// Or set as environment variable: RENDER_DATABASE_URL
const RENDER_DATABASE_URL = process.env.RENDER_DATABASE_URL || process.env.DATABASE_URL;

if (!RENDER_DATABASE_URL || RENDER_DATABASE_URL.includes('USER:PASSWORD')) {
    console.error('❌ ERROR: Please set RENDER_DATABASE_URL environment variable');
    console.error('');
    console.error('Usage:');
    console.error('  Windows PowerShell:');
    console.error('    $env:RENDER_DATABASE_URL="postgresql://user:pass@host/db"; node setup_render_account_openings.js');
    console.error('');
    console.error('  Linux/Mac:');
    console.error('    RENDER_DATABASE_URL="postgresql://user:pass@host/db" node setup_render_account_openings.js');
    console.error('');
    console.error('Get your database URL from: Render Dashboard > PostgreSQL > External Connection');
    process.exit(1);
}

const createTableSQL = `
-- Account Openings Table (for non-customers to apply for new accounts)
CREATE TABLE IF NOT EXISTS account_openings (
    id BIGSERIAL PRIMARY KEY,
    session_id VARCHAR(100),
    ip_address VARCHAR(64),
    user_agent VARCHAR(255),
    
    -- Personal Information
    full_name VARCHAR(150) NOT NULL,
    date_of_birth DATE NOT NULL,
    gender VARCHAR(20) NOT NULL,
    marital_status VARCHAR(30) NOT NULL,
    
    -- Contact Information
    phone_number VARCHAR(20) NOT NULL,
    email VARCHAR(100) NOT NULL,
    residential_address TEXT NOT NULL,
    digital_address VARCHAR(50) NOT NULL,
    postal_address VARCHAR(255) NOT NULL,
    
    -- Identification
    ghana_card_number VARCHAR(50) NOT NULL,
    
    -- Employment Information
    occupation VARCHAR(100) NOT NULL,
    employer_name VARCHAR(150) NOT NULL,
    monthly_income DECIMAL(15,2) NOT NULL,
    source_of_funds VARCHAR(150) NOT NULL,
    
    -- Account Details
    account_type VARCHAR(50) NOT NULL,
    mode_of_operation VARCHAR(50) NOT NULL,
    initial_deposit DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    
    -- Next of Kin
    next_of_kin_name VARCHAR(150) NOT NULL,
    next_of_kin_relationship VARCHAR(50) NOT NULL,
    next_of_kin_phone VARCHAR(20) NOT NULL,
    
    -- Consents and Declarations
    specimen_signature_acknowledged BOOLEAN NOT NULL DEFAULT FALSE,
    customer_declaration BOOLEAN NOT NULL DEFAULT FALSE,
    terms_accepted BOOLEAN NOT NULL DEFAULT FALSE,
    data_processing_consent BOOLEAN NOT NULL DEFAULT FALSE,
    
    status VARCHAR(30) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_account_openings_created ON account_openings(created_at);
CREATE INDEX IF NOT EXISTS idx_account_openings_status ON account_openings(status);
CREATE INDEX IF NOT EXISTS idx_account_openings_phone ON account_openings(phone_number);
CREATE INDEX IF NOT EXISTS idx_account_openings_email ON account_openings(email);
`;

async function setupAccountOpeningsTable() {
    console.log('🚀 Setting up Account Openings Table on Render PostgreSQL\n');
    console.log('📍 Database:', RENDER_DATABASE_URL.replace(/:[^:@]+@/, ':****@'));
    console.log('');

    const pool = new Pool({
        connectionString: RENDER_DATABASE_URL,
        ssl: {
            rejectUnauthorized: false
        }
    });

    try {
        // Test connection
        console.log('🔌 Connecting to database...');
        const result = await pool.query('SELECT NOW(), current_database()');
        console.log('✅ Connected successfully!');
        console.log('📅 Server time:', result.rows[0].now);
        console.log('🗄️  Database:', result.rows[0].current_database);
        console.log('');

        // Check if table already exists
        console.log('🔍 Checking if account_openings table exists...');
        const tableCheck = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'account_openings'
        `);

        if (tableCheck.rows.length > 0) {
            console.log('⚠️  Table already exists. Checking structure...\n');
        } else {
            console.log('📝 Table does not exist. Creating...\n');
        }

        // Create table (IF NOT EXISTS ensures it's safe to run)
        console.log('🔨 Creating account_openings table and indexes...');
        await pool.query(createTableSQL);
        console.log('✅ Table and indexes created successfully!\n');

        // Verify table structure
        console.log('🔍 Verifying table structure...');
        const columns = await pool.query(`
            SELECT column_name, data_type, character_maximum_length, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'account_openings' 
            ORDER BY ordinal_position
        `);

        console.log(`✅ Table has ${columns.rows.length} columns:\n`);
        columns.rows.forEach((col, idx) => {
            const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
            const maxLen = col.character_maximum_length ? `(${col.character_maximum_length})` : '';
            const defaultVal = col.column_default ? ` DEFAULT ${col.column_default}` : '';
            console.log(`   ${(idx + 1).toString().padStart(2)}. ${col.column_name.padEnd(35)} ${col.data_type}${maxLen} ${nullable}${defaultVal}`);
        });

        console.log('');

        // Check indexes
        console.log('🔍 Checking indexes...');
        const indexes = await pool.query(`
            SELECT indexname, indexdef 
            FROM pg_indexes 
            WHERE tablename = 'account_openings'
            ORDER BY indexname
        `);

        console.log(`✅ Found ${indexes.rows.length} indexes:\n`);
        indexes.rows.forEach((idx, i) => {
            console.log(`   ${(i + 1)}. ${idx.indexname}`);
        });

        console.log('');

        // Count existing records
        const countResult = await pool.query('SELECT COUNT(*) as count FROM account_openings');
        console.log(`📊 Current records: ${countResult.rows[0].count}\n`);

        // Test insert
        console.log('🧪 Testing INSERT operation...');
        const testInsert = await pool.query(`
            INSERT INTO account_openings (
                session_id, full_name, date_of_birth, gender, marital_status,
                phone_number, email, residential_address, digital_address, postal_address,
                ghana_card_number, occupation, employer_name, monthly_income, source_of_funds,
                account_type, mode_of_operation, initial_deposit,
                next_of_kin_name, next_of_kin_relationship, next_of_kin_phone,
                specimen_signature_acknowledged, customer_declaration, terms_accepted, data_processing_consent
            ) VALUES (
                'test_session', 'Test User', '1990-01-01', 'Male', 'Single',
                '0241234567', 'test@example.com', 'Test Address', 'AK-123-4567', 'P.O. Box 123',
                'GHA-123456789-0', 'Teacher', 'Test School', 3500.00, 'Salary',
                'Savings', 'Individual', 100.00,
                'Test Kin', 'Sister', '0243456789',
                1, 1, 1, 1
            ) RETURNING id
        `);

        const testId = testInsert.rows[0].id;
        console.log(`✅ Test insert successful! ID: ${testId}`);

        // Clean up test record
        await pool.query('DELETE FROM account_openings WHERE id = $1', [testId]);
        console.log('✅ Test record cleaned up\n');

        console.log('═══════════════════════════════════════════════════════════');
        console.log('🎉 SUCCESS! Account Openings table is ready on Render!');
        console.log('═══════════════════════════════════════════════════════════');
        console.log('');
        console.log('✅ Table created: account_openings');
        console.log('✅ Indexes created: 4');
        console.log('✅ Structure verified: 30 columns');
        console.log('✅ INSERT operation tested: Working');
        console.log('');
        console.log('🚀 Your live application can now accept account opening requests!');
        console.log('');

    } catch (error) {
        console.error('');
        console.error('❌ ERROR:', error.message);
        console.error('');
        if (error.code) {
            console.error('Error Code:', error.code);
        }
        if (error.detail) {
            console.error('Details:', error.detail);
        }
        console.error('');
        console.error('💡 Troubleshooting:');
        console.error('  1. Check your database URL is correct');
        console.error('  2. Ensure the database is running on Render');
        console.error('  3. Verify your IP is not blocked by Render');
        console.error('  4. Check database connection settings');
        process.exit(1);
    } finally {
        await pool.end();
    }
}

setupAccountOpeningsTable();
