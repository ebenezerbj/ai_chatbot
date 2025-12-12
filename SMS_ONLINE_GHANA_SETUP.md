# SMS Online Ghana - OTP Integration Guide

## Overview
The chatbot now uses **SMS Online Ghana** for sending OTP verification codes. This is a local Ghanaian SMS service provider with competitive rates and reliable delivery.

## Why SMS Online Ghana?
✅ **Local Provider**: Ghanaian company with better Ghana network coverage  
✅ **Competitive Rates**: Lower costs for Ghana destinations  
✅ **Simple API**: RESTful HTTP API with JSON support  
✅ **No Phone Purchase**: Only need API key and sender name  
✅ **Pay-as-you-go**: No monthly subscription fees  
✅ **Mobile Money**: Top up using MTN, Vodafone, AirtelTigo  

## Quick Setup

### 1. Create Account
1. Visit: https://www.smsonlinegh.com
2. Click "Sign Up" or "Register"
3. Fill in your details
4. Verify your email
5. Log in to your dashboard

### 2. Get API Key
1. Navigate to **API** section in dashboard
2. Click "Generate API Key"
3. Copy your API key (format: `d5c683a1b4c3d2f278be3d4c03c23191b2f133378b12b6e197c1ad5d9b34c128`)
4. Keep it secure - never commit to GitHub

### 3. Register Sender Name
1. Go to **SMS Messaging** menu
2. Click "Sender Names"
3. Add new sender name: **AKCB** (or your preferred name)
4. Submit for approval
5. Wait for approval (usually within hours)

### 4. Top Up Account
1. Go to **Billing** or **Top Up** section
2. Choose payment method:
   - Mobile Money (MTN, Vodafone, AirtelTigo)
   - Credit/Debit Card
   - Bank Transfer
3. Add credits (start with GHS 10-50 for testing)

### 5. Configure Application
Add to your `.env` file:
```env
SMS_ONLINE_API_KEY=your_api_key_here
SMS_ONLINE_SENDER=AKCB
```

### 6. Test
```bash
npm run build
npm start
```

Test with: Account 1234567890, Phone 0242123456

## API Implementation Details

### Request Format
```json
POST https://api.smsonlinegh.com/v5/message/sms/send
Headers:
  Content-Type: application/json
  Accept: application/json
  Host: api.smsonlinegh.com
  Authorization: key YOUR_API_KEY

Body:
{
  "text": "Hello John, your AKCB verification code is: 123456. Valid for 5 minutes.",
  "type": 0,
  "sender": "AKCB",
  "destinations": ["233242123456"]
}
```

### Response Format
```json
{
  "handshake": {
    "id": 0,
    "label": "HSHK_OK"
  },
  "data": {
    "batch": "cfa19ba67f94fbd6b19c067b0c87ed4f",
    "category": 1,
    "delivery": false,
    "destinations": [
      {
        "id": "093841e5-578a-41f4-5f5f-2f3910886c12",
        "to": "233242123456",
        "status": {
          "id": 2105,
          "label": "DS_PENDING_ENROUTE"
        }
      }
    ]
  }
}
```

### Phone Number Format
- **Input**: 0242123456 or +233242123456
- **Output**: 233242123456 (processed by OTP service)
- **Required**: Ghana numbers only (233 prefix)

### Message Encoding
- **Type 0**: GSM default (English characters)
- Supports: A-Z, a-z, 0-9, basic punctuation
- Max length: 160 characters (GSM)

## Development Mode

When API key is not configured, OTP is logged to console:

```bash
[OTP DEV MODE] Phone: 0242123456, OTP: 123456
```

This allows development and testing without SMS credits.

## Cost Analysis

### Typical Pricing (Check website for current rates)
- **Ghana networks**: Competitive per-SMS rate
- **No monthly fees**: Pay only for what you use
- **Bulk discounts**: Available for high volume
- **No hidden charges**: Transparent pricing

### Usage Estimates
- **Per authentication**: 1 SMS
- **100 daily authentications**: 100 SMS
- **Monthly (3000 auth)**: 3000 SMS

### Budget Planning
1. Check current rates at: https://www.smsonlinegh.com/pricing
2. Estimate monthly authentications
3. Calculate: authentications × rate per SMS
4. Add 20% buffer for failed attempts

## Monitoring & Management

### Dashboard Features
- **SMS History**: View all sent messages
- **Delivery Reports**: Check delivery status
- **Balance Monitoring**: Track remaining credits
- **API Logs**: Debug API calls
- **Usage Analytics**: View trends and patterns

### Delivery Status Codes
- **2105 DS_PENDING_ENROUTE**: Message submitted, awaiting delivery
- **2103 DS_SUBMITTED**: Submitted to network
- **2100 DS_DELIVERED**: Successfully delivered
- **Check docs**: Full list at https://www.smsonlinegh.com/developers

