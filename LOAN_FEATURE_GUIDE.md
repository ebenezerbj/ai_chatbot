# Loan Balance Checking Feature - Implementation Guide

## ✅ Feature Complete!

Your chatbot can now check customer loan balances and display loan details including duration, payment schedules, and maturity dates.

## 🎯 What's Been Implemented

### 1. **Database Schema**
- **MySQL**: `database/schema_loans.sql`
- **PostgreSQL**: `database/schema_loans.postgres.sql`

**Loans Table Structure:**
```sql
- facility_account_number (Primary Key)
- customer_id
- phone_number
- customer_name
- facility_amount (original loan amount)
- current_balance
- disbursement_date
- maturity_date
- next_payment_date
- facility_term (duration in months)
- scheduled_installment (monthly payment)
- repayment_frequency
- facility_status_code (A=Active, C=Closed, D=Dormant)
- amount_in_arrears
```

### 2. **Loan Data Import**
- **Module**: `src/loanManager.ts`
- **CSV Parsing**: Automatically parses your loan CSV format
- **Mapping Strategy**:
  - Primary: `CustomerId` → `customers.id`
  - Fallback: `MobileTel1` → `customers.phone_number`

**CSV Fields Mapped:**
- FacilityAccNum → facility_account_number
- CustomerId → customer_id
- MobileTel1 → phone_number
- Surname/FirstName/MiddleNames → customer_name
- FacilityAmount → facility_amount
- CurBal → current_balance
- Maturitydate → maturity_date
- NextPaymentDate → next_payment_date
- FacilityTerm → facility_term
- SchdInstalAmount → scheduled_installment

### 3. **Customer Authentication Enhancement**
**Updated**: `src/customerAuth.ts`

**New Patterns Detected:**
- "check my loan balance"
- "how much do I owe"
- "show my loan details"
- "when is my loan payment due"
- "next loan payment"
- "loan maturity date"

### 4. **Balance Response Format**
When customers authenticate and check their account, they now see:

```
**Account Balance**

Account: 1234567890
Name: John Doe
Type: Savings

Available Balance: GHS 5,320.50
Ledger Balance: GHS 5,420.50
Last Updated: 2 hours ago

**Loan Information**

Loan 1: LO23188QG7C0FK
Original Amount: GHS 8,000.00
Current Balance: GHS 680.00
Monthly Payment: GHS 533.00
Next Payment: 25/09/2025
Maturity Date: 07/07/2025 (150 days remaining)
Duration: 1 year
Status: Active

Loan 2: LO2319202PMFOK
Original Amount: GHS 10,000.00
Current Balance: GHS 2,442.00
Monthly Payment: GHS 667.00
Next Payment: 25/09/2025
Maturity Date: 11/07/2025 (154 days remaining)
Duration: 1 year
Status: Active
⚠️ Arrears: GHS 0.00

Is there anything else you'd like to know about your account?
```

### 5. **Admin Interface**
**File**: `public/loan-upload.html`

**Features:**
- Upload loan CSV files
- View import statistics
- See total loans, active loans, and total outstanding
- Error reporting

**Access**: `http://localhost:4000/loan-upload.html`

### 6. **API Endpoints**

#### Upload Loans
```http
POST /api/admin/upload-loans
Headers: { "Authorization": "Bearer <token>" }
Body: FormData with 'loans' file
Response: {
  "success": true,
  "totalRecords": 25,
  "successCount": 25,
  "errorCount": 0,
  "errors": [],
  "stats": {
    "totalLoans": 25,
    "activeLoans": 23,
    "totalOutstanding": 125450.00
  }
}
```

#### Get Loan Statistics
```http
GET /api/admin/loan-stats
Headers: { "Authorization": "Bearer <token>" }
Response: {
  "totalLoans": 25,
  "activeLoans": 23,
  "totalOutstanding": 125450.00
}
```

### 7. **Knowledge Base Entries**

**Added 3 new loan KB entries:**

1. **check_loan_balance** - Patterns for checking loan balances
2. **loan_payment_schedule** - Patterns for payment dates and duration
3. **loan_arrears** - Patterns for arrears and overdue payments

## 📋 Setup Instructions

### Step 1: Create Loans Table

**For MySQL (Localhost):**
```bash
# Open MySQL command line or phpMyAdmin
mysql -u root -p akcb_bank < database/schema_loans.sql
```

**For PostgreSQL (Production - Render):**
```bash
# Use the fix_render_trigger.js pattern
node -e "
const { Pool } = require('pg');
const fs = require('fs');
const pool = new Pool({ connectionString: 'YOUR_RENDER_DB_URL', ssl: { rejectUnauthorized: false } });
const sql = fs.readFileSync('database/schema_loans.postgres.sql', 'utf8');
pool.query(sql).then(() => console.log('✅ Loans table created')).catch(console.error).finally(() => pool.end());
"
```

### Step 2: Upload Loan Data

1. Navigate to: `http://localhost:4000/loan-upload.html`
2. Log in with admin password
3. Select your loan CSV file (AKCBXDSNOV25.csv)
4. Click "Upload Loan Data"
5. View import statistics

### Step 3: Test Customer Loan Inquiry

**Test Conversation:**
```
User: "Check my balance"
Bot: "Please provide your account number or phone number"

User: "0553513500"
Bot: "I've sent an OTP to your phone..."

User: "123456" (OTP code)
Bot: Shows account balance + all active loans with details
```

## 🔍 How It Works

### Authentication Flow with Loans:

1. **Customer Request**: "check my loan balance"
2. **Pattern Match**: Triggers authentication requirement
3. **OTP Verification**: Customer enters OTP
4. **Data Retrieval**: 
   - Fetches account balances
   - Fetches loans by phone_number OR customer_id
   - Calculates days remaining to maturity
   - Formats all information
5. **Response**: Shows complete financial picture

### Loan Data Matching:

```typescript
// Query uses both phone_number and customer_id for matching
SELECT * FROM loans 
WHERE phone_number = ? OR customer_id = ?
ORDER BY facility_status_code, disbursement_date DESC
```

This ensures customers see their loans even if:
- CSV only has phone number
- CSV only has customer ID
- Both fields are available

## 📊 Loan Status Codes

- **A** = Active (Currently running)
- **C** = Closed (Fully paid)
- **D** = Dormant (Inactive)

## 🎨 Display Features

**Loan Details Include:**
- ✅ Loan account number
- ✅ Original loan amount
- ✅ Current outstanding balance
- ✅ Monthly installment amount
- ✅ Next payment due date
- ✅ Loan maturity date with countdown
- ✅ Loan duration (in years/months)
- ✅ Current status
- ⚠️ Arrears amount (if any)

## 🚀 Production Deployment

**After uploading to production:**

1. Create loans table on Render PostgreSQL
2. Upload loan CSV via admin interface
3. Customers can immediately check loans via OTP

**No code deployment needed** - just database update!

## 📱 Mobile App Integration

The loan data will automatically appear in the mobile app once:
- Loans table is created in production database
- Loan CSV is uploaded via admin portal
- Customers authenticate with OTP

## 🔒 Security Notes

- Loan data only shown after OTP verification
- Admin token required for loan uploads
- All queries use parameterized statements
- Phone numbers masked in logs

## 📞 Support

For loan-related customer inquiries, the bot will suggest:
- Phone: +233 20 205 5170
- Visit any AKCB branch
- Authenticate for real-time loan status

## ✨ Next Steps

You can now:
1. Upload your loan CSV file
2. Test with real customer phone numbers
3. Deploy to production (Render)
4. Monitor loan statistics via admin interface

All files committed to GitHub (commit 43ed5bf)! 🎉
