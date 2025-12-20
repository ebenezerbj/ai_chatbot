# Live Chat Implementation Guide

## Overview
This document describes the implementation of the real-time live chat feature that enables customers to chat directly with human agents inline within the chatbot interface.

## Architecture

### Components
1. **Backend WebSocket Server** (`src/liveChat.ts`)
   - Manages WebSocket connections using Socket.IO
   - Handles session management and message routing
   - Tracks agent availability and customer queues

2. **Agent Dashboard** (`public/agent-dashboard.html`)
   - Web interface for agents to view and respond to chats
   - Real-time notifications for new chat requests
   - Session management and typing indicators

3. **Customer Interface** (`public/index.html`)
   - Integrated live chat within existing chatbot
   - Seamless transition from AI to human agent
   - Real-time message delivery and typing indicators

4. **Database Tables**
   - `live_chat_sessions` - Tracks chat sessions
   - `live_chat_messages` - Stores all messages

## Features

### For Customers
- **Live Chat Request**: Click "Live Chat" button to request connection with agent
- **Real-time Messaging**: Send and receive messages instantly
- **Agent Status**: See when agent is typing
- **Session Management**: End chat when assistance is complete

### For Agents
- **Dashboard Login**: Simple agent ID and name login
- **Queue Management**: View waiting and active chats
- **Multi-Chat Support**: Handle multiple conversations simultaneously
- **Chat History**: View full conversation history
- **Typing Indicators**: See when customers are typing
- **Session Control**: Accept incoming chats and end completed sessions

## Database Schema

### live_chat_sessions
```sql
CREATE TABLE live_chat_sessions (
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
);
```

### live_chat_messages
```sql
CREATE TABLE live_chat_messages (
  message_id VARCHAR(255) PRIMARY KEY,
  session_id VARCHAR(255) NOT NULL,
  sender VARCHAR(50) NOT NULL CHECK (sender IN ('customer', 'agent')),
  sender_id VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES live_chat_sessions(session_id) ON DELETE CASCADE
);
```

## WebSocket Events

### Customer Events
- `customer:connect` - Establish customer connection
- `customer:request-chat` - Request new live chat session
- `customer:message` - Send message to agent
- `customer:typing` - Notify agent of typing
- `customer:end-chat` - End chat session

### Agent Events
- `agent:connect` - Establish agent connection
- `agent:accept-chat` - Accept waiting chat
- `agent:message` - Send message to customer
- `agent:typing` - Notify customer of typing
- `agent:end-chat` - End chat session

### Server Events (to Customer)
- `customer:session-created` - Chat request received
- `customer:agent-joined` - Agent accepted chat
- `customer:agent-message` - Message from agent
- `customer:agent-typing` - Agent is typing
- `customer:chat-ended` - Chat ended
- `customer:agent-disconnected` - Agent disconnected

### Server Events (to Agent)
- `agent:waiting-sessions` - List of waiting chats on connect
- `agent:new-chat-request` - New customer waiting
- `agent:chat-accepted` - Chat accepted confirmation
- `agent:customer-message` - Message from customer
- `agent:customer-typing` - Customer is typing
- `agent:customer-disconnected` - Customer disconnected
- `agent:customer-ended-chat` - Customer ended chat

## Usage

### Starting the Server
```bash
npm run build
npm start
```

The server will initialize with:
- Express HTTP server on port 4000
- Socket.IO WebSocket server attached
- Live Chat Manager initialized

### Agent Dashboard Access
Navigate to: `http://localhost:4000/agent-dashboard.html`

**Login Credentials:**
- Agent ID: Any unique identifier (e.g., "agent001")
- Agent Name: Your name (e.g., "John Doe")

### Customer Access
Customers access live chat through the main chatbot interface at `http://localhost:4000`

When they need human assistance:
1. Click "Live Chat" button (appears after AI suggests handover)
2. Wait for available agent
3. Chat with agent in real-time
4. End chat when complete

## Chat Flow

### 1. Customer Requests Chat
```javascript
// Customer clicks "Live Chat"
requestLiveChat(initialMessage);
// → Emits customer:request-chat
// → Server creates session with status 'waiting'
// → Server notifies all agents
```

### 2. Agent Accepts Chat
```javascript
// Agent clicks "Accept Chat"
socket.emit('agent:accept-chat', { sessionId, agentId });
// → Server updates session status to 'active'
// → Server sends chat history to agent
// → Server notifies customer that agent joined
```

### 3. Real-time Messaging
```javascript
// Customer sends message
socket.emit('customer:message', { sessionId, message });
// → Server saves to database
// → Server forwards to agent

// Agent sends message
socket.emit('agent:message', { sessionId, message });
// → Server saves to database
// → Server forwards to customer
```

### 4. Session End
```javascript
// Either party ends chat
socket.emit('agent:end-chat', { sessionId });
// OR
socket.emit('customer:end-chat', { sessionId });
// → Server updates session status to 'ended'
// → Server notifies other party
// → Agent marked as available
```

## Code Integration

