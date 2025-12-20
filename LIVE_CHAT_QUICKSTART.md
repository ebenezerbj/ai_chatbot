# Live Chat Quick Start Guide

## 🚀 What's New?
Real-time live chat with human agents is now available! Customers can seamlessly transition from AI assistance to chatting with a live agent.

## ✨ Features
- **Inline Live Chat**: Chat with agents directly in the chatbot interface
- **Real-time Messaging**: Instant message delivery
- **Queue Management**: Automatic routing to available agents
- **Typing Indicators**: See when the other person is typing
- **Session History**: All conversations saved to database

## 🎯 Quick Start

### For Agents

1. **Open Agent Dashboard**
   ```
   http://localhost:4000/agent-dashboard.html
   ```

2. **Login**
   - Agent ID: `agent001` (or any unique ID)
   - Agent Name: Your name

3. **Accept Chats**
   - Waiting chats appear in the sidebar
   - Click on a chat to view details
   - Click "Accept Chat" to start helping

4. **Respond to Customers**
   - Type your message in the input box
   - Press Enter or click "Send"
   - Click "End Chat" when complete

### For Customers

1. **Request Live Chat**
   - Chat with the AI bot as usual
   - When you need human help, click "Live Chat" button
   - Wait for an available agent (usually < 1 minute)

2. **Chat with Agent**
   - Your chat history is shared with the agent
   - Messages appear instantly
   - Agent's name is shown in the chat

3. **End Chat**
   - Say "thank you" or click End Chat
   - Return to AI bot if needed

## 📊 How It Works

```
Customer Requests Help
        ↓
Enters Queue (status: waiting)
        ↓
Agent Accepts Chat
        ↓
Live Conversation (status: active)
        ↓
Chat Ends (status: ended)
        ↓
Session Saved to Database
```

## 🔧 Technical Details

### System Requirements
- Node.js 18+
- MySQL or PostgreSQL database
- Modern web browser (Chrome, Firefox, Safari, Edge)

### Server Status
Check server logs for:
```
✓ Live Chat: Enabled
```

### Database Tables
- `live_chat_sessions` - Active and historical sessions
- `live_chat_messages` - All messages exchanged

### WebSocket Connection
- Protocol: Socket.IO (WebSocket with fallbacks)
- Port: Same as HTTP server (4000)
- Auto-reconnection: Enabled

## 🎨 User Interface

### Agent Dashboard
- **Sidebar**: List of waiting and active chats
- **Main Area**: Current conversation
- **Stats**: Number of waiting/active chats
- **Actions**: Accept, Send, End Chat

### Customer Interface
- **Live Chat Button**: Appears with handover suggestions
- **Visual Indicator**: Agent name shown when connected
- **Status Messages**: "Waiting for agent..." or "Chatting with [Agent Name]"

## 📝 Best Practices

### For Agents
1. **Accept chats promptly** - Customers are waiting
2. **Review chat history** - Understand context before responding
3. **Be professional** - You represent the bank
4. **Use proper grammar** - Messages are saved
5. **End chats properly** - Don't just disconnect

### For System Administrators
1. **Monitor queue** - Ensure customers aren't waiting too long
2. **Check logs** - Watch for connection issues
3. **Review sessions** - Analyze agent performance
4. **Scale agents** - Add more during peak hours
5. **Backup data** - Sessions contain important info

## 🐛 Troubleshooting

### Agent Can't Login
- Check if server is running
- Open browser console for errors
- Verify URL is correct

### Messages Not Sending
- Check internet connection
- Reload page to reconnect
- Check server logs for errors

### Customer Stuck in Queue
- Verify agents are logged in
- Check agent status (available vs busy)
- Review server logs for session errors

### Database Issues
Run migration if tables don't exist:
```bash
node dist/migrations/createLiveChatTables.js
```

## 📞 Integration Points

### With Existing Handover System
- Live Chat is **separate** from branch handover
- Branch handover routes to physical locations
- Live Chat connects to online agents
- Both options presented to customers

### With AI Chatbot
- AI handles initial queries
- Suggests live chat when needed
- Seamless transition to human agent
- Customer can return to AI after chat

## 🔐 Security Notes

**Current Implementation:**
- Basic agent authentication (development)
- Session IDs are secure random strings
- Messages stored in database

**Production Recommendations:**
- Implement proper agent authentication
- Enable HTTPS/WSS
- Add rate limiting
- Set up monitoring/alerts

## 📈 Monitoring

### Key Metrics
View in database:
```sql
-- Active sessions
SELECT COUNT(*) FROM live_chat_sessions WHERE status = 'active';

-- Waiting customers
SELECT COUNT(*) FROM live_chat_sessions WHERE status = 'waiting';

-- Today's chats
SELECT COUNT(*) FROM live_chat_sessions 
WHERE DATE(started_at) = CURDATE();
```

### Agent Performance
```sql
-- Messages sent by agent
SELECT agent_name, COUNT(*) as message_count
FROM live_chat_messages m
JOIN live_chat_sessions s ON m.session_id = s.session_id
WHERE sender = 'agent'
GROUP BY agent_name;
```

## 🎓 Training

### For New Agents
1. Complete agent onboarding
2. Practice on test environment
3. Shadow experienced agent
4. Handle supervised chats
5. Go solo with support

### Sample Responses
**Greeting:**
> "Hello! I'm [Name] from customer service. I've reviewed your inquiry about [topic]. How can I help you today?"

**Transfer:**
> "Let me look into that for you. One moment please..."

**Closing:**
> "Is there anything else I can help you with today?"

## 🚀 Next Steps

1. **Test the system**
   - Login as agent
   - Open customer chat in another browser
   - Test full conversation flow

2. **Train your team**
   - Share this guide with agents
   - Conduct training sessions
   - Set up practice environment

3. **Monitor performance**
   - Track response times
   - Review customer satisfaction
   - Optimize agent availability

4. **Gather feedback**
   - Survey customers
   - Get agent input
   - Iterate and improve

## 📚 Additional Resources

- **Full Documentation**: See `LIVE_CHAT_GUIDE.md`
- **API Reference**: See `src/liveChat.ts` code comments
- **Database Schema**: See migration file
- **WebSocket Events**: See documentation for event list

## 💡 Tips

- **Multiple Tabs**: Agents can handle multiple chats
- **Keyboard Shortcuts**: Enter to send, Shift+Enter for new line
- **Notification Sound**: Plays when new chat arrives
- **Auto-scroll**: Chat automatically scrolls to latest message

---

**Need Help?** Contact the development team or check server logs for diagnostic information.

**Version**: 1.0.0 | **Last Updated**: December 2024
