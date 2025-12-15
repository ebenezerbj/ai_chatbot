/**
 * Analytics & Conversation Logging Module
 * Phase 1: Foundation for AI-driven customer engagement
 * Phase 2: Enhanced customer engagement features
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
  userId?: string; // Phase 2: Link to user profile
  userSegment?: string; // Phase 2: VIP, Regular, New, etc.
}

export interface ConversationLog {
  id?: number;
  sessionId: string;
  messageIndex: number;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: any; // Intent, sentiment, etc.
  feedbackScore?: number; // Phase 2: 1-5 rating or -1/1 for thumbs
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

// ===== Phase 2: User Engagement Types =====

export interface UserProfile {
  userId: string;
  firstSeen: Date;
  lastSeen: Date;
  totalSessions: number;
  totalMessages: number;
  preferredTopics: string[];
  segment: 'new' | 'regular' | 'vip' | 'inactive';
  averageSatisfaction?: number;
}

export interface UserPreference {
  userId: string;
  preferenceKey: string;
  preferenceValue: string;
  updatedAt: Date;
}

export interface Recommendation {
  type: 'product' | 'service' | 'content';
  title: string;
  description: string;
  relevanceScore: number;
  basedOn: string;
}

export interface Feedback {
  id?: number;
  sessionId: string;
  messageId: number;
  feedbackType: 'thumbs' | 'rating' | 'nps';
  score: number; // -1/1 for thumbs, 1-5 for rating, 0-10 for NPS
  comment?: string;
  timestamp: Date;
}

export interface FollowUp {
  id?: number;
  userId: string;
  sessionId: string;
  topic: string;
  action: string;
  completed: boolean;
  createdAt: Date;
  completedAt?: Date;
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

  // ===== Phase 2: Additional Tables =====
  console.log('[Analytics] Initializing Phase 2 engagement tables...');
  
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
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES chat_sessions(session_id) ON DELETE CASCADE
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
        completed_at TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES chat_sessions(session_id) ON DELETE CASCADE
      )
    `);

    // Indexes
    await executeQuery(`CREATE INDEX IF NOT EXISTS idx_user_profiles_segment ON user_profiles(segment)`);
    await executeQuery(`CREATE INDEX IF NOT EXISTS idx_user_profiles_last_seen ON user_profiles(last_seen)`);
    await executeQuery(`CREATE INDEX IF NOT EXISTS idx_feedback_session ON feedback(session_id)`);
    await executeQuery(`CREATE INDEX IF NOT EXISTS idx_followups_user ON follow_ups(user_id)`);
    await executeQuery(`CREATE INDEX IF NOT EXISTS idx_followups_completed ON follow_ups(completed)`);

  } else {
    // MySQL schema
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
        FOREIGN KEY (session_id) REFERENCES chat_sessions(session_id) ON DELETE CASCADE,
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
        FOREIGN KEY (session_id) REFERENCES chat_sessions(session_id) ON DELETE CASCADE,
        INDEX idx_user (user_id),
        INDEX idx_completed (completed)
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

// ===== Phase 2: User Engagement Functions =====

/**
 * Get or create user profile based on IP address (simple fingerprinting)
 */
