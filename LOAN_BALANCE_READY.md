# ✅ Loan Balance Checking - Ready for Customers

## Current Status

**Database:** ✅ Loans table created successfully
**Sample Data:** ✅ 1 test loan record exists
**Feature Code:** ✅ Already implemented
**Authentication:** ✅ OTP-based verification working
**Knowledge Base:** ✅ Loan KB entries active

## Database Tables

### 1. **loans** Table
- ✅ **Created:** February 6, 2026
- ✅ **Structure:** 25 columns with proper indexes
- ✅ **Sample Data:** 1 test loan (John Doe - LO2024001)
- 📊 **Current Records:** 1

**Key Fields:**
- `facility_account_number` - Loan account number
- `customer_id` - Customer ID from core banking
- `phone_number` - Customer phone (for matching)
- `customer_name` - Customer full name
- `facility_amount` - Original loan amount
- `current_balance` - Outstanding balance
- `next_payment_date` - Next payment due
- `maturity_date` - When loan matures
- `scheduled_installment` - Monthly payment
- `facility_status_code` - A=Active, C=Closed, D=Dormant
- `amount_in_arrears` - Overdue amount

### 2. **loan_applications** Table
- ✅ Already exists
- 📊 **Current Records:** 5 applications

## How Customers Check Their Loan Balance

### Customer Journey:

1. **Customer asks:**
   - "Check my loan balance"
   - "How much do I owe?"
   - "Show my loan details"
   - "When is my loan payment due?"

2. **System requests authentication:**
   - Account number or phone number
   
3. **OTP verification:**
   - Customer receives 6-digit code via SMS
   - Enters code to verify identity

4. **System retrieves data:**
   - Queries loans by `phone_number` OR `customer_id`
   - Includes all active and closed loans
   - Calculates days to maturity
   
5. **Customer sees:**
   ```
   Loan Information
   
   Loan 1: LO2024001
   Original Amount: GHS 10,000.00
   Current Balance: GHS 6,500.00
   Monthly Payment: GHS 833.33
   Next Payment: January 20, 2025
   Maturity Date: January 15, 2025 (35 days)
   Duration: 1 year
   Status: Active
   ```

## What Customers Can Check

✅ Current loan balance
✅ Original loan amount
✅ Monthly installment
✅ Next payment date
✅ Loan maturity date
✅ Days remaining to maturity
✅ Loan duration
✅ Loan status (Active/Closed/Dormant)
✅ Amount in arrears (if any)
✅ Multiple loans (if they have more than one)

## Knowledge Base Entries (Already Active)

1. **check_loan_balance** - General loan balance inquiries
2. **loan_payment_schedule** - Payment dates and schedules
3. **loan_arrears** - Overdue payment information

## API Endpoints (Admin)

### Upload Loan Data
```http
POST /api/admin/upload-loans
Authorization: Bearer <admin_token>
Content-Type: multipart/form-data

Body: CSV file with loan records
```

### Get Loan Statistics
```http
GET /api/admin/loan-stats
Authorization: Bearer <admin_token>

Response:
{
  "totalLoans": 1,
  "activeLoans": 1,
  "totalOutstanding": 6500.00
}
```

## Next Steps to Enable Production

### 1. Upload Real Loan Data

**Via Admin Portal:**
1. Go to: `https://YOUR-DOMAIN/admin-portal.html`
2. Navigate to "Loan Management" section
3. Upload your CSV file with loan records

**CSV Format Required:**
```csv
FacilityAccNum,CustomerId,MobileTel1,Surname,FirstName,FacilityAmount,CurBal,Maturitydate,NextPaymentDate,FacilityTerm,SchdInstalAmount,FacilityStatusCode
```

**OR use the API:**
```powershell
$headers = @{
    "Authorization" = "Bearer YOUR_ADMIN_TOKEN"
}

$form = @{
    loans = Get-Item -Path "path/to/loans.csv"
}

Invoke-RestMethod -Uri "https://YOUR-DOMAIN/api/admin/upload-loans" `
    -Method POST `
    -Headers $headers `
    -Form $form
```

### 2. Test with Real Customer

1. Find a customer phone number from your loan CSV
2. Test authentication: `0501336873` (or any valid customer)
3. Ask: "Check my loan balance"
4. Verify OTP and see loan details

### 3. Monitor Usage

Check admin portal for:
- Total loans uploaded
- Active vs closed loans
- Total outstanding amount
- Customer loan inquiries

## Testing the Feature

### Test Script (PowerShell):
```powershell
# Test loan balance feature
$session = Invoke-RestMethod -Uri "http://localhost:4000/api/greeting"

# Step 1: Request loan balance (triggers auth)
$response1 = Invoke-RestMethod -Uri "http://localhost:4000/api/chat" `
    -Method POST `
    -ContentType "application/json" `
    -Body (@{
        message = "Check my loan balance"
        sessionId = $session.sessionId
    } | ConvertTo-Json)

Write-Host $response1.response

# Step 2: Provide phone number
$response2 = Invoke-RestMethod -Uri "http://localhost:4000/api/chat" `
    -Method POST `
    -ContentType "application/json" `
    -Body (@{
        message = "0242123456"
        sessionId = $session.sessionId
    } | ConvertTo-Json)

Write-Host $response2.response

# Step 3: Enter OTP (check your SMS)
$otp = Read-Host "Enter OTP from SMS"
$response3 = Invoke-RestMethod -Uri "http://localhost:4000/api/chat" `
    -Method POST `
    -ContentType "application/json" `
    -Body (@{
        message = $otp
        sessionId = $session.sessionId
    } | ConvertTo-Json)

Write-Host $response3.response
```

## Security & Privacy

✅ **OTP Authentication:** All loan data access requires OTP verification
✅ **Phone Matching:** Matches customer by phone OR customer ID
✅ **Encrypted Connection:** SSL/TLS in production
✅ **Admin Only Upload:** Only admins can upload/modify loan data
✅ **Audit Trail:** All authentication attempts logged

## Technical Details

**Code Location:**
- Database Schema: `database/schema_loans.postgres.sql`
- Loan Manager: `src/loanManager.ts`
- Customer Auth: `src/customerAuth.ts` (lines 623-695)
- Main API: `src/index.ts` (lines 890-918)

**Matching Logic:**
```typescript
// System tries multiple phone formats
WHERE phone_number IN (
  '0501336873',           // Original format
  '233501336873',         // With country code
  ...
) OR customer_id = ?      // Fallback to customer ID
```

## Support Contact

For loan inquiries, customers can also:
- 📞 Call: +233 24 231 2059
- 🏦 Visit any AKCB branch
- 💬 Live chat via the chatbot

---

**Status:** ✅ **READY FOR PRODUCTION**
**Created:** February 6, 2026
**Last Updated:** February 6, 2026
