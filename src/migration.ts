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
