# Transaction Queries Guide

## Overview
The chatbot can now respond to customer queries about recent transactions. Customers can view their last 10 transactions after authenticating with OTP.

## How It Works

### 1. Authentication Required
To view transactions, customers must first authenticate:
- Provide account number or phone number
- Verify identity with OTP sent via SMS

### 2. Transaction Query Patterns
The bot recognizes these types of queries:
- "Show my recent transactions"
- "View my transaction history"
- "Show last transactions"
- "Mini statement"
- "Recent activity"
- "Show deposits and withdrawals"
- "What transactions have I made"
- "Show me my last 10 transactions"

### 3. What's Displayed
When a customer asks about transactions, they see:
- **Last 10 transactions** (most recent first)
- **Transaction date**
- **Description** (e.g., "Balance Upload - Deposit of GHS 500.00")
- **Amount** (with +/- sign for deposits/withdrawals)
- **Balance after transaction**
- **Reference number** (for tracking)

## Example Conversation

```
Customer: "Hi, I want to check my recent transactions"

Bot: "I can help you view your recent transactions! To access your account information, 
      please provide your account number or registered phone number."

Customer: "0553513500"

Bot: "I've sent a verification code to your phone number ending in 3500. 
      Please enter the 6-digit code to verify your identity."

Customer: "123456"

Bot: "✅ Identity verified! Welcome back!

**Recent Transactions**

15/01/2026: Balance Upload - Deposit of GHS 500.00
Amount: +GHS 500.00
Balance: GHS 1,500.00

14/01/2026: Balance Upload - Withdrawal of GHS 200.00
Amount: -GHS 200.00
Balance: GHS 1,000.00

13/01/2026: ATM Withdrawal
Amount: -GHS 100.00
Balance: GHS 1,200.00

...

For a detailed statement, please visit any branch or use our mobile banking app."
```

## Integration with Balance Upload Feature

The transaction recording feature automatically creates transaction records when:
- Balance uploads show an increase → Records as **Deposit**
- Balance uploads show a decrease → Records as **Withdrawal**

### Transaction Details from Balance Uploads:
- **Reference**: `BAL-{account_number}-{timestamp}`
- **Description**: "Balance Upload - Deposit/Withdrawal of GHS XX.XX"
- **Channel**: Internal
- **Type**: Deposit or Withdrawal

## Quick Action Buttons

After authentication, customers see quick action buttons including:
- ✅ **Check my balance**
- ✅ **Recent transactions** ← Shows transactions
- 💰 **Salary overdraft**
- 🏦 **Apply for a loan**
- 📊 **Loan information**

## Testing

### Test Scenario 1: View Transactions
1. Start chatbot
2. Say: "Show my transactions"
3. Provide account number when prompted
4. Enter OTP received via SMS
5. View last 10 transactions

### Test Scenario 2: After Balance Upload
1. Admin uploads new balances with changes
2. Customer authenticates
3. Customer asks: "Show my recent transactions"
4. Customer sees the new transaction from balance upload

### Test Scenario 3: Using Quick Button
1. Customer authenticates
2. Clicks "Recent transactions" button
3. Immediately sees transaction history

## Knowledge Base Entry

The KB has been updated to inform customers about transaction viewing:

**Entry ID**: `view_recent_transactions`

**Patterns Recognized**:
- show last transactions
- show my transactions
- show recent transactions
- mini statement
- transaction history
- account statement
- show deposits and withdrawals
- (and more...)

**Response**: Explains that customers can view transactions after authentication

## Technical Implementation

### Files Modified:
1. **`src/balanceUpdater.ts`** - Creates transaction records during balance uploads
2. **`src/customerAuth.ts`** - Already included `formatTransactionsResponse()` function
3. **`src/index.ts`** - Already routes transaction queries to format function (line 793)
4. **`data/kb.json`** - Updated transaction KB entry with better patterns and explanation

### Database Query:
Transactions are fetched from the `transactions` table:
```sql
SELECT 
  transaction_date as date,
  description,
  CASE 
    WHEN debit_amount > 0 THEN -debit_amount
    ELSE credit_amount
  END as amount,
  balance_after as balance,
  reference_number
FROM transactions 
WHERE account_number = ? 
ORDER BY transaction_date DESC, id DESC
LIMIT 10
```

## Benefits

1. ✅ **Instant Access** - No need to visit branch for mini-statements
2. ✅ **24/7 Availability** - Check transactions anytime
3. ✅ **Secure** - OTP verification required
4. ✅ **Comprehensive** - Shows all transaction types
5. ✅ **Automatic** - Integrates with balance upload system
6. ✅ **User-Friendly** - Natural language queries supported

## Future Enhancements

Possible improvements:
- Filter transactions by date range
- Filter by transaction type (deposits only, withdrawals only)
- Export transactions as PDF/CSV
- Search transactions by description or reference
- Show transaction details on demand
- Monthly/yearly transaction summaries

## Support

For issues or questions:
- Check server logs for transaction query processing
- Verify transactions table has data: `SELECT COUNT(*) FROM transactions`
- Test authentication flow first
- Ensure OTP system is working

---

**Last Updated**: January 15, 2026
**Feature Status**: ✅ Active and Operational
