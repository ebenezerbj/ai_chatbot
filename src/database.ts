/**
 * Database Connection Module
 * Supports both MySQL and PostgreSQL for customer authentication and account queries
 */

import mysql from 'mysql2/promise';
import { Pool as PgPool } from 'pg';

// Determine database type from environment
const DB_TYPE = process.env.DATABASE_URL ? 'postgres' : 'mysql';

// MySQL configuration
const mysqlConfig = {
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

// PostgreSQL configuration (for Render)
const postgresConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : undefined,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
};

// Create connection pools
let mysqlPool: mysql.Pool | null = null;
let pgPool: PgPool | null = null;

/**
 * Get database connection pool (lazy initialization)
 */
export function getPool(): mysql.Pool | PgPool {
  if (DB_TYPE === 'postgres') {
    if (!pgPool) {
      console.log('[DB] Creating PostgreSQL connection pool');
      pgPool = new PgPool(postgresConfig);
    }
    return pgPool as any;
  } else {
    if (!mysqlPool) {
      console.log('[DB] Creating MySQL connection pool:', {
        host: mysqlConfig.host,
        database: mysqlConfig.database,
        port: mysqlConfig.port
      });
      mysqlPool = mysql.createPool(mysqlConfig);
    }
    return mysqlPool as any;
  }
}

/**
 * Test database connection
 */
export async function testConnection(): Promise<boolean> {
  try {
    if (DB_TYPE === 'postgres') {
      const pool = getPool() as PgPool;
      const client = await pool.connect();
      await client.query('SELECT 1');
      client.release();
      console.log('[DB] PostgreSQL connection test successful');
      return true;
    } else {
      const pool = getPool() as mysql.Pool;
      const connection = await pool.getConnection();
      await connection.ping();
      connection.release();
      console.log('[DB] MySQL connection test successful');
      return true;
    }
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
  if (DB_TYPE === 'postgres') {
    const pool = getPool() as PgPool;
    // Convert MySQL placeholders (?) to PostgreSQL ($1, $2, etc.)
    let pgQuery = query;
    let paramIndex = 1;
    pgQuery = pgQuery.replace(/\?/g, () => `$${paramIndex++}`);
    
    const result = await pool.query(pgQuery, params);
    return result.rows as T[];
  } else {
    const pool = getPool() as mysql.Pool;
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.query(query, params);
      return rows as T[];
    } finally {
      connection.release();
    }
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
  if (DB_TYPE === 'postgres' && pgPool) {
    await pgPool.end();
    pgPool = null;
    console.log('[DB] PostgreSQL connection pool closed');
  } else if (mysqlPool) {
    await mysqlPool.end();
    mysqlPool = null;
    console.log('[DB] MySQL connection pool closed');
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  await closePool();
});

process.on('SIGINT', async () => {
  await closePool();
});
