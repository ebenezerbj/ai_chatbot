/**
 * Database Migration Endpoint
 * Runs schema migrations on the server
 */

import { executeQuery, DB_TYPE } from './database';

export async function runMigration001(): Promise<{ success: boolean; message: string; details?: any }> {
  try {
    console.log('[Migration] Starting: Enhanced Customer Demographics');

    if (DB_TYPE !== 'postgres') {
      return { success: false, message: 'Migration only supports PostgreSQL' };
    }

    // Add new columns to customers table
    const alterStatements = [
      "ALTER TABLE customers ADD COLUMN IF NOT EXISTS customer_id VARCHAR(20)",
      "ALTER TABLE customers ADD COLUMN IF NOT EXISTS customer_type VARCHAR(20)",
      "ALTER TABLE customers ADD COLUMN IF NOT EXISTS title VARCHAR(10)",
      "ALTER TABLE customers ADD COLUMN IF NOT EXISTS first_name VARCHAR(50)",
      "ALTER TABLE customers ADD COLUMN IF NOT EXISTS middle_name VARCHAR(50)",
      "ALTER TABLE customers ADD COLUMN IF NOT EXISTS surname VARCHAR(50)",
      "ALTER TABLE customers ADD COLUMN IF NOT EXISTS previous_name VARCHAR(100)",
      "ALTER TABLE customers ADD COLUMN IF NOT EXISTS company_name VARCHAR(150)",
      "ALTER TABLE customers ADD COLUMN IF NOT EXISTS gender VARCHAR(10)",
      "ALTER TABLE customers ADD COLUMN IF NOT EXISTS id_type VARCHAR(30)",
      "ALTER TABLE customers ADD COLUMN IF NOT EXISTS id_number VARCHAR(50)",
      "ALTER TABLE customers ADD COLUMN IF NOT EXISTS date_of_birth DATE",
      "ALTER TABLE customers ADD COLUMN IF NOT EXISTS home_address TEXT",
      "ALTER TABLE customers ADD COLUMN IF NOT EXISTS postal_address VARCHAR(150)",
      "ALTER TABLE customers ADD COLUMN IF NOT EXISTS country VARCHAR(50) DEFAULT 'Ghana'",
      "ALTER TABLE customers ADD COLUMN IF NOT EXISTS email VARCHAR(100)",
      "ALTER TABLE customers ADD COLUMN IF NOT EXISTS mobile_phone VARCHAR(20)",
      "ALTER TABLE customers ADD COLUMN IF NOT EXISTS pep_status BOOLEAN DEFAULT FALSE",
      "ALTER TABLE customers ADD COLUMN IF NOT EXISTS account_type VARCHAR(50)",
      "ALTER TABLE customers ADD COLUMN IF NOT EXISTS account_ownership VARCHAR(30)",
      "ALTER TABLE customers ADD COLUMN IF NOT EXISTS product_name VARCHAR(100)",
      "ALTER TABLE customers ADD COLUMN IF NOT EXISTS account_status VARCHAR(20)",
      "ALTER TABLE customers ADD COLUMN IF NOT EXISTS exclusion_type VARCHAR(50)",
      "ALTER TABLE customers ADD COLUMN IF NOT EXISTS branch_name VARCHAR(100)",
      "ALTER TABLE customers ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'GHS'",
      "ALTER TABLE customers ADD COLUMN IF NOT EXISTS exchange_rate DECIMAL(10,4) DEFAULT 1.0000",
      "ALTER TABLE customers ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
      "ALTER TABLE customers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP"
    ];

    for (const statement of alterStatements) {
      await executeQuery(statement, []);
    }

    // Create indexes
    const indexes = [
      "CREATE INDEX IF NOT EXISTS idx_customer_id ON customers(customer_id)",
      "CREATE INDEX IF NOT EXISTS idx_customer_type ON customers(customer_type)",
      "CREATE INDEX IF NOT EXISTS idx_email ON customers(email)",
      "CREATE INDEX IF NOT EXISTS idx_mobile ON customers(mobile_phone)",
      "CREATE INDEX IF NOT EXISTS idx_branch ON customers(branch_name)",
      "CREATE INDEX IF NOT EXISTS idx_pep ON customers(pep_status)",
      "CREATE INDEX IF NOT EXISTS idx_account_status ON customers(account_status)",
      "CREATE INDEX IF NOT EXISTS idx_dob ON customers(date_of_birth)"
    ];

    for (const index of indexes) {
      await executeQuery(index, []);
    }

    // Create update trigger
    await executeQuery(`
      CREATE OR REPLACE FUNCTION update_customers_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `, []);

    await executeQuery(`
      DROP TRIGGER IF EXISTS customers_updated_at_trigger ON customers
    `, []);

    await executeQuery(`
      CREATE TRIGGER customers_updated_at_trigger
          BEFORE UPDATE ON customers
          FOR EACH ROW
          EXECUTE FUNCTION update_customers_updated_at()
    `, []);

    // Get column count
    const result = await executeQuery(`
      SELECT COUNT(*) as column_count
      FROM information_schema.columns
      WHERE table_name = 'customers'
    `, []) as any[];

    const columnCount = result[0]?.column_count || 0;

    console.log('[Migration] Completed successfully');
    console.log(`[Migration] Customer table now has ${columnCount} columns`);

    return { 
      success: true, 
      message: 'Migration completed successfully',
      details: { 
        columnsAdded: alterStatements.length,
        indexesCreated: indexes.length,
        totalColumns: columnCount
      }
    };

  } catch (error: any) {
    console.error('[Migration] Failed:', error.message);
    return { 
      success: false, 
      message: 'Migration failed: ' + error.message,
      details: { error: error.stack }
    };
  }
}

