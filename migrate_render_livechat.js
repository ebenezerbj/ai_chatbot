/**
 * Run live chat database migration on Render PostgreSQL
 */

const { Pool } = require('pg');

const RENDER_DATABASE_URL = process.env.RENDER_DATABASE_URL || 'postgresql://akcb_bank_user:IlcndVR943byznoByTRzN1zBQS3gB9lI@dpg-d4u410ali9vc73am148g-a.oregon-postgres.render.com/akcb_bank';

async function runMigration() {
    console.log('🚀 Running Live Chat Migration on Render PostgreSQL...\n');

    const pool = new Pool({
        connectionString: RENDER_DATABASE_URL,
        ssl: {
            rejectUnauthorized: false
        }
    });

    try {
        // Test connection
        console.log('📡 Testing database connection...');
        const testResult = await pool.query('SELECT NOW()');
        console.log('✅ Connected successfully!\n');

        // Create live_chat_sessions table
        console.log('📋 Creating live_chat_sessions table...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS live_chat_sessions (
                session_id VARCHAR(255) PRIMARY KEY,
                customer_id VARCHAR(255) NOT NULL,
                customer_name VARCHAR(255) NOT NULL,
                agent_id VARCHAR(255),
                agent_name VARCHAR(255),
                status VARCHAR(50) NOT NULL CHECK (status IN ('waiting', 'active', 'ended')),
                started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                ended_at TIMESTAMP,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ live_chat_sessions table created\n');

        // Create live_chat_messages table
        console.log('📋 Creating live_chat_messages table...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS live_chat_messages (
                message_id VARCHAR(255) PRIMARY KEY,
                session_id VARCHAR(255) NOT NULL,
                sender VARCHAR(50) NOT NULL CHECK (sender IN ('customer', 'agent')),
                sender_id VARCHAR(255) NOT NULL,
                message TEXT NOT NULL,
                timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (session_id) REFERENCES live_chat_sessions(session_id) ON DELETE CASCADE
            )
        `);
        console.log('✅ live_chat_messages table created\n');

        // Create indexes
        console.log('📊 Creating indexes...');

        const indexes = [
            {
                name: 'idx_sessions_status',
                sql: 'CREATE INDEX IF NOT EXISTS idx_sessions_status ON live_chat_sessions(status)'
            },
            {
                name: 'idx_sessions_customer',
                sql: 'CREATE INDEX IF NOT EXISTS idx_sessions_customer ON live_chat_sessions(customer_id)'
            },
            {
                name: 'idx_sessions_agent',
                sql: 'CREATE INDEX IF NOT EXISTS idx_sessions_agent ON live_chat_sessions(agent_id)'
            },
            {
                name: 'idx_messages_session',
                sql: 'CREATE INDEX IF NOT EXISTS idx_messages_session ON live_chat_messages(session_id)'
            },
            {
                name: 'idx_messages_timestamp',
                sql: 'CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON live_chat_messages(timestamp)'
            }
        ];

        for (const index of indexes) {
            try {
                await pool.query(index.sql);
                console.log(`  ✅ ${index.name}`);
            } catch (e) {
                if (e.message.includes('already exists')) {
                    console.log(`  ⏭️  ${index.name} (already exists)`);
                } else {
                    throw e;
                }
            }
        }

        console.log('\n🎉 Migration completed successfully!\n');
        console.log('📊 Summary:');
        console.log('  ✅ live_chat_sessions table');
        console.log('  ✅ live_chat_messages table');
        console.log('  ✅ 5 indexes created');
        console.log('\n💬 Live chat system is ready to use!');

    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    } finally {
        await pool.end();
    }
}

// Run migration
runMigration()
    .then(() => {
        console.log('\n✅ Script completed');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Script failed:', error);
        process.exit(1);
    });