### Best Practices
1. **Monitor balance**: Set up low balance alerts
2. **Check delivery**: Review delivery reports regularly
3. **Rate limiting**: Implement to prevent abuse
4. **Log failures**: Track and investigate failed deliveries
5. **Test regularly**: Verify SMS delivery to all networks

## Troubleshooting

### Common Issues

**1. "Authorization failed"**
- Check API key is correct in .env
- Ensure no extra spaces in API key
- Verify API key is active in dashboard

**2. "Sender name not registered"**
- Verify sender name approved in dashboard
- Check spelling matches exactly (case-sensitive)
- Request approval if pending

**3. "Insufficient balance"**
- Top up account in dashboard
- Check minimum balance requirements

**4. "Invalid destination"**
- Verify phone number format (233XXXXXXXXX)
- Check number is valid Ghana mobile number
- Remove spaces or special characters

**5. Messages not delivering**
- Check delivery reports in dashboard
- Verify recipient number is active
- Check network connectivity
- Review SMS content (avoid spam triggers)

### Debug Mode
Enable detailed logging by checking console output:
```
[OTP] SMS sent successfully to 233242123456
[OTP] Destination 233242123456: DS_PENDING_ENROUTE (2105)
```

### Testing Checklist
- [ ] API key configured in .env
- [ ] Sender name approved
- [ ] Account has sufficient credits
- [ ] Phone numbers in correct format
- [ ] Server restarted after config changes
- [ ] Network connectivity available
- [ ] Delivery reports showing success

## Security Best Practices

### API Key Security
✅ Never commit .env to GitHub  
✅ Use environment variables in production  
✅ Rotate API keys periodically  
✅ Restrict API key permissions if possible  
✅ Monitor usage for anomalies  

### SMS Content
✅ Keep messages clear and professional  
✅ Include bank name (AKCB)  
✅ Add validity period (5 minutes)  
✅ Include security warning  
✅ Use registered sender name  

### Rate Limiting
✅ Limit OTP requests per user  
✅ Implement cooldown periods  
✅ Track failed attempts  
✅ Block suspicious patterns  
✅ Monitor for abuse  

## Migration from Development

### Step 1: Sign Up & Configure
1. Create SMS Online Ghana account
2. Generate API key
3. Register sender name
4. Top up account

### Step 2: Update Environment
Production `.env`:
```env
SMS_ONLINE_API_KEY=your_real_api_key
SMS_ONLINE_SENDER=AKCB
```

### Step 3: Test in Staging
1. Deploy to staging environment
2. Test with real Ghana numbers
3. Verify delivery reports
4. Check timing and reliability

### Step 4: Go Live
1. Update production .env
2. Deploy to production
3. Monitor initial deliveries
4. Set up alerts for issues

## Support & Resources

### SMS Online Ghana
- **Website**: https://www.smsonlinegh.com
- **Login**: https://www.smsonlinegh.com/login
- **API Docs**: https://www.smsonlinegh.com/developers/http-api/v5
- **Pricing**: https://www.smsonlinegh.com/pricing
- **Support**: Contact via website

### Application Support
- **Technical**: Check console logs and delivery reports
- **Database**: Verify customer phone numbers
- **Contact**: +233 20 205 5170

## Comparison with Twilio

| Feature | SMS Online Ghana | Twilio |
|---------|-----------------|--------|
| **Setup** | Simple, API key only | Complex, phone number purchase |
| **Ghana Coverage** | Excellent | Good |
| **Pricing** | Competitive for Ghana | Higher for Ghana |
| **Payment** | Mobile Money, Card | Credit Card |
| **Local Support** | Ghanaian company | International |
| **Integration** | RESTful API | Multiple SDKs |
| **Best For** | Ghana-focused apps | Global applications |

## Next Steps

### Immediate
1. Create account at SMS Online Ghana
2. Get API key and register sender name
3. Add small credit for testing
4. Test OTP delivery

### Short-term
1. Monitor delivery success rates
2. Track costs per month
3. Optimize message content
4. Set up balance alerts

### Long-term
1. Implement delivery webhooks
2. Add retry logic for failures
3. Consider bulk pricing
4. Explore additional features

## API Response Handling

The application automatically handles:
- ✅ Handshake validation (HSHK_OK)
- ✅ HTTP status code checking (200)
- ✅ Destination status logging
- ✅ Error message extraction
- ✅ Retry logic (future enhancement)

## Conclusion

SMS Online Ghana provides a reliable, cost-effective solution for sending OTP codes to Ghanaian customers. The integration is complete and ready for production use with proper configuration.

**Ready to test?** Add your API key to `.env` and restart the server!
