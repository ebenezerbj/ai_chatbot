# Customer Authentication Integration Guide

## Overview
This guide explains how to integrate customer authentication with your actual banking database/core banking system.

## Current Implementation
The chatbot now includes a customer authentication module (`src/customerAuth.ts`) with:
- Session management
- Multi-step authentication flow
- Account balance and transaction queries
- Mock data responses

## Integration Steps

### 1. Database Schema
You'll need a `customers` table with these fields (or similar):

```sql
CREATE TABLE customers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    account_number VARCHAR(16) UNIQUE NOT NULL,
    account_name VARCHAR(100) NOT NULL,
    phone_number VARCHAR(15),
    date_of_birth DATE,
    email VARCHAR(100),
    account_type ENUM('Savings', 'Current', 'Salary', 'Susu'),
    branch_code VARCHAR(10),
    status ENUM('Active', 'Dormant', 'Closed') DEFAULT 'Active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE account_balances (
    account_number VARCHAR(16) PRIMARY KEY,
    ledger_balance DECIMAL(15,2) NOT NULL,
    available_balance DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'GHS',
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE transactions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    account_number VARCHAR(16) NOT NULL,
    transaction_date DATETIME NOT NULL,
    description VARCHAR(200),
    debit_amount DECIMAL(15,2) DEFAULT 0,
    credit_amount DECIMAL(15,2) DEFAULT 0,
    balance_after DECIMAL(15,2),
    reference_number VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_account_date (account_number, transaction_date DESC)
);
```

### 2. Replace Mock Functions

#### A. Update `validateCredentials()` in `src/customerAuth.ts`

Replace the mock function with actual database query:

```typescript
import mysql from 'mysql2/promise';

// Create database connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

export async function validateCredentials(
  accountNumber: string,
  phoneNumber?: string,
  dateOfBirth?: string
): Promise<{ valid: boolean; reason?: string; customerName?: string }> {
  try {
    const connection = await pool.getConnection();
    
    try {
      // Build query based on provided information
      let query = 'SELECT account_number, account_name FROM customers WHERE account_number = ? AND status = "Active"';
      const params: any[] = [accountNumber];
      
      if (phoneNumber) {
        query += ' AND phone_number = ?';
        params.push(phoneNumber);
      }
      
      if (dateOfBirth) {
        query += ' AND date_of_birth = ?';
        params.push(dateOfBirth);
      }
      
      const [rows] = await connection.query(query, params);
      
      if (Array.isArray(rows) && rows.length > 0) {
        return {
          valid: true,
          customerName: (rows[0] as any).account_name
        };
      }
      
      return {
        valid: false,
        reason: "Invalid account details. Please verify your account number and phone number."
      };
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('[Auth] Database error:', error);
    return {
      valid: false,
      reason: "Unable to verify your details at this time. Please try again later."
    };
  }
}
```

#### B. Update `getCustomerAccountData()` in `src/customerAuth.ts`

Replace mock data with actual queries:

```typescript
export async function getCustomerAccountData(accountNumber: string): Promise<any> {
  try {
    const connection = await pool.getConnection();
    
    try {
      // Get customer info
      const [customerRows] = await connection.query(
        'SELECT * FROM customers WHERE account_number = ?',
        [accountNumber]
      );
      
      if (!Array.isArray(customerRows) || customerRows.length === 0) {
        throw new Error('Customer not found');
      }
      
      const customer = customerRows[0] as any;
      
      // Get account balance
      const [balanceRows] = await connection.query(
        'SELECT * FROM account_balances WHERE account_number = ?',
        [accountNumber]
      );
      
      const balance = (balanceRows as any[])[0] || { 
        ledger_balance: 0, 
        available_balance: 0, 
        currency: 'GHS' 
      };
      
      // Get recent transactions (last 10)
      const [transactionRows] = await connection.query(
        `SELECT 
          DATE_FORMAT(transaction_date, '%Y-%m-%d') as date,
          description,
          CASE 
            WHEN debit_amount > 0 THEN -debit_amount
            ELSE credit_amount
          END as amount,
          balance_after as balance
        FROM transactions 
        WHERE account_number = ? 
        ORDER BY transaction_date DESC 
        LIMIT 10`,
        [accountNumber]
      );
      
      return {
        accountNumber: customer.account_number,
        accountName: customer.account_name,
        accountType: customer.account_type,
        balance: {
          ledger: parseFloat(balance.ledger_balance),
          available: parseFloat(balance.available_balance),
          currency: balance.currency
        },
        recentTransactions: transactionRows
      };
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('[Auth] Error fetching account data:', error);
    throw error;
  }
}
```

