# Database Integration Setup Guide

## Quick Start

### 1. Create Database

Since you're using Laragon (which includes MySQL), the database is already available.

**Option A: Using phpMyAdmin**
1. Open http://localhost/phpmyadmin
2. Click "Import" tab
3. Choose file: `database/schema.sql`
4. Click "Go"

**Option B: Using MySQL Command Line**
```bash
# In Laragon terminal or CMD
mysql -u root -p < database/schema.sql
```

This will:
- Create `akcb_bank` database
- Create 3 tables: `customers`, `account_balances`, `transactions`
- Insert 5 sample customers with test data

### 2. Configure Environment

Copy `.env.example` to `.env` and update database settings:

```env
# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=        # Leave empty if no password
DB_NAME=akcb_bank
DB_PORT=3306
```

### 3. Build and Start

```bash
npm run build
npm start
```

The server will test the database connection on startup.

## Sample Test Accounts

Use these accounts to test authentication:

| Account Number | Name | Phone | DOB | Balance |
|---|---|---|---|---|
| 1234567890 | John Doe | 0242123456 | 15/05/1990 | GHS 5,320.50 |
| 2345678901 | Jane Smith | 0243234567 | 22/08/1985 | GHS 15,750.00 |
| 3456789012 | Kwame Mensah | 0244345678 | 10/03/1992 | GHS 8,100.75 |
| 4567890123 | Ama Boateng | 0245456789 | 30/11/1988 | GHS 3,500.00 |
| 5678901234 | Kofi Asante | 0246567890 | 18/07/1995 | GHS 12,250.25 |

## Testing the System

### Test 1: Check Balance

**User**: "Check my balance"
**Bot**: "To check your account information, I need to verify your identity. Please provide your account number and registered phone number."

**User**: "My account is 1234567890 and phone is 0242123456"
**Bot**: "Welcome back! I've verified your identity. How can I help you with your account today?"

**User**: "Show my balance"
**Bot**: 
```
**Account Balance**

Account: 1234567890
Name: John Doe
Type: Savings

Available Balance: GHS 5,320.50
Ledger Balance: GHS 5,420.50

Is there anything else you'd like to know about your account?
```

### Test 2: View Transactions

**User**: "Show my recent transactions"
**Bot**: 
```
**Recent Transactions**

2025-12-10: ATM Withdrawal - Amantin
Amount: -GHS 500.00
Balance: GHS 5,320.50

2025-12-08: Salary Credit
Amount: +GHS 3,000.00
Balance: GHS 5,820.50

2025-12-05: Mobile Money Transfer
Amount: -GHS 200.00
Balance: GHS 2,820.50

...

For a detailed statement, please visit any branch or use our mobile banking app.
```

## Database Schema Overview

### Table: customers
Stores customer account information
- `account_number` - Unique account identifier (VARCHAR 16)
- `account_name` - Customer full name
- `phone_number` - Registered phone
- `date_of_birth` - For verification
- `account_type` - Savings, Current, Salary, Susu, Fixed Deposit
- `status` - Active, Dormant, Closed, Frozen

### Table: account_balances
Current account balances
- `ledger_balance` - Total balance including pending
- `available_balance` - Withdrawable balance
- `currency` - GHS (Ghana Cedis)

### Table: transactions
Transaction history
- `transaction_date` - When transaction occurred
- `description` - Transaction details
- `debit_amount` - Money out
- `credit_amount` - Money in
- `balance_after` - Balance after transaction
- `reference_number` - Unique transaction reference

## Integrating with Your Actual Banking System

### Option 1: Replace Sample Data

If you have existing banking tables:

1. Modify queries in `src/customerAuth.ts` to match your table names
2. Adjust column names as needed
3. Update date formats if different

### Option 2: Create Views

Create database views that map your existing tables to the expected schema:

```sql
CREATE VIEW customers AS
SELECT 
  your_account_col AS account_number,
  your_name_col AS account_name,
  your_phone_col AS phone_number,
  your_dob_col AS date_of_birth,
  your_type_col AS account_type,
  your_status_col AS status
FROM your_existing_customer_table;
```

### Option 3: Sync Data

Create a script to periodically sync data from your core banking system:

```javascript
// scripts/sync_banking_data.js
// Fetch from core banking API/database and update akcb_bank tables
```

## Security Checklist

- [x] Prepared statements (SQL injection prevention)
- [x] Connection pooling
- [ ] Add rate limiting (recommended)
- [ ] Add audit logging
- [ ] Implement OTP verification
- [ ] Add encryption for sensitive data
- [ ] Set up database backups
- [ ] Configure SSL for database connection
- [ ] Implement session encryption
- [ ] Add monitoring and alerting

## Troubleshooting

### Connection Failed
```
[Server] Database connection failed
```
**Fix**: Check `.env` settings, ensure MySQL is running in Laragon

### Table Not Found
```
Error: Table 'akcb_bank.customers' doesn't exist
```
**Fix**: Run `database/schema.sql` to create tables

### Authentication Not Working
```
[Auth] No customer found with provided credentials
```
**Fix**: Verify test account data exists, check phone number format

### No Transactions Returned
Check if transactions table has data:
```sql
SELECT COUNT(*) FROM transactions WHERE account_number = '1234567890';
```

## Production Deployment

1. **Backup Strategy**: Set up automated database backups
2. **Monitoring**: Add database performance monitoring
3. **Scaling**: Consider read replicas for high traffic
4. **Security**: Enable SSL, restrict database access
5. **Compliance**: Ensure data protection regulations compliance

## Support

Need help with database integration?
- Check server logs: `server.log`
- Review database queries in `src/customerAuth.ts`
- Test queries directly in phpMyAdmin
- Contact IT Department: +233 24 231 2059
