/**
 * Database Connection Module
 * MySQL connection pool for customer authentication and account queries
 */

import mysql from 'mysql2/promise';

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'akcb_bank',
  port: Number(process.env.DB_PORT) || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
};

// Create connection pool
let pool: mysql.Pool | null = null;

/**
 * Get database connection pool (lazy initialization)
 */
export function getPool(): mysql.Pool {
  if (!pool) {
    console.log('[DB] Creating connection pool:', {
      host: dbConfig.host,
      database: dbConfig.database,
      port: dbConfig.port
    });
    pool = mysql.createPool(dbConfig);
  }
  return pool;
}

/**
 * Test database connection
 */
export async function testConnection(): Promise<boolean> {
  try {
    const connection = await getPool().getConnection();
    await connection.ping();
    connection.release();
    console.log('[DB] Connection test successful');
    return true;
  } catch (error: any) {
    console.error('[DB] Connection test failed:', error.message);
    return false;
  }
}

/**
 * Execute a query with error handling
 */
export async function executeQuery<T = any>(
  query: string,
  params: any[] = []
): Promise<T[]> {
  const connection = await getPool().getConnection();
  try {
    const [rows] = await connection.query(query, params);
    return rows as T[];
  } finally {
    connection.release();
  }
}

/**
 * Get a single row
 */
export async function querySingle<T = any>(
  query: string,
  params: any[] = []
): Promise<T | null> {
  const rows = await executeQuery<T>(query, params);
  return rows.length > 0 ? rows[0] : null;
}

/**
 * Close pool (for graceful shutdown)
 */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('[DB] Connection pool closed');
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  await closePool();
});

process.on('SIGINT', async () => {
  await closePool();
});