### Backend Integration (src/index.ts)
```typescript
import { Server as SocketIOServer } from 'socket.io';
import { LiveChatManager } from './liveChat';

// Create HTTP server
const httpServer = http.createServer(app);

// Attach Socket.IO
const io = new SocketIOServer(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

// Initialize Live Chat
const pool = getPool();
const liveChatManager = new LiveChatManager(io, pool as any);

// Start server
httpServer.listen(port, () => {
  console.log(`✓ Live Chat: Enabled`);
});
```

### Frontend Integration (public/index.html)
```javascript
// Initialize Socket.IO client
let liveChatSocket = io();

// Request live chat
function requestLiveChat(initialMessage) {
  liveChatSocket.emit('customer:request-chat', {
    customerId: sessionId,
    customerName: 'Customer',
    message: initialMessage
  });
}

// Send message during live chat
function sendLiveChatMessage(message) {
  liveChatSocket.emit('customer:message', {
    sessionId: liveChatSessionId,
    message: message
  });
}
```

## Session Management

### Session States
1. **waiting** - Customer waiting for agent
2. **active** - Agent actively chatting with customer
3. **ended** - Chat completed

### Agent Status
1. **available** - Ready to accept chats
2. **busy** - Currently handling chat(s)

### Disconnection Handling
- **Customer disconnects**: Agent notified, can continue or end
- **Agent disconnects**: Customer returned to queue, notified of disconnection
- **Connection lost**: Automatic reconnection attempt by Socket.IO

## Error Handling

### Connection Errors
- Failed to create session → Customer notified
- Agent not found → Session remains in queue
- Message delivery failure → Error logged, user notified

### Edge Cases
- Multiple agents accepting same chat → First one wins
- Customer leaves during waiting → Session cleaned up
- Agent accepts then immediately disconnects → Customer re-queued

## Performance Considerations

### Scalability
- Current implementation: Single-server, in-memory state
- For multi-server: Implement Redis adapter for Socket.IO
- Session state: Persisted in database for recovery

### Database Indexes
- `idx_sessions_status` - Fast status filtering
- `idx_sessions_customer` - Customer lookup
- `idx_sessions_agent` - Agent assignment tracking
- `idx_messages_session` - Message history retrieval
- `idx_messages_timestamp` - Chronological sorting

## Testing

### Manual Testing Steps

**Test Customer Flow:**
1. Open `http://localhost:4000`
2. Trigger live chat request
3. Verify waiting message appears
4. Send test messages
5. End chat

**Test Agent Flow:**
1. Open `http://localhost:4000/agent-dashboard.html`
2. Login as agent
3. Verify waiting chats appear
4. Accept a chat
5. Send responses
6. End chat

**Test Edge Cases:**
1. Multiple agents viewing same request
2. Customer disconnects during chat
3. Agent disconnects during chat
4. Rapid message sending
5. Long messages with special characters

## Monitoring

### Key Metrics to Track
- Active sessions count
- Waiting queue length
- Average response time
- Agent utilization
- Session duration
- Messages per session

### Logging
All important events logged:
- Session creation
- Agent connections/disconnections
- Message delivery
- Errors and exceptions

## Future Enhancements

### Potential Improvements
1. **Agent Roles**: Admin, senior, junior agent permissions
2. **Chat Transfer**: Transfer chat between agents
3. **Canned Responses**: Quick reply templates
4. **File Sharing**: Send documents/images
5. **Chat History**: Customer can view past conversations
6. **Ratings**: Customer rates agent after chat
7. **Analytics Dashboard**: Real-time metrics and reporting
8. **Mobile App**: Native mobile agent dashboard
9. **Chat Routing**: Route to specific departments
10. **AI Assistance**: Suggest responses to agents

## Troubleshooting

### Common Issues

**Socket.IO not connecting**
- Check CORS settings
- Verify server is running
- Check network/firewall

**Messages not delivering**
- Verify session ID is correct
- Check database connection
- Inspect WebSocket events in browser console

**Agent dashboard not loading**
- Clear browser cache
- Check console for JavaScript errors
- Verify agent-dashboard.html is in public folder

**Database errors**
- Run migration: `node dist/migrations/createLiveChatTables.js`
- Verify database credentials
- Check table permissions

## Security Considerations

### Current Implementation
- Basic agent authentication (ID + Name)
- Session IDs are randomly generated
- Message sanitization on display

### Recommended Improvements
1. **Agent Authentication**: Integrate with proper auth system
2. **Rate Limiting**: Prevent spam/abuse
3. **Input Validation**: Sanitize all inputs
4. **Encryption**: Use WSS in production
5. **Session Timeout**: Auto-end inactive sessions
6. **Access Control**: Role-based permissions

## Deployment

### Production Checklist
- [ ] Enable HTTPS/WSS
- [ ] Configure proper CORS origins
- [ ] Set up Redis for Socket.IO (multi-server)
- [ ] Implement proper agent authentication
- [ ] Enable session timeout
- [ ] Set up monitoring/alerting
- [ ] Configure database backups
- [ ] Test failover scenarios
- [ ] Document agent onboarding process
- [ ] Create agent training materials

## Support

For issues or questions:
- Check server logs for errors
- Review WebSocket events in browser DevTools
- Verify database table structure
- Consult this documentation

---

**Last Updated**: December 2024
**Version**: 1.0.0
**Author**: AKCB Development Team