/**
 * Migration 002: Ensure Analytics Phase 2 Tables Exist
 * Creates user_profiles, feedback, follow_ups, user_preferences
 */
export async function runMigration002(): Promise<{ success: boolean; message: string; details?: any }> {
  try {
    console.log('[Migration 002] Starting: Analytics Phase 2 Tables');

    if (DB_TYPE === 'postgres') {
      // User profiles
      await executeQuery(`
        CREATE TABLE IF NOT EXISTS user_profiles (
          user_id VARCHAR(255) PRIMARY KEY,
          first_seen TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          last_seen TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          total_sessions INTEGER DEFAULT 0,
          total_messages INTEGER DEFAULT 0,
          preferred_topics JSONB,
          segment VARCHAR(20) DEFAULT 'new',
          average_satisfaction DECIMAL(3,2),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // User preferences
      await executeQuery(`
        CREATE TABLE IF NOT EXISTS user_preferences (
          id SERIAL PRIMARY KEY,
          user_id VARCHAR(255) NOT NULL,
          preference_key VARCHAR(100) NOT NULL,
          preference_value TEXT NOT NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, preference_key)
        )
      `);

      // Feedback
      await executeQuery(`
        CREATE TABLE IF NOT EXISTS feedback (
          id SERIAL PRIMARY KEY,
          session_id VARCHAR(255) NOT NULL,
          message_id INTEGER NOT NULL,
          feedback_type VARCHAR(20) NOT NULL,
          score INTEGER NOT NULL,
          comment TEXT,
          timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Follow-ups
      await executeQuery(`
        CREATE TABLE IF NOT EXISTS follow_ups (
          id SERIAL PRIMARY KEY,
          user_id VARCHAR(255) NOT NULL,
          session_id VARCHAR(255) NOT NULL,
          topic VARCHAR(255) NOT NULL,
          action TEXT NOT NULL,
          completed BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          completed_at TIMESTAMP
        )
      `);

      // Indexes
      await executeQuery(`CREATE INDEX IF NOT EXISTS idx_user_profiles_segment ON user_profiles(segment)`);
      await executeQuery(`CREATE INDEX IF NOT EXISTS idx_user_profiles_last_seen ON user_profiles(last_seen)`);
      await executeQuery(`CREATE INDEX IF NOT EXISTS idx_feedback_session ON feedback(session_id)`);
      await executeQuery(`CREATE INDEX IF NOT EXISTS idx_followups_user ON follow_ups(user_id)`);
      await executeQuery(`CREATE INDEX IF NOT EXISTS idx_followups_completed ON follow_ups(completed)`);

      console.log('[Migration 002] PostgreSQL tables created successfully');

    } else {
      // MySQL
      await executeQuery(`
        CREATE TABLE IF NOT EXISTS user_profiles (
          user_id VARCHAR(255) PRIMARY KEY,
          first_seen TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          last_seen TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          total_sessions INT DEFAULT 0,
          total_messages INT DEFAULT 0,
          preferred_topics JSON,
          segment VARCHAR(20) DEFAULT 'new',
          average_satisfaction DECIMAL(3,2),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_segment (segment),
          INDEX idx_last_seen (last_seen)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      await executeQuery(`
        CREATE TABLE IF NOT EXISTS user_preferences (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id VARCHAR(255) NOT NULL,
          preference_key VARCHAR(100) NOT NULL,
          preference_value TEXT NOT NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY unique_user_pref (user_id, preference_key)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      await executeQuery(`
        CREATE TABLE IF NOT EXISTS feedback (
          id INT AUTO_INCREMENT PRIMARY KEY,
          session_id VARCHAR(255) NOT NULL,
          message_id INT NOT NULL,
          feedback_type VARCHAR(20) NOT NULL,
          score INT NOT NULL,
          comment TEXT,
          timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_session (session_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      await executeQuery(`
        CREATE TABLE IF NOT EXISTS follow_ups (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id VARCHAR(255) NOT NULL,
          session_id VARCHAR(255) NOT NULL,
          topic VARCHAR(255) NOT NULL,
          action TEXT NOT NULL,
          completed BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          completed_at TIMESTAMP NULL,
          INDEX idx_user (user_id),
          INDEX idx_completed (completed)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      console.log('[Migration 002] MySQL tables created successfully');
    }

    // Check table counts
    const tables = ['user_profiles', 'user_preferences', 'feedback', 'follow_ups'];
    const counts: any = {};
    
    for (const table of tables) {
      const result = await executeQuery(`SELECT COUNT(*) as count FROM ${table}`, []) as any[];
      counts[table] = result[0]?.count || 0;
    }

    return {
      success: true,
      message: 'Analytics Phase 2 tables created successfully',
      details: { tables: tables.length, counts }
    };

  } catch (error: any) {
    console.error('[Migration 002] Error:', error);
    return {
      success: false,
      message: 'Migration 002 failed: ' + error.message,
      details: error
    };
  }
}
