# Account Selection Fix - Multiple Accounts Issue

## Problem
When a customer with multiple accounts authenticated using their phone number and was asked to select an account, typing the account number caused:
1. The bot to repeat the account selection prompt
2. After 3 attempts, the error "Maximum authentication attempts exceeded" appeared
3. The account was never successfully selected

### Example Scenario
```
Customer: 0501336873
Bot: Found 3 accounts:
     1. 1850 - 1511520000230861
     2. 6005 - 1511510000219011
     3. 6550 - 1511510000230861
     
Customer: 1511520000230861
Bot: [Same prompt repeated]
Customer: 1511520000230861
Bot: [Same prompt repeated]
Customer: 1511520000230861
Bot: Maximum authentication attempts exceeded
```

## Root Cause
The account selection handler in `src/index.ts` was positioned AFTER the general authentication check. This caused the following flow:

1. Customer types account number "1511520000230861"
2. `extractAuthDetails()` extracts it as an account number credential
3. `hasAuthCredentials` becomes `true`
4. Code enters authentication block instead of account selection block
5. `authenticateCustomer()` is called, incrementing `session.attempts++`
6. After 3 failed attempts, max attempts error is shown
7. Account selection handler never executes

## Solution
**Reordered the checks in `src/index.ts`** so account selection runs BEFORE authentication:

### Before (Lines 591-702):
```typescript
// Authentication check came first
const authDetails = customerAuth.extractAuthDetails(message);
const hasAuthCredentials = !!(authDetails.accountNumber || ...);

if (hasAuthCredentials) {
  // Enters here when account number is typed
  await customerAuth.authenticateCustomer(...);
}

// Account selection came second (never reached!)
if (session.awaitingAccountSelection && session.availableAccounts) {
  await customerAuth.selectAccount(...);
}
```

### After (Lines 588-640):
```typescript
// Get session first
const session = customerAuth.getOrCreateSession(effectiveSessionId);

// Account selection check comes FIRST
if (session.awaitingAccountSelection && session.availableAccounts) {
  // Now catches account numbers during selection!
  await customerAuth.selectAccount(...);
  return res.json(responseData);
}

// Authentication check comes second
const authDetails = customerAuth.extractAuthDetails(message);
const hasAuthCredentials = !!(authDetails.accountNumber || ...);

if (hasAuthCredentials) {
  await customerAuth.authenticateCustomer(...);
}
```

## Impact
- ✅ Account selection now works correctly
- ✅ Typing account number during selection goes to `selectAccount()`, not `authenticateCustomer()`
- ✅ No more false "Maximum authentication attempts exceeded" errors
- ✅ Session attempts counter only increments during actual authentication, not during selection
- ✅ All existing functionality preserved (authentication, OTP, balance checks, etc.)

## Testing
To test the fix:
1. Enter phone number with multiple accounts (e.g., 0501336873)
2. Bot shows 3 accounts with selection buttons
3. Type or click one of the account numbers
4. Should proceed to OTP verification immediately
5. No repetition of selection prompt

## Commit
- **Commit**: `a5ca5cf`
- **Message**: "Fix account selection: move handler before auth check to prevent interception"
- **Files Changed**: `src/index.ts`
- **Deployed to**: Render (automatic deployment)

## Date
December 2024
