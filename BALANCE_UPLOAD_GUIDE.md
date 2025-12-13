# Balance Upload Admin Guide

## Overview
This guide explains how to use the web-based admin interface to update customer account balances daily from CSV exports.

## Accessing the Admin Interface

### Local Development
Navigate to: `http://localhost:4000/balance-upload.html`

### Production (Render)
Navigate to: `https://ai-chatbot-latest-7hhy.onrender.com/balance-upload.html`

## Login Credentials

**Admin Password**: Set in environment variable `ADMIN_PASSWORD`

- **Local Development**: `changeme123` (from .env file)
- **Production**: Set in Render environment variables

⚠️ **Security Note**: Change the default password in production!

## Daily Workflow

### Step 1: Export CSV from Core Banking System
Export a CSV file with the following columns:
- `Account Number` (or `account_number`, `AccountNumber`, etc.)
- `Ledger Balance` (or `ledger_balance`, `LedgerBalance`, `Balance`, etc.)
- `Available Balance` (or `available_balance`, `AvailableBalance`, etc.)

**Note**: The system automatically detects column names in various formats (case-insensitive, with/without spaces or underscores).

### Step 2: Login to Admin Interface
1. Navigate to the balance upload URL
2. Enter admin password
3. Click "Login"
4. You'll see the upload interface

### Step 3: Upload CSV File
1. Click "Choose File" button
2. Select your CSV export file
3. Click "Upload Balances"
4. Wait for processing (progress indicator will show)

### Step 4: Review Results
After processing, you'll see:
- **Total Records**: Number of records in CSV
- **Successful Updates**: Number of accounts updated successfully
- **Errors**: Number of failed updates (if any)
- **Database Stats**: Total accounts in system and last update time

If there are errors, the first 10 will be displayed with details.

### Step 5: Logout
Click "Logout" when done to invalidate your session token.

## CSV Format Examples

### Example 1: Standard Format
```csv
Account Number,Ledger Balance,Available Balance
1511520000230861,12500.50,12500.50
1511520000230862,8750.25,8750.25
```

### Example 2: Alternative Format
```csv
account_number,balance
1511520000230861,12500.50
1511520000230862,8750.25
```

**Note**: If `Available Balance` is not provided, it defaults to the `Ledger Balance`.

### Example 3: With Commas in Numbers
```csv
Account Number,Ledger Balance,Available Balance
1511520000230861,"12,500.50","12,500.50"
1511520000230862,"8,750.25","8,750.25"
```

The system automatically removes commas from numeric values.

## Supported CSV Column Names

The system recognizes various column name formats:

**Account Number**:
- Account Number
- account_number
- AccountNumber
- ACCOUNT_NUMBER
- Account No
- account_no

**Ledger Balance**:
- Ledger Balance
- ledger_balance
- LedgerBalance
- Balance
- balance
- BALANCE

**Available Balance**:
- Available Balance
- available_balance
- AvailableBalance
- Available

## Troubleshooting

### Login Issues
- **Problem**: "Invalid password" error
- **Solution**: Verify admin password in environment variables

### Upload Failures
- **Problem**: "No file uploaded" error
- **Solution**: Ensure you selected a file before clicking upload

- **Problem**: CSV parsing errors
- **Solution**: 
  - Check CSV file format
  - Ensure required columns exist
  - Remove any header/footer rows that aren't data

### Database Errors
- **Problem**: Some accounts fail to update
- **Solution**: 
  - Check error list for specific accounts
  - Verify account numbers exist in database
  - Ensure numeric values are valid

## Security Best Practices

1. **Change Default Password**: Update `ADMIN_PASSWORD` in production
2. **Use Strong Password**: Minimum 12 characters, mix of letters/numbers/symbols
3. **Keep Password Secure**: Don't share or commit to version control
4. **Logout After Use**: Always logout when done
5. **Monitor Access**: Check server logs for unauthorized access attempts

## Setting Admin Password

### Local Development (.env file)
```env
ADMIN_PASSWORD=your_secure_password_here
```

### Production (Render)
1. Go to Render Dashboard
2. Select your web service
3. Click "Environment" tab
4. Add/update `ADMIN_PASSWORD` variable
5. Save changes (service will redeploy)

## API Endpoints

The admin interface uses these endpoints:

### Login
```
POST /api/admin/login
Body: { "password": "your_password" }
Response: { "token": "auth_token_here" }
```

### Upload Balances
```
POST /api/admin/upload-balances
Headers: { "Authorization": "Bearer <token>" }
Body: FormData with file
Response: {
  "success": true,
  "totalRecords": 48715,
  "successCount": 48715,
  "errorCount": 0,
  "errors": [],
  "stats": {
    "totalAccounts": 48715,
    "lastUpdate": "2024-01-15T10:30:00.000Z"
  }
}
```

### Logout
```
POST /api/admin/logout
Headers: { "Authorization": "Bearer <token>" }
Response: { "success": true }
```

## Support

For technical issues:
1. Check server logs for detailed error messages
2. Verify environment variables are set correctly
3. Test with a small sample CSV first
4. Contact system administrator if issues persist

## Scheduled Updates

For automated daily updates, consider:
1. Set up a cron job or scheduled task
2. Use the CLI script: `node update_balances.js <csv_file>`
3. Or continue using the web interface manually

## Sample Test Data

Create a test CSV to verify the system:

```csv
Account Number,Ledger Balance,Available Balance
1511520000230861,1000.00,1000.00
1511520000230862,2000.00,2000.00
```

Save as `test_balances.csv` and upload to verify everything works.
