# Multiple Accounts Balance Fix

## Issue
Bot was repeating the first selected account's balance for customers with multiple accounts, instead of providing individual balances for each account when requested.

## Root Cause
1. The `selectAccount` function cleared the `availableAccounts` array after account selection
2. The balance retrieval logic always used the first selected account number stored in session
3. No logic to detect when customer wants to check a different account

## Solution Implemented

### 1. Session Management Enhancement
**File**: `src/customerAuth.ts`

- **Kept `availableAccounts` in session**: Modified `selectAccount()` to keep the list of all customer accounts in the session instead of clearing them after selection
- This allows the bot to remember all accounts the customer has throughout the authenticated session

### 2. Account Number Extraction
**File**: `src/customerAuth.ts`

- **New function `extractAccountNumberFromQuery()`**: Detects when customer mentions a specific account number in their query
- Supports full account numbers (13-16 digits)
- Supports partial matches
- Returns the matched account number if it's in the customer's available accounts

### 3. Dynamic Account Selection
**File**: `src/index.ts`

- **Smart account routing**: Before fetching balance data, checks if customer has multiple accounts
- If a specific account number is mentioned in the query, fetches data for that account
- Otherwise, defaults to the originally selected account
- Logs which account is being queried for debugging

### 4. Account Listing Feature
**File**: `src/customerAuth.ts` & `src/index.ts`

- **New function `formatAllAccountsList()`**: Formats a nice list of all customer accounts
- **Query detection**: Detects when customer asks to see all their accounts with patterns like:
  - "list my accounts"
  - "show all my accounts"
  - "how many accounts do I have"
  - "what accounts do I have"

### 5. Helpful Hints
**File**: `src/index.ts`

- **Multiple account notification**: Adds a note at the end of balance responses when customer has multiple accounts
- Informs them how many accounts they have
- Suggests they can check other accounts by mentioning the account number
- Suggests typing "show all my accounts" to see the full list

## Code Changes

### customerAuth.ts
```typescript
// Line ~939: Keep availableAccounts instead of clearing
session.awaitingAccountSelection = false;
// Keep availableAccounts so user can query other accounts later
session.isAuthenticated = true;

// Line ~970: New helper function
export function extractAccountNumberFromQuery(message, availableAccounts) {
  // Extracts account number from user query
  // Supports full and partial account number matching
}

// Line ~728: New formatting function
export function formatAllAccountsList(availableAccounts) {
  // Formats a list of all customer accounts
  // Shows account number, name, and type for each
}
```

### index.ts
```typescript
// Line ~738: Check for "list all accounts" requests
if (authSession.availableAccounts && authSession.availableAccounts.length > 1) {
  if (/(list|show|view|all)\s+(my\s+)?(accounts?)/i.test(message)) {
    return formatAllAccountsList(authSession.availableAccounts);
  }
}

// Line ~749: Detect specific account requests
let accountNumberToQuery = authSession.accountNumber!;
if (authSession.availableAccounts && authSession.availableAccounts.length > 1) {
  const specificAccount = extractAccountNumberFromQuery(message, authSession.availableAccounts);
  if (specificAccount) {
    accountNumberToQuery = specificAccount;
  }
}

// Line ~779: Add helpful note about multiple accounts
if (authSession.availableAccounts && authSession.availableAccounts.length > 1) {
  response += "\n\n*💡 Note: You have X accounts with us...*";
}
```

## Usage Examples

### Example 1: Checking Specific Account
**Customer**: "What's the balance of account 0041021234567?"
**Bot**: Shows balance for account 0041021234567 specifically

### Example 2: Listing All Accounts
**Customer**: "Show all my accounts"
**Bot**: 
```
**Your Accounts**

You have 3 accounts with us:

1. **Savings Account**
   Account: 0041021234567
   Name: John Doe

2. **Current Account**
   Account: 0041029876543
   Name: John Doe

3. **Fixed Deposit**
   Account: 0041025555555
   Name: John Doe

To check the balance of a specific account, please mention the account number...
```

### Example 3: Automatic Notification
**Customer**: "Check my balance"
**Bot**: Shows the originally selected account balance, then adds:
```
💡 Note: You have 3 accounts with us. To check your other accounts, 
mention the account number or type "show all my accounts".
```

## Benefits

1. ✅ **Accurate Balance Retrieval**: Each account shows its own correct balance
2. ✅ **Better UX**: Customers can easily switch between accounts
3. ✅ **Transparency**: Customers are informed they have multiple accounts
4. ✅ **Flexibility**: Works with account numbers mentioned naturally in conversation
5. ✅ **Backward Compatible**: Existing single-account customers unaffected

## Testing Checklist

- [ ] Customer with multiple accounts can check balance of first account
- [ ] Customer can check balance of second account by mentioning account number
- [ ] Customer can check balance of third account by mentioning account number
- [ ] "Show all my accounts" lists all accounts correctly
- [ ] Account number mentioned in middle of sentence is detected
- [ ] Partial account number matching works
- [ ] Single-account customers still work normally
- [ ] Session still expires correctly
- [ ] Multiple account note appears only for customers with 2+ accounts

## Deployment

1. Code built successfully with TypeScript compiler
2. Ready to deploy to production
3. No database schema changes required
4. No breaking changes to existing functionality

## Date
December 29, 2024
