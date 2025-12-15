/**
 * Analytics & Conversation Logging Module
 * Phase 1: Foundation for AI-driven customer engagement
 */

import { executeQuery, DB_TYPE } from './database';

// ===== Types =====
export interface ChatSession {
  sessionId: string;
  startTime: Date;
  endTime?: Date;
  totalMessages: number;
  userMessages: number;
  botMessages: number;
  durationSeconds?: number;
  ipAddress?: string;
  userAgent?: string;
}

export interface ConversationLog {
  id?: number;
  sessionId: string;
  messageIndex: number;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: any; // Intent, sentiment, etc.
}

export interface QueryMetrics {
  query: string;
  count: number;
  category?: string;
  avgResponseTime?: number;
}

export interface AnalyticsSummary {
  totalSessions: number;
  totalMessages: number;
  avgMessagesPerSession: number;
  avgSessionDuration: number;
  topQueries: QueryMetrics[];
  peakHours: { hour: number; count: number }[];
}

// ===== Database Schema Setup =====
export async function initializeAnalyticsTables(): Promise<void> {
  console.log('[Analytics] Initializing database tables...');
  
  if (DB_TYPE === 'postgres') {
    // PostgreSQL schema
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS chat_sessions (
        session_id VARCHAR(255) PRIMARY KEY,
        start_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        end_time TIMESTAMP,
        total_messages INTEGER DEFAULT 0,
        user_messages INTEGER DEFAULT 0,
        bot_messages INTEGER DEFAULT 0,
        duration_seconds INTEGER,
        ip_address VARCHAR(45),
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await executeQuery(`
      CREATE TABLE IF NOT EXISTS conversation_logs (
        id SERIAL PRIMARY KEY,
        session_id VARCHAR(255) NOT NULL,
        message_index INTEGER NOT NULL,
        role VARCHAR(20) NOT NULL,
        content TEXT NOT NULL,
        timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES chat_sessions(session_id) ON DELETE CASCADE
      )
    `);

    await executeQuery(`
      CREATE INDEX IF NOT EXISTS idx_session_start ON chat_sessions(start_time)
    `);

    await executeQuery(`
      CREATE INDEX IF NOT EXISTS idx_logs_session ON conversation_logs(session_id)
    `);

    await executeQuery(`
      CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON conversation_logs(timestamp)
    `);

  } else {
    // MySQL schema
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS chat_sessions (
        session_id VARCHAR(255) PRIMARY KEY,
        start_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        end_time TIMESTAMP NULL,
        total_messages INT DEFAULT 0,
        user_messages INT DEFAULT 0,
        bot_messages INT DEFAULT 0,
        duration_seconds INT,
        ip_address VARCHAR(45),
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await executeQuery(`
      CREATE TABLE IF NOT EXISTS conversation_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        session_id VARCHAR(255) NOT NULL,
        message_index INT NOT NULL,
        role VARCHAR(20) NOT NULL,
        content TEXT NOT NULL,
        timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        metadata JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES chat_sessions(session_id) ON DELETE CASCADE,
        INDEX idx_session_id (session_id),
        INDEX idx_timestamp (timestamp)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  console.log('[Analytics] Database tables initialized successfully');
}

// ===== Session Management =====

/**
 * Start a new chat session
 */
export async function startSession(
  sessionId: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  const query = DB_TYPE === 'postgres'
    ? 'INSERT INTO chat_sessions (session_id, ip_address, user_agent) VALUES ($1, $2, $3) ON CONFLICT (session_id) DO NOTHING'
    : 'INSERT IGNORE INTO chat_sessions (session_id, ip_address, user_agent) VALUES (?, ?, ?)';
  
  await executeQuery(query, [sessionId, ipAddress, userAgent]);
  console.log(`[Analytics] Session started: ${sessionId}`);
}

/**
 * End a chat session
 */
export async function endSession(sessionId: string): Promise<void> {
  const query = DB_TYPE === 'postgres'
    ? `UPDATE chat_sessions 
       SET end_time = CURRENT_TIMESTAMP,
           duration_seconds = EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - start_time))
       WHERE session_id = $1`
    : `UPDATE chat_sessions 
       SET end_time = CURRENT_TIMESTAMP,
           duration_seconds = TIMESTAMPDIFF(SECOND, start_time, CURRENT_TIMESTAMP)
       WHERE session_id = ?`;
  
  await executeQuery(query, [sessionId]);
  console.log(`[Analytics] Session ended: ${sessionId}`);
}

/**
 * Log a conversation message
 */
export async function logMessage(
  sessionId: string,
  messageIndex: number,
  role: 'user' | 'assistant' | 'system',
  content: string,
  metadata?: any
): Promise<void> {
  // Increment message counters
  const counterField = role === 'user' ? 'user_messages' : 'bot_messages';
  const updateQuery = DB_TYPE === 'postgres'
    ? `UPDATE chat_sessions 
       SET total_messages = total_messages + 1,
           ${counterField} = ${counterField} + 1
       WHERE session_id = $1`
    : `UPDATE chat_sessions 
       SET total_messages = total_messages + 1,
           ${counterField} = ${counterField} + 1
       WHERE session_id = ?`;
  
  await executeQuery(updateQuery, [sessionId]);

  // Log the message
  const logQuery = DB_TYPE === 'postgres'
    ? 'INSERT INTO conversation_logs (session_id, message_index, role, content, metadata) VALUES ($1, $2, $3, $4, $5)'
    : 'INSERT INTO conversation_logs (session_id, message_index, role, content, metadata) VALUES (?, ?, ?, ?, ?)';
  
  const metadataStr = metadata ? JSON.stringify(metadata) : null;
  await executeQuery(logQuery, [sessionId, messageIndex, role, content, metadataStr]);
}

// ===== Analytics Queries =====

/**
 * Get analytics summary for a date range
 */
export async function getAnalyticsSummary(
  startDate?: Date,
  endDate?: Date
): Promise<AnalyticsSummary> {
  const dateFilter = startDate && endDate
    ? DB_TYPE === 'postgres'
      ? 'WHERE start_time BETWEEN $1 AND $2'
      : 'WHERE start_time BETWEEN ? AND ?'
    : '';
  
  const params = startDate && endDate ? [startDate, endDate] : [];

  // Total sessions
  const sessionsQuery = `SELECT COUNT(*) as count FROM chat_sessions ${dateFilter}`;
  const sessionsResult = await executeQuery<{ count: string | number }>(sessionsQuery, params);
  const totalSessions = Number(sessionsResult[0]?.count || 0);

  // Total messages
  const messagesQuery = `SELECT SUM(total_messages) as total FROM chat_sessions ${dateFilter}`;
  const messagesResult = await executeQuery<{ total: string | number }>(messagesQuery, params);
  const totalMessages = Number(messagesResult[0]?.total || 0);

  // Average duration
  const durationQuery = `SELECT AVG(duration_seconds) as avg_duration FROM chat_sessions WHERE duration_seconds IS NOT NULL ${dateFilter ? 'AND ' + dateFilter.replace('WHERE ', '') : ''}`;
  const durationResult = await executeQuery<{ avg_duration: string | number }>(durationQuery, params);
  const avgSessionDuration = Number(durationResult[0]?.avg_duration || 0);

  // Top queries (from user messages)
  const topQueriesQuery = `
    SELECT content as query, COUNT(*) as count
    FROM conversation_logs
    WHERE role = 'user' ${dateFilter ? 'AND session_id IN (SELECT session_id FROM chat_sessions ' + dateFilter + ')' : ''}
    GROUP BY content
    ORDER BY count DESC
    LIMIT 10
  `;
  const topQueries = await executeQuery<QueryMetrics>(topQueriesQuery, dateFilter ? params : []);

  // Peak hours
  const peakHoursQuery = DB_TYPE === 'postgres'
    ? `SELECT EXTRACT(HOUR FROM timestamp) as hour, COUNT(*) as count
       FROM conversation_logs
       ${dateFilter ? 'WHERE session_id IN (SELECT session_id FROM chat_sessions ' + dateFilter + ')' : ''}
       GROUP BY hour
       ORDER BY count DESC
       LIMIT 24`
    : `SELECT HOUR(timestamp) as hour, COUNT(*) as count
       FROM conversation_logs
       ${dateFilter ? 'WHERE session_id IN (SELECT session_id FROM chat_sessions ' + dateFilter + ')' : ''}
       GROUP BY hour
       ORDER BY count DESC
       LIMIT 24`;
  
  const peakHours = await executeQuery<{ hour: number; count: number }>(peakHoursQuery, dateFilter ? params : []);

  return {
    totalSessions,
    totalMessages,
    avgMessagesPerSession: totalSessions > 0 ? totalMessages / totalSessions : 0,
    avgSessionDuration,
    topQueries,
    peakHours
  };
}

/**
 * Get session details
 */
export async function getSessionDetails(sessionId: string): Promise<{
  session: ChatSession;
  messages: ConversationLog[];
}> {
  const sessionQuery = DB_TYPE === 'postgres'
    ? 'SELECT * FROM chat_sessions WHERE session_id = $1'
    : 'SELECT * FROM chat_sessions WHERE session_id = ?';
  
  const sessions = await executeQuery<any>(sessionQuery, [sessionId]);
  
  const messagesQuery = DB_TYPE === 'postgres'
    ? 'SELECT * FROM conversation_logs WHERE session_id = $1 ORDER BY message_index ASC'
    : 'SELECT * FROM conversation_logs WHERE session_id = ? ORDER BY message_index ASC';
  
  const messages = await executeQuery<any>(messagesQuery, [sessionId]);

  return {
    session: sessions[0] || null,
    messages
  };
}

/**
 * Get recent sessions
 */
export async function getRecentSessions(limit: number = 50): Promise<ChatSession[]> {
  const query = DB_TYPE === 'postgres'
    ? 'SELECT * FROM chat_sessions ORDER BY start_time DESC LIMIT $1'
    : 'SELECT * FROM chat_sessions ORDER BY start_time DESC LIMIT ?';
  
  return executeQuery<ChatSession>(query, [limit]);
}

/**
 * Export analytics data as CSV
 */
export async function exportAnalyticsCSV(startDate?: Date, endDate?: Date): Promise<string> {
  const summary = await getAnalyticsSummary(startDate, endDate);
  
  let csv = 'Metric,Value\n';
  csv += `Total Sessions,${summary.totalSessions}\n`;
  csv += `Total Messages,${summary.totalMessages}\n`;
  csv += `Avg Messages/Session,${summary.avgMessagesPerSession.toFixed(2)}\n`;
  csv += `Avg Session Duration (seconds),${summary.avgSessionDuration.toFixed(0)}\n\n`;
  
  csv += 'Top Queries,Count\n';
  summary.topQueries.forEach(q => {
    csv += `"${q.query.replace(/"/g, '""')}",${q.count}\n`;
  });
  
  csv += '\nPeak Hour,Message Count\n';
  summary.peakHours.forEach(h => {
    csv += `${h.hour}:00,${h.count}\n`;
  });
  
  return csv;
}
