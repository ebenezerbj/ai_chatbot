# Quick Setup: OTP Authentication

## What Changed?
✅ **Removed**: Date of birth requirement  
✅ **Added**: SMS OTP verification  
✅ **Improved**: Security with two-factor authentication

## New Authentication Flow

### 1️⃣ Customer Request
```
Customer: "I want to check my balance"
Bot: "Please provide your account number and registered phone number."
```

### 2️⃣ Provide Credentials
```
Customer: "Account: 1234567890, Phone: 0242123456"
Bot: "A 6-digit verification code has been sent to 024****456."
```

### 3️⃣ Enter OTP
```
Customer: "123456"
Bot: "Welcome back, John! Your identity has been verified."
```

### 4️⃣ Access Account
```
Customer: "What's my balance?"
Bot: "Your current balance is GHS 5,320.50"
```

## Setup for Development

### Option 1: Development Mode (No SMS Service)
Just run the server - OTP will be logged to console:
```bash
npm run build
npm start
```

Look for this in console:
```
[OTP DEV MODE] Phone: 0242123456, OTP: 123456
```

### Option 2: Production Mode (With SMS Online Ghana)

1. **Sign up for SMS Online Ghana**
   - Visit: https://www.smsonlinegh.com
   - Create an account

2. **Get API Key**
   - Log in to your dashboard
   - Navigate to API section
   - Generate a new API key

3. **Register Sender Name**
   - Go to SMS Messaging menu
   - Add sender name (e.g., "AKCB")
   - Wait for approval (usually quick)

4. **Configure .env**
   ```env
   SMS_ONLINE_API_KEY=your_api_key_here
   SMS_ONLINE_SENDER=AKCB
   ```

5. **Restart Server**
   ```bash
   npm run build
   npm start
   ```

## Testing

### Test Account Details
- **Account**: 1234567890
- **Phone**: 0242123456
- **Name**: John Kofi Mensah
- **Balance**: GHS 5,320.50

### Test Commands
1. "check my balance"
2. "Account: 1234567890, Phone: 0242123456"
3. (Check console for OTP in dev mode)
4. Enter the 6-digit code

## Security Features

✅ **6-digit OTP** (1 million combinations)  
✅ **5-minute expiry** (time-limited)  
✅ **Single-use** (can't be reused)  
✅ **Max 3 attempts** (per OTP)  
✅ **Phone masking** (024****456)  
✅ **Session timeout** (15 minutes)

## What You Need

### Already Installed
✅ mysql2 (database)  
✅ axios (HTTP client for SMS API)  
✅ All other dependencies

### To Configure
- [ ] SMS Online Ghana account (optional for dev)
- [ ] API key in .env (optional for dev)
- [ ] Registered sender name (optional for dev)

## Files Modified
- ✅ `src/otpService.ts` - OTP generation and SMS sending
- ✅ `src/customerAuth.ts` - Updated authentication flow
- ✅ `src/index.ts` - Integrated OTP verification
- ✅ `.env.example` - Added Twilio configuration
- ✅ `OTP_AUTHENTICATION.md` - Complete documentation

## Next Steps

### For Development
1. Run `npm start`
2. Test with account: 1234567890, phone: 0242123456
3. Check console for OTP codes
4. Verify authentication works

### For Production
1. Set up SMS Online Ghana account
2. Generate API key
3. Register sender name (e.g., "AKCB")
4. Add credentials to `.env`
5. Test SMS delivery
6. Deploy to Render (will auto-deploy from GitHub)

## Troubleshooting

### OTP Not Appearing in Console
- Check that SMS_ONLINE_API_KEY is NOT set in .env
- Look for: `[OTP DEV MODE]` in console output
- Verify server restarted after code changes

### SMS Not Sending (Production)
- Verify API key is correct in .env
- Check that sender name is registered and approved
- Verify phone numbers are in Ghana format (233XXXXXXXXX)
- Check SMS Online Ghana dashboard for delivery status
- Ensure account has sufficient credits

### Database Connection Issues
- Run `setup-database.bat` if not done yet
- Verify MySQL is running (Laragon)
- Check `.env` database credentials

## Cost Estimate (Production)

**SMS Online Ghana Pricing:**
- Visit https://www.smsonlinegh.com/pricing for current rates
- Pay-as-you-go model (no monthly fees)
- Cost per SMS: Check dashboard for Ghana rates
- OTP per auth: 1 SMS
- Example: Competitive rates for Ghana destinations

**Top-Up Options:**
- Mobile Money (MTN, Vodafone, AirtelTigo)
- Credit/Debit Card
- Bank Transfer

## Support
- **Development**: Check console logs
- **SMS Online Ghana**: https://www.smsonlinegh.com/login
- **API Docs**: https://www.smsonlinegh.com/developers/http-api/v5
- **Database**: Verify `customers` table
- **Contact**: +233 24 231 2059
