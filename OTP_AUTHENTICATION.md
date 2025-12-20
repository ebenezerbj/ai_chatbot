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
# SMS Online Ghana Configuration
SMS_ONLINE_API_KEY=your_api_key_here
SMS_ONLINE_SENDER=AKCB
```

### Getting SMS Online Ghana Credentials
1. Sign up at https://www.smsonlinegh.com
2. Navigate to your account dashboard
3. Generate an API key from the API section
4. Register your sender name (e.g., "AKCB") under SMS Messaging menu
5. Add credentials to `.env` file

### Development Mode
If SMS Online Ghana is not configured, the OTP will be logged to the console:
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

**SMS API Details:**
- **Provider**: SMS Online Ghana
- **Endpoint**: https://api.smsonlinegh.com/v5/message/sms/send
- **Method**: POST
- **Encoding**: GSM default (type: 0)
- **Format**: 233XXXXXXXXX (Ghana format)

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
- **Account not active**: "Your account is dormant. Please visit any branch or call +233 24 231 2059 for assistance."

### OTP Errors
- **Invalid OTP**: "Invalid verification code. You have 2 attempt(s) remaining."
- **Expired OTP**: "Verification code has expired. Please request a new code."
- **Max attempts exceeded**: "Maximum verification attempts exceeded. Please request a new code."
- **No session found**: "No verification session found. Please request a new code."

### SMS Errors
- **SMS delivery failed**: "Unable to send verification code at this time. Please try again later."
- **Sender not registered**: Check that sender name exists in SMS Online Ghana account
- **Invalid API key**: Verify SMS_ONLINE_API_KEY in .env file

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
- [ ] Set up SMS Online Ghana account
- [ ] Generate API key from dashboard
- [ ] Register sender name (e.g., "AKCB") in account
- [ ] Add credentials to production `.env`
- [ ] Test SMS delivery to Ghana numbers
- [ ] Set up rate limiting for OTP requests
- [ ] Monitor SMS costs and usage
- [ ] Consider Redis for session storage (replace in-memory)

### Cost Optimization
- **SMS Online Ghana pricing**: Check current rates at https://www.smsonlinegh.com/pricing
- **Expected usage**: ~1 SMS per customer authentication
- **Monthly estimate**: (authentications × 1 × per-SMS cost)
- **No setup fees**: Pay-as-you-go pricing

### Monitoring
Monitor these metrics:
- OTP generation rate
- OTP verification success rate
- SMS delivery failures (check API response)
- Average authentication time
- Session timeout rate
- API response handshake status (HSHK_OK)

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
- **SMS Online Ghana**: Check dashboard at https://www.smsonlinegh.com/login
- **API Documentation**: https://www.smsonlinegh.com/developers/http-api/v5
- **Database**: Verify customer phone numbers in database
- **Contact**: +233 24 231 2059
