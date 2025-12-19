import mysql from 'mysql2/promise';
import { Pool as PgPool } from 'pg';
import { executeQuery, DB_TYPE } from './database';

type ResetTarget = 'postgres' | 'mysql' | 'both';

const TABLES_TO_CLEAR = [
  'transactions',
  'account_balances',
  'customers',
  'loans'
] as const;

function parseTarget(arg?: string): ResetTarget {
  const value = (arg || '').toLowerCase();
  if (value === 'postgres' || value === 'mysql' || value === 'both') return value;
  return 'both';
}

function requireConfirmation(): void {
  const confirm = process.env.RESET_CONFIRM;
  if (confirm !== 'DELETE_ALL_CUSTOMER_DATA') {
    // Keep this message very explicit; this script is destructive.
    console.error('Refusing to run. This operation permanently deletes customer/balance data.');
    console.error('To proceed, set env var RESET_CONFIRM=DELETE_ALL_CUSTOMER_DATA');
    process.exit(2);
  }
}

async function clearPostgres(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.log('[reset] Postgres skipped: DATABASE_URL not set');
    return;
  }

  console.log('[reset] Connecting to PostgreSQL...');
  
  // Give pool time to initialize
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  try {
    console.log('[reset] PostgreSQL: discovering existing tables...');
    const existing = await executeQuery<{ table_name: string }>(
      `SELECT table_name
       FROM information_schema.tables
       WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`,
      []
    );
    const existingSet = new Set(existing.map(r => r.table_name));

    const tables = TABLES_TO_CLEAR.filter(t => existingSet.has(t));
    if (tables.length === 0) {
      console.log('[reset] PostgreSQL: no target tables found, nothing to clear');
      return;
    }

    console.log('[reset] PostgreSQL: clearing tables:', tables.join(', '));
    // Use DELETE instead of TRUNCATE to avoid transaction issues
    for (const table of tables.reverse()) {
      console.log(`[reset] Deleting from ${table}...`);
      await executeQuery(`DELETE FROM "${table}"`, []);
    }

    console.log('[reset] PostgreSQL: done');
  } catch (error: any) {
    console.error('[reset] PostgreSQL error:', error?.message || error);
    throw error;
  }
}

async function clearMySQL(): Promise<void> {
  const host = process.env.DB_HOST || 'localhost';
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || '';
  const database = process.env.DB_NAME || 'akcb_bank';
  const port = Number(process.env.DB_PORT) || 3306;

  // If the user hasn't configured MySQL at all, avoid trying to connect.
  if (!process.env.DB_HOST && !process.env.DB_NAME) {
    console.log('[reset] MySQL skipped: DB_HOST/DB_NAME not set (using defaults would be risky)');
    return;
  }

  console.log('[reset] Connecting to MySQL...');
  const connection = await mysql.createConnection({
    host,
    user,
    password,
    database,
    port
  });

  try {
    console.log('[reset] MySQL: discovering existing tables...');
    const [rows] = await connection.query<any[]>(
      `SELECT table_name
       FROM information_schema.tables
       WHERE table_schema = ? AND table_type = 'BASE TABLE'`,
      [database]
    );
    const existingSet = new Set(rows.map(r => String(r.table_name)));

    const tables = TABLES_TO_CLEAR.filter(t => existingSet.has(t));
    if (tables.length === 0) {
      console.log('[reset] MySQL: no target tables found, nothing to clear');
      return;
    }

    console.log('[reset] MySQL: clearing tables:', tables.join(', '));
    await connection.query('SET FOREIGN_KEY_CHECKS=0');
    for (const table of tables) {
      await connection.query(`TRUNCATE TABLE \`${table}\``);
    }
    await connection.query('SET FOREIGN_KEY_CHECKS=1');

    console.log('[reset] MySQL: done');
  } finally {
    await connection.end();
  }
}

async function main(): Promise<void> {
  requireConfirmation();

  const target = parseTarget(process.argv[2]);
  console.log(`[reset] Target: ${target}`);
  console.log('[reset] Will clear:', TABLES_TO_CLEAR.join(', '));

  if (target === 'postgres' || target === 'both') {
    await clearPostgres();
  }

  if (target === 'mysql' || target === 'both') {
    await clearMySQL();
  }

  console.log('[reset] All done');
}

main().catch((err) => {
  console.error('[reset] Failed:', err?.message || err);
  process.exit(1);
});
