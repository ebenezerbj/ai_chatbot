const { Pool } = require('pg');
require('dotenv').config();

async function listTables() {
    const dbUrl = process.env.DATABASE_URL;
    
    if (!dbUrl) {
        console.log('❌ DATABASE_URL not found in .env file');
        process.exit(1);
    }

    const pool = new Pool({
        connectionString: dbUrl,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('✅ Connected to PostgreSQL database\n');

        // Get all tables in public schema
        const result = await pool.query(`
            SELECT 
                table_name,
                (SELECT COUNT(*) FROM information_schema.columns 
                 WHERE table_schema = 'public' AND table_name = t.table_name) as column_count
            FROM information_schema.tables t
            WHERE table_schema = 'public'
            ORDER BY table_name
        `);

        console.log('📊 Tables in Database:');
        console.log('═'.repeat(80));
        console.log('');

        if (result.rows.length === 0) {
            console.log('  No tables found');
        } else {
            for (const table of result.rows) {
                // Get row count for each table
                const countResult = await pool.query(`SELECT COUNT(*) as total FROM ${table.table_name}`);
                const rowCount = countResult.rows[0].total;
                
                console.log(`📋 ${table.table_name}`);
                console.log(`   Columns: ${table.column_count}`);
                console.log(`   Records: ${rowCount}`);
                console.log('');
            }
        }

        console.log('═'.repeat(80));
        console.log(`\nTotal tables: ${result.rows.length}`);

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await pool.end();
    }
}

listTables();