### 3. Environment Variables

Add to `.env`:

```env
# Database Configuration
DB_HOST=your-database-host
DB_USER=your-database-user
DB_PASSWORD=your-database-password
DB_NAME=your-database-name
DB_PORT=3306

# Session Security
SESSION_SECRET=your-random-secret-key-here
```

### 4. Install Required Packages

```bash
npm install mysql2
```

### 5. Security Considerations

#### A. Add Rate Limiting for Authentication Attempts

```typescript
import rateLimit from 'express-rate-limit';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: 'Too many authentication attempts. Please try again later.'
});

// Apply to chat endpoint
app.post('/api/chat', authLimiter, async (req, res) => {
  // ... existing code
});
```

#### B. Add Input Validation

```typescript
function sanitizeAccountNumber(input: string): string {
  return input.replace(/[^\d]/g, '').substring(0, 16);
}

function sanitizePhoneNumber(input: string): string {
  return input.replace(/[^\d+]/g, '').substring(0, 15);
}
```

#### C. Hash Sensitive Data in Logs

```typescript
function maskAccountNumber(accNum: string): string {
  if (accNum.length <= 4) return '****';
  return '****' + accNum.slice(-4);
}

console.log('[Auth] Validating account:', maskAccountNumber(accountNumber));
```

### 6. Production Deployment Checklist

- [ ] Replace all mock functions with actual database queries
- [ ] Set up database connection pooling
- [ ] Configure environment variables on production server
- [ ] Enable rate limiting for authentication endpoints
- [ ] Set up session storage (Redis recommended for production)
- [ ] Implement proper error handling and logging
- [ ] Add monitoring for failed authentication attempts
- [ ] Test authentication flow with real customer data
- [ ] Set up database backup and recovery
- [ ] Configure SSL/TLS for database connections
- [ ] Review and update security policies
- [ ] Test session timeout and cleanup
- [ ] Add audit logging for account access

### 7. Testing

Create test cases for:
- Valid authentication with account number + phone
- Invalid credentials
- Session expiry
- Multiple authentication attempts
- Balance inquiry
- Transaction history
- Session persistence

### 8. Alternative: API Integration

If your core banking system has an API, you can integrate directly:

```typescript
export async function validateCredentials(
  accountNumber: string,
  phoneNumber?: string,
  dateOfBirth?: string
): Promise<{ valid: boolean; reason?: string; customerName?: string }> {
  try {
    const response = await axios.post(
      process.env.CORE_BANKING_API + '/validate-customer',
      {
        accountNumber,
        phoneNumber,
        dateOfBirth
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.CORE_BANKING_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    return {
      valid: response.data.valid,
      customerName: response.data.customerName,
      reason: response.data.reason
    };
  } catch (error) {
    console.error('[Auth] API error:', error);
    return {
      valid: false,
      reason: "Unable to verify your details at this time."
    };
  }
}
```

## Support

For questions or issues with integration:
- Contact IT Department
- Review logs in `server.log`
- Check database connectivity
- Verify environment variables

## Next Steps

1. Review current database schema
2. Identify required tables and fields
3. Update connection configuration
4. Replace mock functions with real queries
5. Test with sample data
6. Deploy to staging environment
7. Conduct user acceptance testing
8. Deploy to production
