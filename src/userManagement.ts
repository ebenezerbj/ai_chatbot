import crypto from 'crypto';
import { executeQuery, querySingle } from './database';

export interface User {
  id: number;
  username: string;
  email: string;
  role: 'admin' | 'customer_rep';
  full_name: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  last_login?: Date;
}

export interface CreateUserPayload {
  username: string;
  email: string;
  password: string;
  role: 'admin' | 'customer_rep';
  full_name: string;
}

export interface UpdateUserPayload {
  email?: string;
  full_name?: string;
  is_active?: boolean;
  password?: string;
}

/**
 * Hash password using SHA-256
 */
function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

/**
 * Initialize users table in database
 */
export async function initializeUsersTable(): Promise<void> {
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(50) UNIQUE NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(64) NOT NULL,
      role VARCHAR(20) NOT NULL,
      full_name VARCHAR(255) NOT NULL,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      last_login TIMESTAMP NULL
    )
  `;

  await executeQuery(createTableSQL, []);
  
  // Create indexes separately using IF NOT EXISTS for PostgreSQL
  try {
    await executeQuery('CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)', []);
  } catch (error) {
    // Index might already exist
  }
  try {
    await executeQuery('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)', []);
  } catch (error) {
    // Index might already exist
  }
  try {
    await executeQuery('CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)', []);
  } catch (error) {
    // Index might already exist
  }
  
  console.log('[UserManagement] Users table initialized');

  // Check if default admin exists
  const adminExists = await querySingle<{ count: number }>(
    'SELECT COUNT(*) as count FROM users WHERE role = $1',
    ['admin']
  );

  // Create default admin if none exists
  if (!adminExists || adminExists.count === 0) {
    const defaultPassword = process.env.ADMIN_PASSWORD || 'admin123';
    await createUser({
      username: 'admin',
      email: 'admin@akcb.com',
      password: defaultPassword,
      role: 'admin',
      full_name: 'System Administrator'
    });
    console.log('[UserManagement] Default admin user created (username: admin)');
  }
}

/**
 * Create a new user
 */
export async function createUser(payload: CreateUserPayload): Promise<User> {
  const passwordHash = hashPassword(payload.password);
  
  const sql = `
    INSERT INTO users (username, email, password_hash, role, full_name)
    VALUES ($1, $2, $3, $4, $5)
  `;

  await executeQuery(sql, [
    payload.username,
    payload.email,
    passwordHash,
    payload.role,
    payload.full_name
  ]);

  // Get the inserted user
  const user = await getUserByUsername(payload.username);
  if (!user) {
    throw new Error('Failed to create user');
  }

  return user;
}

/**
 * Authenticate user and return user data if successful
 */
export async function authenticateUser(
  username: string,
  password: string
): Promise<{ success: boolean; user?: User; error?: string }> {
  try {
    const passwordHash = hashPassword(password);
    
    const sql = `
      SELECT id, username, email, role, full_name, is_active, created_at, updated_at, last_login
      FROM users
      WHERE username = $1 AND password_hash = $2
    `;

    const result = await executeQuery<User>(sql, [username, passwordHash]);

    if (!result || result.length === 0) {
      return { success: false, error: 'Invalid username or password' };
    }

    const user = result[0];

    if (!user.is_active) {
      return { success: false, error: 'Account is inactive' };
    }

    // Update last login
    await executeQuery(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );

    return { success: true, user };
  } catch (error: any) {
    console.error('[UserManagement] Authentication error:', error);
    return { success: false, error: 'Authentication failed' };
  }
}

/**
 * Get user by ID
 */
export async function getUserById(userId: number): Promise<User | null> {
  const sql = `
    SELECT id, username, email, role, full_name, is_active, created_at, updated_at, last_login
    FROM users
    WHERE id = $1
  `;

  const result = await executeQuery<User>(sql, [userId]);
  return result && result.length > 0 ? result[0] : null;
}

/**
 * Get user by username
 */
export async function getUserByUsername(username: string): Promise<User | null> {
  const sql = `
    SELECT id, username, email, role, full_name, is_active, created_at, updated_at, last_login
    FROM users
    WHERE username = $1
  `;

  const result = await executeQuery<User>(sql, [username]);
  return result && result.length > 0 ? result[0] : null;
}

/**
 * List all users (with optional role filter)
 */
export async function listUsers(role?: 'admin' | 'customer_rep'): Promise<User[]> {
  let sql = `
    SELECT id, username, email, role, full_name, is_active, created_at, updated_at, last_login
    FROM users
  `;
  
  const params: any[] = [];
  if (role) {
    sql += ' WHERE role = $1';
    params.push(role);
  }
  
  sql += ' ORDER BY created_at DESC';

  const result = await executeQuery<User>(sql, params);
  return result || [];
}

/**
 * Update user
 */
export async function updateUser(userId: number, payload: UpdateUserPayload): Promise<User> {
  const updates: string[] = ['updated_at = CURRENT_TIMESTAMP'];
  const params: any[] = [];

  if (payload.email !== undefined) {
    updates.push(`email = $${params.length + 1}`);
    params.push(payload.email);
  }

  if (payload.full_name !== undefined) {
    updates.push(`full_name = $${params.length + 1}`);
    params.push(payload.full_name);
  }

  if (payload.is_active !== undefined) {
    updates.push(`is_active = $${params.length + 1}`);
    params.push(payload.is_active);
  }

  if (payload.password !== undefined) {
    updates.push(`password_hash = $${params.length + 1}`);
    params.push(hashPassword(payload.password));
  }

  params.push(userId);

  const sql = `
    UPDATE users
    SET ${updates.join(', ')}
    WHERE id = $${params.length}
  `;

  await executeQuery(sql, params);

  // Get updated user
  const user = await getUserById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  return user;
}

/**
 * Delete user (soft delete by setting is_active to false)
 */
export async function deleteUser(userId: number): Promise<void> {
  const sql = 'UPDATE users SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1';
  await executeQuery(sql, [userId]);
}

/**
 * Hard delete user (permanently remove from database)
 */
export async function hardDeleteUser(userId: number): Promise<void> {
  const sql = 'DELETE FROM users WHERE id = $1';
  await executeQuery(sql, [userId]);
}

/**
 * Change user password
 */
export async function changePassword(
  userId: number,
  oldPassword: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Verify old password
    const user = await getUserById(userId);
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    const oldPasswordHash = hashPassword(oldPassword);
    const result = await executeQuery<{ count: number }>(
      'SELECT COUNT(*) as count FROM users WHERE id = $1 AND password_hash = $2',
      [userId, oldPasswordHash]
    );

    if (!result || result.length === 0 || result[0].count === 0) {
      return { success: false, error: 'Current password is incorrect' };
    }

    // Update to new password
    const newPasswordHash = hashPassword(newPassword);
    await executeQuery(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [newPasswordHash, userId]
    );

    return { success: true };
  } catch (error: any) {
    console.error('[UserManagement] Change password error:', error);
    return { success: false, error: 'Failed to change password' };
  }
}
