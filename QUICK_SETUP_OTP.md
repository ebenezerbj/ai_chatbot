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

### Option 1: Development Mode (No Twilio)
Just run the server - OTP will be logged to console:
```bash
npm run build
npm start
```

Look for this in console:
```
[OTP DEV MODE] Phone: 0242123456, OTP: 123456
```

### Option 2: Production Mode (With Twilio)

1. **Sign up for Twilio**
   - Visit: https://console.twilio.com
   - Sign up for a free account ($15 credit)

2. **Get Credentials**
   - Account SID: Found on dashboard
   - Auth Token: Found on dashboard
   - Phone Number: Purchase one with SMS capability

3. **Configure .env**
   ```env
   TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxx
   TWILIO_AUTH_TOKEN=your_auth_token
   TWILIO_PHONE_NUMBER=+1234567890
   ```

4. **Restart Server**
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
✅ twilio (SMS service)  
✅ All other dependencies

### To Configure
- [ ] Twilio account (optional for dev)
- [ ] Twilio credentials in .env (optional for dev)

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
1. Set up Twilio account
2. Add credentials to `.env`
3. Test SMS delivery
4. Deploy to Render (will auto-deploy from GitHub)

## Troubleshooting

### OTP Not Appearing in Console
- Check that Twilio variables are NOT set in .env
- Look for: `[OTP DEV MODE]` in console output
- Verify server restarted after code changes

### SMS Not Sending (Production)
- Verify Twilio credentials are correct
- Check Twilio console for errors
- Ensure phone number has SMS capability
- Check Twilio account balance

### Database Connection Issues
- Run `setup-database.bat` if not done yet
- Verify MySQL is running (Laragon)
- Check `.env` database credentials

## Cost Estimate (Production)

**Twilio SMS Pricing (Ghana):**
- Cost per SMS: ~$0.0075
- OTP per auth: 1 SMS
- Example: 1000 authentications = $7.50

**Free Trial:**
- Twilio provides $15 credit
- Approximately 2000 SMS messages

## Support
- **Development**: Check console logs
- **Twilio**: https://console.twilio.com
- **Database**: Verify `customers` table
- **Contact**: +233 20 205 5170
