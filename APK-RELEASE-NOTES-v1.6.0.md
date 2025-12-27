# AKCB Chatbot APK - Release Notes v1.6.0

**Build Date:** December 16, 2025  
**Version Code:** 7  
**Version Name:** 1.6.0  
**Package:** com.akamantinkasei.chatbot  
**File Size:** ~6 MB
**Build Type:** Release & Debug

---

## 📲 Installation
### Release Version
1. Download `AKCB-Chatbot-v1.6.0.apk`.
2. Allow installation from unknown sources if prompted.
3. Install the update.

### Debug Version
1. Download `AKCB-Chatbot-v1.6.0-debug.apk`.
2. Use this version for testing and debugging features.
3. Allows connecting to local development servers if configured.

## 🎉 What's New in v1.6.0

### Major Updates

#### 1. **Admin Portal Fixes** ✅
- Resolved "No conversations found" error in the Admin Dashboard.
- Fixed SQL query schema mismatch (removed non-existent `user_message` column).
- Improved database connection error handling for better stability.

#### 2. **Admin SMS Alerts System** 🚨
- Implemented real-time SMS notifications for the System Administrator.
- **Triggers:**
    - **Runtime Errors:** Immediate alerts for server crashes or critical failures.
    - **Escalations:** Notifications when a customer requests a human agent.
    - **High-Risk Detection:** Alerts for conversations containing keywords like "fraud", "scam", "hacked", etc.
- **Configuration:** Alerts are sent to the configured admin phone number (0243082750).

### Technical Improvements
- Updated backend to handle database connection drops more gracefully.
- Optimized conversation retrieval queries for the admin dashboard.
- Bumped application version to 1.6.0.

---

## ⚠️ Known Issues
- None at this time.
