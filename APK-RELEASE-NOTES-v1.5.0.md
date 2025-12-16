# AKCB Chatbot APK - Release Notes v1.5.0

**Build Date:** December 16, 2025  
**Version Code:** 6  
**Version Name:** 1.5.0  
**Package:** com.akamantinkasei.chatbot  
**File Size:** 3.36 MB

---

## 🎉 What's New in v1.5.0

### Major Updates

#### 1. **Fixed PostgreSQL Production Database Issues** ✅
- Fixed trigger error that prevented balance updates on production
- Resolved customer ID sequence conflicts  
- Successfully migrated 66,771 account balances to production
- Database now fully synchronized with latest customer data

#### 2. **UI/UX Improvements** 🎨
- Redesigned chatbot interface with Ama-inspired compact design
- Cleaner header with inline controls
- Improved message layout with timestamps and feedback buttons
- Enhanced mobile responsiveness

#### 3. **Knowledge Base Enhancements** 📚
- Added comprehensive mobile banking app information
- Updated Ghana Pay App details
- Total KB entries: 142 (expanded coverage)
- Better product and service information

#### 4. **Production Deployment Fixes** 🔧
- Fixed JavaScript display issues on web.php
- Removed duplicate code blocks
- Improved chat widget integration
- Enhanced Tawk.to blocking mechanism

### Technical Improvements

- **Database Triggers:** Fixed `update_updated_at_column` to use correct `last_updated` field
- **Sequence Management:** Auto-increment sequences properly aligned with existing data
- **Balance Upload System:** Fully operational for daily updates
- **OTP Authentication:** SMS integration verified and tested
- **Admin Portal:** Password authentication working on both localhost and production

### Bug Fixes

- ✅ Fixed "record 'new' has no field 'updated_at'" PostgreSQL error
- ✅ Fixed duplicate key violations during customer creation
- ✅ Removed visible JavaScript code from webpage
- ✅ Cleaned up duplicate script blocks in web.php
- ✅ Fixed balance upload foreign key constraints

---

## 📱 App Features

### Core Functionality
- **24/7 AI Banking Assistant** - Powered by OpenAI GPT-4
- **Account Balance Inquiry** - Real-time balance checking with OTP authentication
- **Product Information** - Comprehensive banking products and services
- **Branch Locator** - Find nearest AKCB branches
- **Voice Interaction** - Text-to-speech responses
- **Offline Support** - Cached responses for common queries

### Security Features
- OTP-based customer authentication
- SMS verification via SMS Online Ghana
- Secure HTTPS communication
- Session management with expiry
- Rate limiting and abuse prevention

### User Experience
- Modern Material Design interface
- Smooth animations and transitions
- Responsive layout for all screen sizes
- Welcome tooltips and guided interactions
- Floating Action Button (FAB) design
- Emoji support for friendly communication

---

## 🔧 Technical Specifications

### Platform Support
- **Minimum SDK:** API 24 (Android 7.0)
- **Target SDK:** API 34 (Android 14)
- **Supported ABIs:** arm64-v8a, armeabi-v7a, x86_64

### Build Configuration
- **Gradle Version:** 8.2.0
- **Android Gradle Plugin:** 8.7.3
- **Kotlin Version:** 2.1.0
- **Build Type:** Release (Optimized & Minified)
- **ProGuard:** Enabled for code obfuscation

### Backend Integration
- **Production Server:** https://ai-chatbot-1-a596.onrender.com
- **Database:** PostgreSQL on Render
- **Total Accounts:** 97,747 customers
- **Balance Records:** 66,771 active accounts
- **Knowledge Base:** 142 entries

---

## 📦 Installation

### For Testing
1. Download `AKCB-Chatbot-v1.5.0.apk`
2. Enable "Install from Unknown Sources" on your Android device
3. Tap the APK file to install
4. Grant necessary permissions when prompted

### For Production (Google Play Store)
See `GOOGLE-PLAY-STORE-UPLOAD-GUIDE.md` for publishing instructions

---

## 🚀 Deployment Status

### Production Environment
- ✅ Server: Deployed and running on Render
- ✅ Database: PostgreSQL fully configured
- ✅ Balances: 66,771 accounts synchronized
- ✅ OTP System: SMS Online Ghana integrated
- ✅ Admin Portal: Accessible and functional
- ✅ Knowledge Base: 142 entries loaded

### Known Issues
- ⚠️ Some customers have placeholder phone numbers (0200000000)
- ⚠️ Density-based APK splits deprecated (future: use App Bundle)

### Upcoming Features
- 🔜 Biometric authentication support
- 🔜 Transaction history viewing
- 🔜 Bill payment integration
- 🔜 Push notifications for account alerts
- 🔜 Multi-language support (Twi, Ga, Ewe)

---

## 📝 Changelog

### v1.5.0 (December 16, 2025)
- Fixed production database triggers and sequences
- Redesigned UI with Ama-inspired interface
- Enhanced knowledge base with mobile app details
- Synchronized 66,771 account balances to production
- Fixed JavaScript display issues on web pages
- Improved OTP authentication flow

### v1.3.0 (Previous Release)
- Initial production deployment
- Basic chatbot functionality
- Account balance inquiry
- Knowledge base integration

---

## 🔒 Security Notes

### Data Protection
- Customer data encrypted in transit (HTTPS/TLS)
- OTP expires after 5 minutes
- Maximum 3 OTP attempts per session
- Session timeout after inactivity
- No sensitive data stored locally

### Permissions Required
- **Internet:** For API communication
- **Network State:** To check connectivity
- **Geolocation (Optional):** For branch locator feature

---

## 📞 Support

For issues or questions:
- **Email:** support@akmantinkasei.com
- **Phone:** +233 20 205 5170
- **Developer:** ebenezerbj@github

---

## 📄 License

Proprietary - Amantin and Kasei Community Bank
All rights reserved © 2025

---

**Build Information:**
- Built on: December 16, 2025
- Build Tool: Gradle 8.2.0
- Compiled with: OpenJDK 21.0.8
- Build Time: 1m 44s
- APK Size: 3.36 MB
- SHA256: (Generate after signing for production)

---

## ✅ Testing Checklist

Before deploying to users:
- [ ] Test account balance inquiry with OTP
- [ ] Verify all knowledge base responses
- [ ] Check voice output functionality
- [ ] Test on different Android versions (7.0 - 14.0)
- [ ] Verify branch locator with geolocation
- [ ] Test offline mode functionality
- [ ] Check chat history persistence
- [ ] Verify secure HTTPS connections
- [ ] Test rate limiting and error handling
- [ ] Validate OTP expiry and retry logic

---

**Ready for Distribution** ✅

This APK has been built with the latest updates and is ready for:
1. Internal testing
2. Beta distribution
3. Google Play Store submission (after signing with production keystore)
