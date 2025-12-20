import { Server, Socket } from 'socket.io';
import { Pool } from 'pg';

interface LiveChatSession {
  sessionId: string;
  customerId: string;
  customerName: string;
  agentId?: string;
  agentName?: string;
  status: 'waiting' | 'active' | 'ended';
  startedAt: Date;
  endedAt?: Date;
}

interface ChatMessage {
  messageId: string;
  sessionId: string;
  sender: 'customer' | 'agent';
  senderId: string;
  message: string;
  timestamp: Date;
}

interface ConnectedAgent {
  socketId: string;
  agentId: string;
  agentName: string;
  status: 'available' | 'busy';
  activeSessions: string[];
}

interface ConnectedCustomer {
  socketId: string;
  customerId: string;
  customerName: string;
  sessionId?: string;
}

class LiveChatManager {
  private io: Server;
  private pool: Pool;
  private agents: Map<string, ConnectedAgent> = new Map();
  private customers: Map<string, ConnectedCustomer> = new Map();
  private sessions: Map<string, LiveChatSession> = new Map();

  constructor(io: Server, pool: Pool) {
    this.io = io;
    this.pool = pool;
    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket: Socket) => {
      console.log(`New connection: ${socket.id}`);

      // Agent connection
      socket.on('agent:connect', async (data: { agentId: string; agentName: string }) => {
        this.handleAgentConnect(socket, data);
      });

      // Customer connection
      socket.on('customer:connect', async (data: { customerId: string; customerName: string }) => {
        this.handleCustomerConnect(socket, data);
      });

      // Customer requests live chat
      socket.on('customer:request-chat', async (data: { customerId: string; customerName: string; message: string }) => {
        await this.handleCustomerRequestChat(socket, data);
      });

      // Customer sends message
      socket.on('customer:message', async (data: { sessionId: string; message: string }) => {
        await this.handleCustomerMessage(socket, data);
      });

      // Agent accepts chat
      socket.on('agent:accept-chat', async (data: { sessionId: string; agentId: string }) => {
        await this.handleAgentAcceptChat(socket, data);
      });

      // Agent sends message
      socket.on('agent:message', async (data: { sessionId: string; message: string }) => {
        await this.handleAgentMessage(socket, data);
      });

      // Agent ends chat
      socket.on('agent:end-chat', async (data: { sessionId: string }) => {
        await this.handleAgentEndChat(socket, data);
      });

      // Customer ends chat
      socket.on('customer:end-chat', async (data: { sessionId: string }) => {
        await this.handleCustomerEndChat(socket, data);
      });

      // Agent typing indicator
      socket.on('agent:typing', (data: { sessionId: string }) => {
        this.handleAgentTyping(socket, data);
      });

      // Customer typing indicator
      socket.on('customer:typing', (data: { sessionId: string }) => {
        this.handleCustomerTyping(socket, data);
      });

      // Disconnect
      socket.on('disconnect', () => {
        this.handleDisconnect(socket);
      });
    });
  }

  private handleAgentConnect(socket: Socket, data: { agentId: string; agentName: string }) {
    const agent: ConnectedAgent = {
      socketId: socket.id,
      agentId: data.agentId,
      agentName: data.agentName,
      status: 'available',
      activeSessions: []
    };

    this.agents.set(socket.id, agent);
    socket.join('agents');

    console.log(`Agent connected: ${data.agentName} (${data.agentId})`);

    // Send current waiting sessions to agent
    const waitingSessions = Array.from(this.sessions.values())
      .filter(session => session.status === 'waiting');

    socket.emit('agent:waiting-sessions', waitingSessions);

    // Notify all agents about new agent online
    this.io.to('agents').emit('agent:online', {
      agentId: data.agentId,
      agentName: data.agentName
    });
  }

  private handleCustomerConnect(socket: Socket, data: { customerId: string; customerName: string }) {
    const customer: ConnectedCustomer = {
      socketId: socket.id,
      customerId: data.customerId,
      customerName: data.customerName
    };

    this.customers.set(socket.id, customer);
    console.log(`Customer connected: ${data.customerName} (${data.customerId})`);
  }

  private async handleCustomerRequestChat(socket: Socket, data: { customerId: string; customerName: string; message: string }) {
    try {
      // Generate session ID
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Create session in database
      const result = await this.pool.query(
        `INSERT INTO live_chat_sessions (session_id, customer_id, customer_name, status, started_at)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [sessionId, data.customerId, data.customerName, 'waiting', new Date()]
      );

      const session: LiveChatSession = {
        sessionId,
        customerId: data.customerId,
        customerName: data.customerName,
        status: 'waiting',
        startedAt: new Date()
      };

      this.sessions.set(sessionId, session);

      // Update customer socket with session ID
      const customer = this.customers.get(socket.id);
      if (customer) {
        customer.sessionId = sessionId;
      }

      // Store initial message
      if (data.message) {
        await this.saveMessage(sessionId, 'customer', data.customerId, data.message);
      }

      // Notify customer
      socket.emit('customer:session-created', {
        sessionId,
        status: 'waiting',
        message: 'Your request has been sent. Waiting for an available agent...'
      });

      // Notify all agents about new chat request
      this.io.to('agents').emit('agent:new-chat-request', {
        sessionId,
        customerId: data.customerId,
        customerName: data.customerName,
        message: data.message,
        timestamp: new Date()
      });

      console.log(`New chat request: ${sessionId} from ${data.customerName}`);
    } catch (error) {
      console.error('Error creating chat session:', error);
      socket.emit('error', { message: 'Failed to create chat session' });
    }
  }

  private async handleAgentAcceptChat(socket: Socket, data: { sessionId: string; agentId: string }) {
    try {
      const session = this.sessions.get(data.sessionId);
      const agent = this.agents.get(socket.id);

      if (!session || !agent) {
        socket.emit('error', { message: 'Invalid session or agent' });
        return;
      }

      // Update session
      session.status = 'active';
      session.agentId = data.agentId;
      session.agentName = agent.agentName;

      // Update database
      await this.pool.query(
        `UPDATE live_chat_sessions 
         SET agent_id = $1, agent_name = $2, status = $3
         WHERE session_id = $4`,
        [data.agentId, agent.agentName, 'active', data.sessionId]
      );

      // Update agent status
      agent.status = 'busy';
      agent.activeSessions.push(data.sessionId);

      // Get chat history
      const historyResult = await this.pool.query(
        `SELECT * FROM live_chat_messages 
         WHERE session_id = $1 
         ORDER BY timestamp ASC`,
        [data.sessionId]
      );

      // Notify agent
      socket.emit('agent:chat-accepted', {
        sessionId: data.sessionId,
        customer: {
          customerId: session.customerId,
          customerName: session.customerName
        },
        history: historyResult.rows
      });

      // Find customer socket and notify
      const customerSocket = Array.from(this.customers.entries())
        .find(([_, c]) => c.sessionId === data.sessionId);

      if (customerSocket) {
        this.io.to(customerSocket[0]).emit('customer:agent-joined', {
          agentName: agent.agentName,
          message: `${agent.agentName} has joined the chat. How can I help you?`
        });
      }

      console.log(`Agent ${agent.agentName} accepted chat ${data.sessionId}`);
    } catch (error) {
      console.error('Error accepting chat:', error);
      socket.emit('error', { message: 'Failed to accept chat' });
    }
  }

  private async handleCustomerMessage(socket: Socket, data: { sessionId: string; message: string }) {
    try {
      const customer = this.customers.get(socket.id);
      const session = this.sessions.get(data.sessionId);

      if (!customer || !session) {
        socket.emit('error', { message: 'Invalid session' });
        return;
      }

      // Save message to database
      const messageId = await this.saveMessage(
        data.sessionId,
        'customer',
        customer.customerId,
        data.message
      );

      // Find agent socket
      const agentSocket = Array.from(this.agents.entries())
        .find(([_, a]) => a.activeSessions.includes(data.sessionId));

      // Emit message to agent
      if (agentSocket) {
        this.io.to(agentSocket[0]).emit('agent:customer-message', {
          sessionId: data.sessionId,
          messageId,
          message: data.message,
          customerName: customer.customerName,
          timestamp: new Date()
        });
      }

      // Confirm to customer
      socket.emit('customer:message-sent', {
        messageId,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error handling customer message:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  }

  private async handleAgentMessage(socket: Socket, data: { sessionId: string; message: string }) {
    try {
      const agent = this.agents.get(socket.id);
      const session = this.sessions.get(data.sessionId);

      if (!agent || !session) {
        socket.emit('error', { message: 'Invalid session' });
        return;
      }

      // Save message to database
      const messageId = await this.saveMessage(
        data.sessionId,
        'agent',
        agent.agentId,
        data.message
      );

      // Find customer socket
      const customerSocket = Array.from(this.customers.entries())
        .find(([_, c]) => c.sessionId === data.sessionId);

      // Emit message to customer
      if (customerSocket) {
        this.io.to(customerSocket[0]).emit('customer:agent-message', {
          sessionId: data.sessionId,
          messageId,
          message: data.message,
          agentName: agent.agentName,
          timestamp: new Date()
        });
      }

      // Confirm to agent
      socket.emit('agent:message-sent', {
        messageId,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error handling agent message:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  }

  private async handleAgentEndChat(socket: Socket, data: { sessionId: string }) {
    try {
      const session = this.sessions.get(data.sessionId);
      const agent = this.agents.get(socket.id);

      if (!session || !agent) {
        socket.emit('error', { message: 'Invalid session' });
        return;
      }

      // Update session
      session.status = 'ended';
      session.endedAt = new Date();

      // Update database
      await this.pool.query(
        `UPDATE live_chat_sessions 
         SET status = $1, ended_at = $2
         WHERE session_id = $3`,
        ['ended', session.endedAt, data.sessionId]
      );

      // Update agent status
      agent.activeSessions = agent.activeSessions.filter(s => s !== data.sessionId);
      if (agent.activeSessions.length === 0) {
        agent.status = 'available';
      }

      // Find customer socket and notify
      const customerSocket = Array.from(this.customers.entries())
        .find(([_, c]) => c.sessionId === data.sessionId);

      if (customerSocket) {
        this.io.to(customerSocket[0]).emit('customer:chat-ended', {
          message: 'The agent has ended the chat. Thank you for contacting us!'
        });

        // Clear customer session
        const customer = this.customers.get(customerSocket[0]);
        if (customer) {
          customer.sessionId = undefined;
        }
      }

      // Notify agent
      socket.emit('agent:chat-ended', {
        sessionId: data.sessionId
      });

      console.log(`Chat ${data.sessionId} ended by agent ${agent.agentName}`);
    } catch (error) {
      console.error('Error ending chat:', error);
      socket.emit('error', { message: 'Failed to end chat' });
    }
  }

  private async handleCustomerEndChat(socket: Socket, data: { sessionId: string }) {
    try {
      const session = this.sessions.get(data.sessionId);
      const customer = this.customers.get(socket.id);

      if (!session || !customer) {
        socket.emit('error', { message: 'Invalid session' });
        return;
      }

      // Update session
      session.status = 'ended';
      session.endedAt = new Date();

      // Update database
      await this.pool.query(
        `UPDATE live_chat_sessions 
         SET status = $1, ended_at = $2
         WHERE session_id = $3`,
        ['ended', session.endedAt, data.sessionId]
      );

      // Find agent socket and notify
      const agentSocket = Array.from(this.agents.entries())
        .find(([_, a]) => a.activeSessions.includes(data.sessionId));

      if (agentSocket) {
        const agent = this.agents.get(agentSocket[0]);
        if (agent) {
          agent.activeSessions = agent.activeSessions.filter(s => s !== data.sessionId);
          if (agent.activeSessions.length === 0) {
            agent.status = 'available';
          }
        }

        this.io.to(agentSocket[0]).emit('agent:customer-ended-chat', {
          sessionId: data.sessionId,
          message: 'The customer has ended the chat.'
        });
      }

      // Notify customer
      socket.emit('customer:chat-ended', {
        message: 'Chat ended. Thank you for contacting us!'
      });

      // Clear customer session
      customer.sessionId = undefined;

      console.log(`Chat ${data.sessionId} ended by customer ${customer.customerName}`);
    } catch (error) {
      console.error('Error ending chat:', error);
      socket.emit('error', { message: 'Failed to end chat' });
    }
  }

  private handleAgentTyping(socket: Socket, data: { sessionId: string }) {
    // Find customer socket and notify
    const customerSocket = Array.from(this.customers.entries())
      .find(([_, c]) => c.sessionId === data.sessionId);

    if (customerSocket) {
      this.io.to(customerSocket[0]).emit('customer:agent-typing', {
        sessionId: data.sessionId
      });
    }
  }

  private handleCustomerTyping(socket: Socket, data: { sessionId: string }) {
    // Find agent socket and notify
    const agentSocket = Array.from(this.agents.entries())
      .find(([_, a]) => a.activeSessions.includes(data.sessionId));

    if (agentSocket) {
      this.io.to(agentSocket[0]).emit('agent:customer-typing', {
        sessionId: data.sessionId
      });
    }
  }

  private handleDisconnect(socket: Socket) {
    // Check if agent disconnected
    const agent = this.agents.get(socket.id);
    if (agent) {
      console.log(`Agent disconnected: ${agent.agentName}`);

      // Notify all agents
      this.io.to('agents').emit('agent:offline', {
        agentId: agent.agentId,
        agentName: agent.agentName
      });

      // Handle active sessions
      for (const sessionId of agent.activeSessions) {
        const session = this.sessions.get(sessionId);
        if (session) {
          session.status = 'waiting';
          session.agentId = undefined;
          session.agentName = undefined;

          // Notify customer
          const customerSocket = Array.from(this.customers.entries())
            .find(([_, c]) => c.sessionId === sessionId);

          if (customerSocket) {
            this.io.to(customerSocket[0]).emit('customer:agent-disconnected', {
              message: 'The agent has disconnected. You have been placed back in the queue.'
            });
          }

          // Notify other agents
          this.io.to('agents').emit('agent:new-chat-request', {
            sessionId: session.sessionId,
            customerId: session.customerId,
            customerName: session.customerName,
            message: 'Agent disconnected - customer reconnected to queue',
            timestamp: new Date()
          });
        }
      }

      this.agents.delete(socket.id);
      return;
    }

    // Check if customer disconnected
    const customer = this.customers.get(socket.id);
    if (customer) {
      console.log(`Customer disconnected: ${customer.customerName}`);

      // If customer had an active session, notify agent
      if (customer.sessionId) {
        const agentSocket = Array.from(this.agents.entries())
          .find(([_, a]) => a.activeSessions.includes(customer.sessionId!));

        if (agentSocket) {
          this.io.to(agentSocket[0]).emit('agent:customer-disconnected', {
            sessionId: customer.sessionId,
            message: 'Customer has disconnected.'
          });
        }
      }

      this.customers.delete(socket.id);
    }
  }

  private async saveMessage(
    sessionId: string,
    sender: 'customer' | 'agent',
    senderId: string,
    message: string
  ): Promise<string> {
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    await this.pool.query(
      `INSERT INTO live_chat_messages (message_id, session_id, sender, sender_id, message, timestamp)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [messageId, sessionId, sender, senderId, message, new Date()]
    );

    return messageId;
  }

  // Public methods for external use
  public getActiveSessions(): LiveChatSession[] {
    return Array.from(this.sessions.values()).filter(s => s.status === 'active');
  }

  public getWaitingSessions(): LiveChatSession[] {
    return Array.from(this.sessions.values()).filter(s => s.status === 'waiting');
  }

  public getOnlineAgents(): ConnectedAgent[] {
    return Array.from(this.agents.values());
  }

  public async getChatHistory(sessionId: string): Promise<ChatMessage[]> {
    const result = await this.pool.query(
      `SELECT * FROM live_chat_messages 
       WHERE session_id = $1 
       ORDER BY timestamp ASC`,
      [sessionId]
    );
    return result.rows;
  }
}

export { LiveChatManager, LiveChatSession, ChatMessage, ConnectedAgent, ConnectedCustomer };
