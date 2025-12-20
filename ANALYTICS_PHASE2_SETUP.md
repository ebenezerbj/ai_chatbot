# Analytics Phase 2 Setup Guide

## Overview
Analytics Phase 2 adds enhanced customer engagement features to your chatbot, including personalized greetings, user segmentation, feedback collection, and smart recommendations.

## Features Included

### 1. **Personalized Greetings** 👋
- Recognizes returning users by IP address
- Shows different greetings based on user segment:
  - **New users**: "Hi, I'm Ama! How can I assist you today?"
  - **Regular users** (5-19 visits): "Great to see you again!"
  - **VIP users** (20+ visits): "Welcome back, valued customer!"
- Remembers last conversation topic

### 2. **User Segmentation** 🏆
- Automatically classifies users into tiers:
  - **New**: First-time visitors
  - **Regular**: 5-19 sessions
  - **VIP**: 20+ sessions (get priority treatment)
  - **Inactive**: Haven't visited in 30+ days

### 3. **Feedback Collection** 👍👎
- Thumbs up/down buttons on every bot response
- Real-time satisfaction tracking
- Stored in database for analytics
- Helps identify which responses work best

### 4. **Smart Recommendations** 💡
- Context-aware product/service suggestions
- Analyzes last 10 messages to understand interests
- Shows relevant recommendations:
  - User asks about loans → Recommends loan calculator
  - User asks about savings → Recommends fixed deposits
  - User checks balance → Recommends SMS alerts

### 5. **Follow-Up Reminders** 📋
- Tracks incomplete actions
- Reminds users when they return:
  - "You have pending actions: Visit branch to complete loan application"
- Can mark items as completed

### 6. **User Preferences** ⚙️
- Stores individual user settings
- Remembers language preferences
- Saves favorite branch
- Notification settings

## Setup Instructions

### Step 1: Wait for Deployment ⏳
The code has been deployed to production (commit: b5ea4e9).
Wait 3-5 minutes for Render to complete the build and deployment.

### Step 2: Run Migration 002 🔧

1. **Go to Admin Portal:**
   - Production: https://ai-chatbot-latest-7hhy.onrender.com/admin-portal.html
   - Login with admin password

2. **Navigate to Database Management Card** (in the Dashboard page)

3. **Look for "Migration 002: Analytics Phase 2 Tables"** (green box)

4. **Click "Run Migration 002" button**

5. **Wait for success message:**
   ```
   ✅ Migration 002 completed successfully!
   Tables created: 4
   ```

### Step 3: Verify Tables Created ✅

The migration creates these tables:
- `user_profiles` - Tracks user behavior and segments
- `user_preferences` - Stores individual user settings
- `feedback` - Collects thumbs up/down ratings
- `follow_ups` - Manages pending action reminders

### Step 4: Test the Features 🧪

1. **Test Personalized Greeting:**
   - Open chatbot in incognito window (new user)
   - Note the welcome message
   - Close and reopen in same browser (returning user)
   - Should see "Great to see you again!"

2. **Test Feedback Buttons:**
   - Ask chatbot a question
   - Click 👍 or 👎 button after bot response
   - Button should highlight and show "Thank you!"

3. **Test User Segmentation:**
   - Visit chatbot multiple times
   - After 5 visits: "Great to see you again!" (Regular)
   - After 20 visits: "Welcome back, valued customer!" (VIP)

4. **Test Recommendations:**
   - Ask about loans
   - Close and reopen chatbot
   - Should see: "💡 Based on your previous visits, you might be interested in: Personal Loan Calculator..."

## Database Schema

### user_profiles
```sql
- user_id (Primary Key)
- first_seen (timestamp)
- last_seen (timestamp)
- total_sessions (int)
- total_messages (int)
- preferred_topics (JSON)
- segment (varchar: new/regular/vip/inactive)
- average_satisfaction (decimal)
```

### feedback
```sql
- id (Primary Key)
- session_id (Foreign Key)
- message_id (int)
- feedback_type (varchar: thumbs/rating/nps)
- score (int: -1 for down, 1 for up)
- comment (text, optional)
- timestamp
```