export async function getOrCreateUserProfile(ipAddress: string): Promise<UserProfile> {
  const userId = `user_${Buffer.from(ipAddress).toString('base64').replace(/[^a-zA-Z0-9]/g, '')}`;
  
  const query = DB_TYPE === 'postgres'
    ? 'SELECT * FROM user_profiles WHERE user_id = $1'
    : 'SELECT * FROM user_profiles WHERE user_id = ?';
  
  const existing = await executeQuery<any>(query, [userId]);
  
  if (existing.length > 0) {
    return {
      userId: existing[0].user_id,
      firstSeen: existing[0].first_seen,
      lastSeen: existing[0].last_seen,
      totalSessions: existing[0].total_sessions,
      totalMessages: existing[0].total_messages,
      preferredTopics: existing[0].preferred_topics ? JSON.parse(existing[0].preferred_topics) : [],
      segment: existing[0].segment,
      averageSatisfaction: existing[0].average_satisfaction
    };
  }
  
  // Create new profile
  const insertQuery = DB_TYPE === 'postgres'
    ? 'INSERT INTO user_profiles (user_id) VALUES ($1)'
    : 'INSERT INTO user_profiles (user_id) VALUES (?)';
  
  await executeQuery(insertQuery, [userId]);
  
  return {
    userId,
    firstSeen: new Date(),
    lastSeen: new Date(),
    totalSessions: 0,
    totalMessages: 0,
    preferredTopics: [],
    segment: 'new'
  };
}

/**
 * Update user profile stats
 */
export async function updateUserProfile(
  userId: string,
  sessionCount: number,
  messageCount: number
): Promise<void> {
  const updateQuery = DB_TYPE === 'postgres'
    ? `UPDATE user_profiles 
       SET last_seen = CURRENT_TIMESTAMP,
           total_sessions = $1,
           total_messages = $2,
           segment = CASE 
             WHEN $1 >= 20 THEN 'vip'
             WHEN $1 >= 5 THEN 'regular'
             WHEN EXTRACT(DAY FROM CURRENT_TIMESTAMP - last_seen) > 30 THEN 'inactive'
             ELSE 'new'
           END
       WHERE user_id = $3`
    : `UPDATE user_profiles 
       SET last_seen = CURRENT_TIMESTAMP,
           total_sessions = ?,
           total_messages = ?,
           segment = CASE 
             WHEN ? >= 20 THEN 'vip'
             WHEN ? >= 5 THEN 'regular'
             WHEN DATEDIFF(CURRENT_TIMESTAMP, last_seen) > 30 THEN 'inactive'
             ELSE 'new'
           END
       WHERE user_id = ?`;
  
  const params = DB_TYPE === 'postgres' 
    ? [sessionCount, messageCount, userId]
    : [sessionCount, messageCount, sessionCount, sessionCount, userId];
  
  await executeQuery(updateQuery, params);
}

/**
 * Get personalized greeting for returning user
 */
export async function getPersonalizedGreeting(userId: string): Promise<string | null> {
  const profile = await getOrCreateUserProfile(userId);
  
  if (profile.totalSessions === 0) {
    return null; // First time visitor - use default greeting
  }
  
  // Get last conversation topic
  const topicQuery = DB_TYPE === 'postgres'
    ? `SELECT content FROM conversation_logs cl
       JOIN chat_sessions cs ON cl.session_id = cs.session_id
       WHERE cs.ip_address = (SELECT ip_address FROM chat_sessions WHERE session_id = 
         (SELECT session_id FROM chat_sessions ORDER BY start_time DESC LIMIT 1 OFFSET 1))
       AND cl.role = 'user'
       ORDER BY cl.timestamp DESC
       LIMIT 1`
    : `SELECT content FROM conversation_logs cl
       JOIN chat_sessions cs ON cl.session_id = cs.session_id
       WHERE cs.ip_address = (SELECT ip_address FROM chat_sessions ORDER BY start_time DESC LIMIT 1 OFFSET 1, 1)
       AND cl.role = 'user'
       ORDER BY cl.timestamp DESC
       LIMIT 1`;
  
  const lastTopicResult = await executeQuery<{ content: string }>(topicQuery, []);
  const lastTopic = lastTopicResult[0]?.content;
  
  // Generate personalized greeting based on segment
  let greeting = "Welcome back! ";
  
  if (profile.segment === 'vip') {
    greeting = "Welcome back, valued customer! ";
  } else if (profile.segment === 'regular') {
    greeting = "Great to see you again! ";
  }
  
  if (lastTopic) {
    const topicHint = lastTopic.substring(0, 50);
    greeting += `Last time we discussed "${topicHint}...". `;
  }
  
  greeting += "How can I assist you today?";
  
  return greeting;
}

