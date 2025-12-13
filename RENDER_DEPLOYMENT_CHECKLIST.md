# Render Deployment Checklist

## ✅ Completed
- [x] PostgreSQL database created on Render
- [x] 48,715 customer accounts imported
- [x] Phone numbers fixed (complete 12-digit format)
- [x] SSL certificate bundle (cacert.pem) added
- [x] Code supports both MySQL and PostgreSQL
- [x] Latest code pushed to GitHub
- [x] OTP sending tested and working locally

## ⏳ Required: Configure Render Environment Variables

Go to your Render web service dashboard and add these environment variables:

### 1. DATABASE_URL (CRITICAL!)
**Value:** Use the **Internal Database URL** from your Render PostgreSQL dashboard

It should look like this (with `-internal` in the hostname):
```
postgresql://akcb_bank_user:IlcndVR943byznoByTRzN1zBQS3gB9lI@dpg-d4u410ali9vc73am148g-a-internal.oregon-postgres.render.com/akcb_bank
```

⚠️ **Important:** Use the INTERNAL URL (not the external one). The internal URL has `-internal` in the hostname for faster connections.

### 2. SMS_ONLINE_API_KEY
```
aefc1848ebc7baaa90e71bfb6072287cc2cc197882e73631a1bdc27135a51abb
```

### 3. SMS_ONLINE_SENDER
```
AkcbSupport
```

### 4. OPENAI_API_KEY
```
(Your existing OpenAI API key)
```

## 📝 Steps to Configure

1. **Login to Render Dashboard**
   - Go to https://dashboard.render.com

2. **Select Your Web Service**
   - Click on your `ai-chatbot` service

3. **Add Environment Variables**
   - Click "Environment" in the left sidebar
   - Click "Add Environment Variable"
   - Add each variable above
   - Click "Save Changes"

4. **Wait for Deployment**
   - Render will automatically redeploy with new environment variables
   - This takes about 2-3 minutes

5. **Check Deployment Logs**
   - Click "Logs" in the left sidebar
   - Look for these success messages:
     ```
     [DB] PostgreSQL connection test successful
     [Server] Database connection established
     ✓ Server listening on http://0.0.0.0:4000
     ```

## 🧪 Testing After Deployment

1. **Test the health endpoint:**
   ```
   curl https://ai-chatbot-latest-7hhy.onrender.com/api
   ```

2. **Test authentication flow:**
   - Visit your Render URL in browser
   - Say: "check my balance"
   - Provide phone: "0501336873" or "233501336873"
   - You should receive OTP via SMS to that number
   - Enter OTP to view balance

3. **Test accounts:**
   - Account: `1511520000230861`
   - Phone: `233501336873` or `0501336873`
   - These should both work

## 🔍 Troubleshooting

### If you see "Unable to verify your details"
- Check Render logs for database connection errors
- Verify `DATABASE_URL` is the **INTERNAL** URL
- Check that DATABASE_URL has `-internal` in hostname

### If OTP doesn't send
- Check Render logs for SMS API errors
- Verify `SMS_ONLINE_API_KEY` is set correctly
- Check `cacert.pem` was deployed (should be in git)

### If database is empty
- Run the import again from local machine:
  ```
  node fast_import.js "postgresql://akcb_bank_user:...[EXTERNAL URL]..."
  ```

## 📊 Current Database Status
- **Total Customers:** 48,715
- **Phone Format:** 233XXXXXXXXX (12 digits) or 0XXXXXXXXX (10 digits)
- **All accounts have complete phone numbers** ✅
- **Test account:** 1511520000230861 → Phone: 233501336873

## 🎯 Success Criteria
1. ✅ Deployment shows "Live"
2. ✅ Logs show "PostgreSQL connection test successful"
3. ✅ Health endpoint returns JSON response
4. ✅ Balance check triggers OTP
5. ✅ OTP is received via SMS
6. ✅ Account balance displays after OTP verification

## 📞 Support Contacts
If customers need help:
- **Phone:** +233 20 205 5170
- **Branch:** Visit any AKCB branch
