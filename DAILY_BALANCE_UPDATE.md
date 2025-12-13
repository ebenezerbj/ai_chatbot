# Daily Balance Update Process

## Overview
This guide explains how to update customer account balances daily from your core banking system's CSV export.

## CSV File Format

The script supports multiple CSV formats. Your daily export should have these columns (column names are flexible):

### Option 1: Full Format
```csv
Account Number,Ledger Balance,Available Balance
1511520000230861,5234.50,5234.50
1511510000219011,12500.00,12000.00
```

### Option 2: Simple Format
```csv
account_number,balance
1511520000230861,5234.50
1511510000219011,12500.00
```

The script automatically detects column names (case-insensitive).

## Update Methods

### Method 1: Manual Update (Recommended for Now)

**Step 1:** Get the daily CSV file from your core banking system
- File is usually spooled/exported automatically
- Save as `daily_balances.csv` or keep original name

**Step 2:** Upload to server and run update

**For Local Testing (MySQL):**
```powershell
node update_balances.js data/daily_balances.csv
```

**For Production (Render PostgreSQL):**
```powershell
node update_balances.js data/daily_balances.csv "postgresql://akcb_bank_user:IlcndVR943byznoByTRzN1zBQS3gB9lI@dpg-d4u410ali9vc73am148g-a.oregon-postgres.render.com/akcb_bank"
```

**Step 3:** Verify the update
- Script shows: Total updated, errors, last update timestamp
- Check a few accounts in chatbot to confirm balances

---

## Method 2: Automated Daily Update (Future)

### Option A: Scheduled Task on Your Server
If you have access to the server where CSV is generated:

**Windows Task Scheduler:**
1. Create new task: Run daily at 1:00 AM
2. Action: Run script
   ```
   node C:\path\to\update_balances.js C:\path\to\daily_export.csv "DATABASE_URL"
   ```

**Linux Cron Job:**
```bash
# Add to crontab (crontab -e)
0 1 * * * cd /path/to/chatbot && node update_balances.js /path/to/daily_export.csv "DATABASE_URL"
```

### Option B: Manual Upload via Web Interface
We can create a simple admin page where you upload the CSV file daily.

**Would you like me to create:**
1. An admin upload page? (password-protected)
2. An API endpoint for automated uploads?

---

## Method 3: Web Upload Interface (If Needed)

I can create a simple admin page:
- Visit: `https://your-render-url.com/admin/upload-balances`
- Enter password
- Upload CSV file
- Click "Update Balances"
- See results

**Security:**
- Password protected
- Only accepts CSV files
- Validates data before updating
- Shows detailed results

---

## Sample Daily Workflow

**Every Morning:**
1. Export CSV from core banking system
2. Upload file to server OR run update script locally
3. Verify update completed successfully
4. Customers see updated balances in chatbot

**Time Required:** 2-5 minutes

---

## Troubleshooting

**"No valid records found":**
- Check CSV column names match expected format
- Ensure first row has headers
- Verify file is not empty

**"Error updating account":**
- Account might not exist in database
- Balance format might be invalid (contains letters, symbols)
- Check error message for specific account number

**Database connection error:**
- Verify DATABASE_URL is correct
- Check network connectivity
- Ensure PostgreSQL is running

---

## Questions to Consider

1. **CSV Location:** Where is the daily CSV file saved? (Network drive, local folder?)
2. **CSV Format:** Can you share a sample row from your daily export?
3. **Timing:** What time is the CSV generated each day?
4. **Automation:** Would you prefer:
   - Manual script execution (simple, quick setup)
   - Automated scheduled task (requires server access)
   - Web upload interface (easy, no server access needed)
5. **Who will run this?** IT staff or bank operations team?

Let me know which method works best for your setup!
