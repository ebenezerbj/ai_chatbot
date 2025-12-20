/**
 * Database migration script to create live chat tables
 * Run with: node dist/migrations/createLiveChatTables.js
 */

import { executeQuery, testConnection } from '../database';

async function createLiveChatTables() {
  console.log('[Migration] Creating live chat tables...');

  try {
    // Test database connection
    const connected = await testConnection();
    if (!connected) {
      throw new Error('Failed to connect to database');
    }

    // Create live_chat_sessions table
    console.log('[Migration] Creating live_chat_sessions table...');
    await executeQuery(`
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
    console.log('[Migration] ✓ live_chat_sessions table created');

    // Create live_chat_messages table
    console.log('[Migration] Creating live_chat_messages table...');
    await executeQuery(`
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
    console.log('[Migration] ✓ live_chat_messages table created');

    // Create indexes for better query performance
    console.log('[Migration] Creating indexes...');
    
    try {
      await executeQuery(`
        CREATE INDEX idx_sessions_status 
        ON live_chat_sessions(status)
      `);
    } catch (e: any) {
      if (!e.message.includes('Duplicate key name')) throw e;
    }
    
    try {
      await executeQuery(`
        CREATE INDEX idx_sessions_customer 
        ON live_chat_sessions(customer_id)
      `);
    } catch (e: any) {
      if (!e.message.includes('Duplicate key name')) throw e;
    }
    
    try {
      await executeQuery(`
        CREATE INDEX idx_sessions_agent 
        ON live_chat_sessions(agent_id)
      `);
    } catch (e: any) {
      if (!e.message.includes('Duplicate key name')) throw e;
    }
    
    try {
      await executeQuery(`
        CREATE INDEX idx_messages_session 
        ON live_chat_messages(session_id)
      `);
    } catch (e: any) {
      if (!e.message.includes('Duplicate key name')) throw e;
    }
    
    try {
      await executeQuery(`
        CREATE INDEX idx_messages_timestamp 
        ON live_chat_messages(timestamp)
      `);
    } catch (e: any) {
      if (!e.message.includes('Duplicate key name')) throw e;
    }
    
    console.log('[Migration] ✓ Indexes created');

    console.log('[Migration] ✓ Live chat tables created successfully!');
    console.log('[Migration] Tables created:');
    console.log('[Migration]   - live_chat_sessions');
    console.log('[Migration]   - live_chat_messages');
    
  } catch (error) {
    console.error('[Migration] ✗ Error creating live chat tables:', error);
    throw error;
  }
}

// Run migration if executed directly
if (require.main === module) {
  createLiveChatTables()
    .then(() => {
      console.log('[Migration] Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('[Migration] Migration failed:', error);
      process.exit(1);
    });
}

export { createLiveChatTables };