/**
 * Generate smart recommendations based on conversation history
 */
export async function generateRecommendations(sessionId: string): Promise<Recommendation[]> {
  // Get conversation history
  const messagesQuery = DB_TYPE === 'postgres'
    ? 'SELECT content FROM conversation_logs WHERE session_id = $1 AND role = \'user\' ORDER BY timestamp DESC LIMIT 10'
    : 'SELECT content FROM conversation_logs WHERE session_id = ? AND role = \'user\' ORDER BY timestamp DESC LIMIT 10';
  
  const messages = await executeQuery<{ content: string }>(messagesQuery, [sessionId]);
  const conversationText = messages.map(m => m.content.toLowerCase()).join(' ');
  
  const recommendations: Recommendation[] = [];
  
  // Rule-based recommendations
  if (conversationText.includes('loan') || conversationText.includes('borrow')) {
    recommendations.push({
      type: 'product',
      title: 'Personal Loan Calculator',
      description: 'Estimate your monthly payments and see how much you can borrow.',
      relevanceScore: 0.9,
      basedOn: 'Your interest in loans'
    });
    
    if (conversationText.includes('business')) {
      recommendations.push({
        type: 'product',
        title: 'Business Loan Options',
        description: 'Flexible financing solutions for your business growth.',
        relevanceScore: 0.85,
        basedOn: 'Your business loan inquiry'
      });
    }
  }
  
  if (conversationText.includes('save') || conversationText.includes('savings') || conversationText.includes('deposit')) {
    recommendations.push({
      type: 'product',
      title: 'Fixed Deposit Account',
      description: 'Earn higher interest rates with our fixed deposit accounts.',
      relevanceScore: 0.88,
      basedOn: 'Your interest in savings'
    });
    
    recommendations.push({
      type: 'service',
      title: 'Savings Goals Planner',
      description: 'Set and track your savings goals with our planning tool.',
      relevanceScore: 0.75,
      basedOn: 'Your savings inquiry'
    });
  }
  
  if (conversationText.includes('branch') || conversationText.includes('location')) {
    recommendations.push({
      type: 'service',
      title: 'Mobile Banking App',
      description: 'Bank anywhere, anytime with our mobile app.',
      relevanceScore: 0.7,
      basedOn: 'Your branch location inquiry'
    });
  }
  
  if (conversationText.includes('account') || conversationText.includes('balance')) {
    recommendations.push({
      type: 'service',
      title: 'SMS Banking Alerts',
      description: 'Get instant notifications for all your transactions.',
      relevanceScore: 0.72,
      basedOn: 'Your account activity'
    });
  }
  
  // Sort by relevance
  return recommendations.sort((a, b) => b.relevanceScore - a.relevanceScore).slice(0, 3);
}

/**
 * Save feedback
 */
export async function saveFeedback(
  sessionId: string,
  messageId: number,
  feedbackType: 'thumbs' | 'rating' | 'nps',
  score: number,
  comment?: string
): Promise<void> {
  const query = DB_TYPE === 'postgres'
    ? 'INSERT INTO feedback (session_id, message_id, feedback_type, score, comment) VALUES ($1, $2, $3, $4, $5)'
    : 'INSERT INTO feedback (session_id, message_id, feedback_type, score, comment) VALUES (?, ?, ?, ?, ?)';
  
  await executeQuery(query, [sessionId, messageId, feedbackType, score, comment || null]);
  
  console.log(`[Feedback] Saved ${feedbackType} feedback: ${score} for session ${sessionId}`);
}

/**
 * Get average satisfaction for a user
 */
