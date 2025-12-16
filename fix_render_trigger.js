/**
 * Fix PostgreSQL Trigger on Render Database
 * This script connects to your Render PostgreSQL database and fixes the trigger issue
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// IMPORTANT: Replace this with your actual Render PostgreSQL connection string
// Get it from: Render Dashboard > Your Database > "External Connection"
// Format: postgresql://user:password@host:port/database
const RENDER_DATABASE_URL = process.env.RENDER_DATABASE_URL || 'postgresql://USER:PASSWORD@HOST:PORT/DATABASE';

async function fixTrigger() {
    console.log('🔧 Connecting to Render PostgreSQL database...\n');

    const pool = new Pool({
        connectionString: RENDER_DATABASE_URL,
        ssl: {
            rejectUnauthorized: false
        }
    });

    try {
        // Test connection
        await pool.query('SELECT NOW()');
        console.log('✅ Connected to database successfully!\n');

        // Read the fix SQL script
        const fixSQL = fs.readFileSync(path.join(__dirname, 'fix_trigger.sql'), 'utf8');
        
        console.log('📝 Executing trigger fix...\n');
        
        // Execute each statement separately
        const statements = [
            'DROP TRIGGER IF EXISTS update_account_balances_updated_at ON account_balances',
            'DROP TRIGGER IF EXISTS update_account_balances_last_updated ON account_balances',
            `CREATE OR REPLACE FUNCTION update_last_updated_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_updated = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql'`,
            `CREATE TRIGGER update_account_balances_last_updated 
    BEFORE UPDATE ON account_balances
    FOR EACH ROW 
    EXECUTE FUNCTION update_last_updated_column()`
        ];

        for (const statement of statements) {
            await pool.query(statement);
            console.log('✅ Executed:', statement.split('\n')[0].substring(0, 60) + '...');
        }

        console.log('\n🎉 Trigger fixed successfully!\n');
        console.log('📊 Verifying the fix...\n');

        // Verify the fix
        const result = await pool.query(`
            SELECT 
                tgname AS trigger_name,
                tgrelid::regclass AS table_name,
                proname AS function_name
            FROM pg_trigger t
            JOIN pg_proc p ON t.tgfoid = p.oid
            WHERE tgrelid = 'account_balances'::regclass
        `);

        if (result.rows.length > 0) {
            console.log('✅ Trigger verification:');
            console.table(result.rows);
            console.log('\n✨ All done! You can now retry the balance upload.');
        } else {
            console.log('⚠️  No triggers found on account_balances table.');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('\nFull error:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

// Run the fix
fixTrigger().catch(console.error);