### follow_ups
```sql
- id (Primary Key)
- user_id (varchar)
- session_id (Foreign Key)
- topic (varchar)
- action (text)
- completed (boolean)
- created_at (timestamp)
- completed_at (timestamp, optional)
```

### user_preferences
```sql
- id (Primary Key)
- user_id (varchar)
- preference_key (varchar)
- preference_value (text)
- updated_at (timestamp)
```

## API Endpoints

### Get Personalized Greeting
```javascript
POST /api/greeting
Body: { "sessionId": "session_123" }

Response: {
  "greeting": "Welcome back, valued customer!",
  "userSegment": "vip",
  "recommendations": [...],
  "followUps": [...],
  "buttons": [...]
}
```

### Submit Feedback
```javascript
POST /api/feedback
Body: {
  "sessionId": "session_123",
  "messageId": 5,
  "score": 1  // 1 for thumbs up, -1 for thumbs down
}
```

### Get Recommendations
```javascript
POST /api/recommendations
Body: { "sessionId": "session_123" }

Response: {
  "recommendations": [
    {
      "type": "product",
      "title": "Personal Loan Calculator",
      "description": "Calculate your loan payments",
      "relevanceScore": 0.85
    }
  ]
}
```

### Create Follow-Up
```javascript
POST /api/followup
Body: {
  "sessionId": "session_123",
  "topic": "Personal Loan",
  "action": "Visit branch to complete application"
}
```

## Troubleshooting

### Issue: Features not working after migration
**Solution:** 
1. Clear browser cache and cookies
2. Open chatbot in incognito/private mode
3. Check browser console for errors (F12)

### Issue: Greeting doesn't change for returning users
**Solution:**
- User identification is based on IP address
- If using VPN or changing networks, you'll be seen as a new user
- For testing, use same device/network consistently

### Issue: Feedback buttons not appearing
**Solution:**
1. Check if migration 002 completed successfully
2. Verify `feedback` table exists in database
3. Check browser console for JavaScript errors
4. Ensure you're using latest code (commit b5ea4e9+)

### Issue: Recommendations not showing
**Solution:**
- Recommendations only appear for returning users
- Need at least 1 previous session with 3+ messages
- Topics must match recommendation rules (loans, savings, branches, etc.)

## Analytics & Reporting

To view analytics data, query these tables:

```sql
-- Get user segment distribution
SELECT segment, COUNT(*) as count 
FROM user_profiles 
GROUP BY segment;

-- Get average satisfaction by segment
SELECT segment, AVG(average_satisfaction) as avg_satisfaction
FROM user_profiles 
WHERE average_satisfaction IS NOT NULL
GROUP BY segment;

-- Get feedback statistics
SELECT 
  CASE WHEN score > 0 THEN 'positive' ELSE 'negative' END as type,
  COUNT(*) as count
FROM feedback
GROUP BY CASE WHEN score > 0 THEN 'positive' ELSE 'negative' END;

-- Get VIP users
SELECT user_id, total_sessions, last_seen
FROM user_profiles
WHERE segment = 'vip'
ORDER BY total_sessions DESC;
```

## Next Steps

After successful setup:

1. **Monitor User Segments:**
   - Check how many users are in each tier
   - Track VIP customer growth

2. **Analyze Feedback:**
   - See which bot responses get most 👍
   - Improve responses with frequent 👎

3. **Optimize Recommendations:**
   - Track which recommendations lead to actions
   - Adjust recommendation rules based on data

4. **Follow-Up Management:**
   - Review pending follow-ups regularly
   - Reach out to users with incomplete actions

5. **Phase 3 Planning:**
   - Sentiment analysis (detect frustrated customers)
   - Churn prediction (identify at-risk users)
   - Intent classification (understand user goals)

## Support

For issues or questions:
1. Check browser console (F12) for errors
2. Review server logs on Render dashboard
3. Verify database connection
4. Ensure migration completed successfully

---

**Status:** ✅ Code Deployed (commit: b5ea4e9)  
**Next Action:** Run Migration 002 in Admin Portal  
**Generated:** December 20, 2025