export async function getUserSatisfaction(userId: string): Promise<number | null> {
  const query = DB_TYPE === 'postgres'
    ? `SELECT AVG(score) as avg_score FROM feedback f
       JOIN chat_sessions cs ON f.session_id = cs.session_id
       WHERE cs.ip_address = (SELECT ip_address FROM chat_sessions WHERE session_id LIKE $1 LIMIT 1)
       AND feedback_type = 'rating'`
    : `SELECT AVG(score) as avg_score FROM feedback f
       JOIN chat_sessions cs ON f.session_id = cs.session_id
       WHERE cs.ip_address = (SELECT ip_address FROM chat_sessions WHERE session_id LIKE ? LIMIT 1)
       AND feedback_type = 'rating'`;
  
  const result = await executeQuery<{ avg_score: number }>(query, [`%${userId}%`]);
  return result[0]?.avg_score || null;
}

/**
 * Create follow-up action
 */
export async function createFollowUp(
  userId: string,
  sessionId: string,
  topic: string,
  action: string
): Promise<void> {
  const query = DB_TYPE === 'postgres'
    ? 'INSERT INTO follow_ups (user_id, session_id, topic, action) VALUES ($1, $2, $3, $4)'
    : 'INSERT INTO follow_ups (user_id, session_id, topic, action) VALUES (?, ?, ?, ?)';
  
  await executeQuery(query, [userId, sessionId, topic, action]);
  console.log(`[FollowUp] Created follow-up for user ${userId}: ${action}`);
}

/**
 * Get pending follow-ups for a user
 */
export async function getPendingFollowUps(userId: string): Promise<FollowUp[]> {
  const query = DB_TYPE === 'postgres'
    ? 'SELECT * FROM follow_ups WHERE user_id = $1 AND completed = FALSE ORDER BY created_at DESC LIMIT 3'
    : 'SELECT * FROM follow_ups WHERE user_id = ? AND completed = FALSE ORDER BY created_at DESC LIMIT 3';
  
  return executeQuery<FollowUp>(query, [userId]);
}

/**
 * Mark follow-up as completed
 */
export async function completeFollowUp(followUpId: number): Promise<void> {
  const query = DB_TYPE === 'postgres'
    ? 'UPDATE follow_ups SET completed = TRUE, completed_at = CURRENT_TIMESTAMP WHERE id = $1'
    : 'UPDATE follow_ups SET completed = TRUE, completed_at = CURRENT_TIMESTAMP WHERE id = ?';
  
  await executeQuery(query, [followUpId]);
}

/**
 * Get user segment distribution
 */
export async function getSegmentDistribution(): Promise<{ segment: string; count: number }[]> {
  const query = 'SELECT segment, COUNT(*) as count FROM user_profiles GROUP BY segment ORDER BY count DESC';
  return executeQuery<{ segment: string; count: number }>(query, []);
}

/**
 * Set user preference
 */
export async function setUserPreference(
  userId: string,
  key: string,
  value: string
): Promise<void> {
  const query = DB_TYPE === 'postgres'
    ? `INSERT INTO user_preferences (user_id, preference_key, preference_value) 
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, preference_key) 
       DO UPDATE SET preference_value = $3, updated_at = CURRENT_TIMESTAMP`
    : `INSERT INTO user_preferences (user_id, preference_key, preference_value) 
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE preference_value = ?, updated_at = CURRENT_TIMESTAMP`;
  
  const params = DB_TYPE === 'postgres' ? [userId, key, value] : [userId, key, value, value];
  await executeQuery(query, params);
}

/**
 * Get user preference
 */
export async function getUserPreference(userId: string, key: string): Promise<string | null> {
  const query = DB_TYPE === 'postgres'
    ? 'SELECT preference_value FROM user_preferences WHERE user_id = $1 AND preference_key = $2'
    : 'SELECT preference_value FROM user_preferences WHERE user_id = ? AND preference_key = ?';
  
  const result = await executeQuery<{ preference_value: string }>(query, [userId, key]);
  return result[0]?.preference_value || null;
}

