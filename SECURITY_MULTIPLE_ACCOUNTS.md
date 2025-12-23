# Security Enhancement - OTP Verification Before Account Display

## Overview
Enhanced security for customers with multiple accounts by requiring OTP verification BEFORE displaying account numbers.

## Security Flow

### Previous Flow (Less Secure)
1. Customer enters phone number
2. **System immediately shows all account numbers** ❌
3. Customer selects an account
4. System sends OTP
5. Customer verifies OTP
6. Access granted

**Security Risk**: Anyone with just a phone number could see all associated account numbers without verification.

### New Flow (More Secure) ✅
1. Customer enters phone number
2. System detects multiple accounts
3. **System sends OTP immediately** (before showing accounts)
4. Customer verifies OTP
5. **After OTP verification, system shows account selection**
6. Customer selects account
7. Access granted (already authenticated)

## Implementation Details

### Changes in `customerAuth.ts`

#### 1. Send OTP When Multiple Accounts Detected
```typescript
// Lines 393-424: In authenticateCustomer()
if (validation.multipleAccounts && validation.accounts) {
  // Store accounts but don't show yet
  session.availableAccounts = validation.accounts;
  session.awaitingAccountSelection = true;
  
  // Send OTP FIRST for security
  const otpResult = await otpService.generateAndSendOTP(
    validation.phoneNumber!,
    validation.phoneNumber!,
    'Valued Customer'
  );
  
  return {
    success: false,
    message: `${otpResult.message}\n\nOnce verified, you'll be able to select from your ${validation.accounts.length} registered accounts.`,
    session,
    awaitingOTP: true
  };
}
```

#### 2. Show Account Selection After OTP Verification
```typescript
// Lines 329-358: In authenticateCustomer() OTP verification
if (verification.success) {
  session.awaitingOTP = false;
  
  // Check if customer has multiple accounts awaiting selection
  if (session.awaitingAccountSelection && session.availableAccounts) {
    return {
      success: false,
      message: `OTP verified! ✓\n\nYou have ${session.availableAccounts.length} accounts registered. Please select which account you want to access:`,
      session,
      awaitingOTP: false
    };
  }
  
  // Single account - complete authentication
  session.isAuthenticated = true;
  // ...
}
```

#### 3. Complete Authentication at Account Selection
```typescript
// Lines 841-866: In selectAccount()
// Set selected account and complete authentication (OTP already verified)
session.accountNumber = selectedAccount.accountNumber;
session.customerName = selectedAccount.accountName;
session.awaitingAccountSelection = false;
session.availableAccounts = undefined;
session.isAuthenticated = true; // Complete authentication
session.authenticatedAt = new Date();
session.expiresAt = new Date(Date.now() + SESSION_TIMEOUT);

return {
  success: true,
  message: `${greeting} You've selected account ${selectedAccount.accountNumber}. How can I help you today?`,
  session,
  awaitingOTP: false
};
```

### Changes in `index.ts`

#### Show Account Buttons After OTP Verification
```typescript
// Lines 753-761: In OTP handler
if (!authResult.awaitingOTP && authResult.session.awaitingAccountSelection && authResult.session.availableAccounts) {
  responseData.buttons = authResult.session.availableAccounts.map((acc, index) => ({
    text: `${index + 1}. ${acc.accountType} - ${acc.accountNumber}`,
    action: 'send',
    value: acc.accountNumber
  }));
}
```

#### Show Quick Action Buttons After Account Selection
```typescript
// Lines 625-633: In account selection handler
else if (authResult.success) {
  responseData.buttons = [
    { text: 'Check my balance', action: 'send', value: 'What is my account balance?' },
    { text: 'Recent transactions', action: 'send', value: 'Show me my recent transactions' },
    // ... other buttons
  ];
}
```

## User Experience

### Example Conversation

**Customer**: `0501336873`

**Bot**: 
```
I've sent a verification code to your phone ending in ***6873. Please enter the 6-digit code to continue.

Once verified, you'll be able to select from your 3 registered accounts.
```

**Customer**: `123456` (OTP)

**Bot**: 
```
OTP verified! ✓

You have 3 accounts registered. Please select which account you want to access:

[Button: 1. 1850 - 1511520000230861]
[Button: 2. 6005 - 1511510000219011]
[Button: 3. 6550 - 1511510000230861]
```

**Customer**: Clicks button or types account number

**Bot**: 
```
Welcome, John! You've selected account 1511520000230861 (1850). How can I help you today?

[Button: Check my balance]
[Button: Recent transactions]
[Button: Salary overdraft (salary workers)]
[Button: Apply for a loan]
[Button: Loan information]
[Button: Other inquiry]
```

## Security Benefits

✅ **Account Privacy**: Account numbers are only shown to verified users
✅ **OTP Protection**: Phone number verification before revealing sensitive data
✅ **One-Time Authentication**: OTP only sent once, account selection doesn't require another OTP
✅ **Session Security**: All account information protected by authenticated session

## Testing

### Test Scenario
1. Use phone number with multiple accounts: `0501336873`
2. Enter the phone number
3. Verify you receive OTP prompt (no accounts shown)
4. Enter OTP code
5. Verify account selection buttons appear AFTER OTP verification
6. Select an account
7. Verify immediate access (no second OTP)

### Expected Behavior
- ✅ Account numbers NOT visible before OTP
- ✅ OTP sent immediately when multiple accounts detected
- ✅ Account numbers visible ONLY after OTP verification
- ✅ Account selection completes authentication (no second OTP)
- ✅ Quick action buttons appear after account selection

## Deployment
- **Commit**: `d4b05ef`
- **Message**: "Security: Verify OTP before showing account numbers for multiple accounts"
- **Files Changed**: `src/customerAuth.ts`, `src/index.ts`
- **Status**: Deployed to Render

## Date
December 23, 2025
