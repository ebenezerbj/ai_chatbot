# OTP Authentication System

## Overview
The chatbot now uses SMS OTP (One-Time Password) verification for customer authentication. This provides a secure, two-factor authentication method that validates customers using:
1. **Account number** + **Phone number** (registered with the bank)
2. **6-digit OTP** sent via SMS to the customer's phone

## How It Works

### Step 1: Customer Requests Account Information
Customer: "I want to check my account balance"

Bot: "To check your account information, I need to verify your identity. Please provide your account number and registered phone number."

### Step 2: Customer Provides Credentials
Customer: "Account: 1234567890, Phone: 0242123456"

**Backend Process:**
- Validates account number exists in database
- Verifies phone number matches the account
- Checks account status (must be Active)
- Generates 6-digit OTP
- Sends SMS to registered phone number

Bot: "A 6-digit verification code has been sent to your registered phone number 024****456. Please enter the code to continue."

### Step 3: Customer Enters OTP
Customer: "123456"

**Backend Process:**
- Verifies OTP matches the generated code
- Checks OTP hasn't expired (5-minute validity)
- Authenticates the session

Bot: "Welcome back, John! Your identity has been verified. How can I help you with your account today?"

### Step 4: Access Account Information
Customer: "What's my balance?"

Bot: "Your current balance is GHS 5,320.50 (Available: GHS 5,320.50)"

## Configuration

### Environment Variables
Add these to your `.env` file:

```env
# Twilio SMS Configuration
TWILIO_ACCOUNT_SID=your_account_sid_here
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890
```

### Getting Twilio Credentials
1. Sign up at https://console.twilio.com
2. Get your Account SID and Auth Token from the dashboard
3. Purchase a phone number from Twilio
4. Add credentials to `.env` file

### Development Mode
If Twilio is not configured, the OTP will be logged to the console:
```
[OTP DEV MODE] Phone: 0242123456, OTP: 123456
```

## Security Features

### OTP Security
- **6-digit random code**: 1,000,000 possible combinations
- **5-minute expiry**: OTP invalid after 5 minutes
- **Single-use**: OTP can only be used once
- **Max 3 attempts**: Limited verification attempts per OTP

### Session Security
- **15-minute timeout**: Authentication expires after 15 minutes of inactivity
- **Max 3 auth attempts**: Account locked after 3 failed authentication attempts
- **Account status check**: Only Active accounts can authenticate

### Phone Masking
Phone numbers are masked in responses for security:
- Display: "024****456"
- Actual: "0242123456"

## SMS Message Format
```
Hello [Name], your AKCB verification code is: [OTP]. 
Valid for 5 minutes. Do not share this code with anyone.
```

## Supported Input Formats

### Account Number & Phone
- "Account: 1234567890, Phone: 0242123456"
- "Account 1234567890 Phone 0242123456"
- "1234567890 0242123456"
- "My account is 1234567890 and phone is 0242123456"

### OTP
- "123456"
- "OTP: 123456"
- "Code: 123456"
- "My code is 123456"

## Error Handling

### Invalid Credentials
- **Invalid account/phone**: "Invalid account details. Please verify your account number and phone number."
- **Account not active**: "Your account is dormant. Please visit any branch or call +233 20 205 5170 for assistance."

### OTP Errors
- **Invalid OTP**: "Invalid verification code. You have 2 attempt(s) remaining."
- **Expired OTP**: "Verification code has expired. Please request a new code."
- **Max attempts exceeded**: "Maximum verification attempts exceeded. Please request a new code."
- **No session found**: "No verification session found. Please request a new code."

### SMS Errors
- **SMS delivery failed**: "Unable to send verification code at this time. Please try again later."

## Database Schema
The system uses the existing `customers` table:
```sql
SELECT account_number, account_name, phone_number, status
FROM customers
WHERE account_number = ? AND phone_number = ?
```

## Testing

### Test Account
Use this account from the sample data:
- **Account Number**: 1234567890
- **Phone Number**: 0242123456
- **Name**: John Kofi Mensah

### Test Flow
1. Start chatbot
2. Say: "check my balance"
3. Provide: "Account: 1234567890, Phone: 0242123456"
4. Check console for OTP (development mode)
5. Enter the 6-digit OTP
6. Verify authentication success

## Production Deployment

### Checklist
- [ ] Set up Twilio account
- [ ] Purchase phone number with SMS capability
- [ ] Add Twilio credentials to production `.env`
- [ ] Configure Twilio webhook for delivery status (optional)
- [ ] Set up rate limiting for OTP requests
- [ ] Monitor SMS costs and usage
- [ ] Consider Redis for session storage (replace in-memory)

### Cost Optimization
- **Twilio SMS pricing**: ~$0.0075 per SMS (Ghana)
- **Expected usage**: ~2 SMS per customer authentication
- **Monthly estimate**: (authentications × 2 × $0.0075)

### Monitoring
Monitor these metrics:
- OTP generation rate
- OTP verification success rate
- SMS delivery failures
- Average authentication time
- Session timeout rate

## API Response Format

### Awaiting OTP
```json
{
  "reply": "A 6-digit verification code has been sent to...",
  "source": "authentication",
  "sessionId": "session_1234567890_abc123",
  "requiresAuth": true,
  "awaitingOTP": true
}
```

### Authentication Success
```json
{
  "reply": "Welcome back, John! Your identity has been verified...",
  "source": "authentication",
  "sessionId": "session_1234567890_abc123",
  "requiresAuth": false,
  "awaitingOTP": false
}
```

## Future Enhancements

### Phase 2
- Email OTP as fallback
- Voice call OTP delivery
- Remember device option (30-day trust)
- Biometric authentication integration

### Phase 3
- WhatsApp OTP delivery
- SMS templates with branding
- Multi-language support
- Analytics dashboard

## Support
For issues or questions:
- **Technical**: Review console logs for OTP codes (dev mode)
- **Twilio**: Check Twilio console for SMS delivery logs
- **Database**: Verify customer phone numbers in database
- **Contact**: +233 20 205 5170
