# Account Opening Error - Troubleshooting Guide

## Problem
Users are getting "Error: Database error while creating account opening application" when submitting the account opening form.

## What I've Done

### 1. Fixed Mobile Display Issue ✅
- Added responsive CSS to make the form single-column on mobile devices (≤767px)
- Form now displays properly on phones and tablets

### 2. Improved Error Logging ✅
- Enhanced server-side error logging to show actual database error details
- Added client-side console logging for debugging
- Error messages now show the actual SQL error instead of generic message

### 3. Database Verification ✅
- Created diagnostic script: `diagnose_account_openings.js`
- Verified table exists and has correct structure (30 columns)
- Test INSERT operation successful
- Database connection working properly

## How to Diagnose the Issue

### Step 1: Check Server is Running
```powershell
# Check if server is running
Get-Process -Name node

# If not running, start it:
npm start
```

### Step 2: Run Diagnostic Script
```powershell
node diagnose_account_openings.js
```
This will:
- Check if table exists
- Verify table structure
- Test INSERT operation
- Show current record count

### Step 3: Check Browser Console
1. Open the form in browser
2. Press F12 to open Developer Tools
3. Go to Console tab
4. Try submitting the form
5. Look for logs starting with `[AccountOpening]`

You should see:
```
[AccountOpening] getVal('accFullName') = "..."
[AccountOpening] Payload being sent: {...}
[AccountOpening] Response status: 200 OK
[AccountOpening] Response data: {ok: true, applicationId: 123}
```

If there's an error, you'll see:
```
[AccountOpening] Response status: 400 Bad Request
[AccountOpening] Response data: {ok: false, error: "..."}
[AccountOpening] Submission failed: ...
```

### Step 4: Check Server Logs
Look at the terminal where the server is running. You should see:
```
[AccountOpening] Received payload: {...}
[AccountOpening] Created application ID: 123
```

If there's an error:
```
[AccountOpening] Database error: {...}
[AccountOpening] Error details: {
  message: "...",
  code: "...",
  sqlState: "...",
  sqlMessage: "..."
}
```

## Common Issues and Fixes

### Issue 1: Server Not Running
**Symptom:** "Network error submitting application"
**Fix:**
```powershell
npm start
```

### Issue 2: Table Doesn't Exist
**Symptom:** "Table 'akcb_bank.account_openings' doesn't exist"
**Fix:**
```powershell
node create_account_openings_table.js
```

### Issue 3: Validation Errors
**Symptom:** "Please fill in the following fields: ..."
**Fix:** Ensure all required fields are filled in the form

### Issue 4: Phone Number Format
**Symptom:** "Mobile Phone Number (must be valid Ghana format)"
**Fix:** Phone must be in one of these formats:
- `0241234567` (10 digits starting with 0)
- `233241234567` (12 digits starting with 233)
- `+233241234567` (12 digits starting with +233)

### Issue 5: Email Format
**Symptom:** "Email Address (must be valid format)"
**Fix:** Email must be in format: `name@domain.com`

### Issue 6: Database Connection
**Symptom:** "connect ECONNREFUSED" or "Access denied"
**Fix:** Check database credentials in `.env` file

## Testing Scripts

### Test the Endpoint
```powershell
node test_account_opening_endpoint.js
```

### Verify Database Record
```powershell
node verify_account_opening.js
```

### Check Database Health
```powershell
node diagnose_account_openings.js
```

## Files Modified

1. **public/index.html**
   - Line 1176-1178: Added mobile responsive CSS
   - Line 3543-3550: Added better error logging
   - Line 3567-3575: Enhanced error display

2. **src/accountOpenings.ts**
   - Line 244-252: Improved error logging with detailed SQL error info

3. **New Files Created**
   - `diagnose_account_openings.js` - Database diagnostic script
   - `test_account_opening_endpoint.js` - Endpoint testing script

## Next Steps

1. Start the server if not running
2. Check browser console for detailed error messages
3. Check server logs for database error details
4. Run diagnostic script to verify database setup
5. If issue persists, provide the specific error message from console/logs

## Contact Support

If the issue persists after trying these steps, please provide:
1. Browser console logs (lines starting with `[AccountOpening]`)
2. Server terminal output
3. Output from `diagnose_account_openings.js`
4. Exact error message shown to user
