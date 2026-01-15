-- Check for balance upload transactions and recent updates
-- Run multiple queries to debug the transaction recording issue

-- Query 1: Count BAL-* transactions
SELECT 'BAL Transactions' as query_name, COUNT(*) as count 
FROM transactions 
WHERE reference_number LIKE 'BAL-%';

-- Query 2: Check recent balance updates (today)
SELECT 'Balances Updated Today' as query_name, COUNT(*) as count 
FROM account_balances 
WHERE DATE(last_updated) = CURDATE();

-- Query 3: Sample recent transactions (any type)
SELECT 'Recent Transactions' as query_name;
SELECT 
  id, 
  account_number, 
  DATE(transaction_date) as date,
  description,
  reference_number,
  transaction_type,
  channel,
  balance_after
FROM transactions 
ORDER BY created_at DESC 
LIMIT 10;

-- Query 4: Check for specific account (Ebenezer)
SELECT 'Ebenezer Account Check' as query_name;
SELECT 
  c.account_number,
  c.account_name,
  ab.ledger_balance,
  ab.last_updated,
  (SELECT COUNT(*) FROM transactions t WHERE t.account_number = c.account_number) as transaction_count
FROM customers c
LEFT JOIN account_balances ab ON c.account_number = ab.account_number
WHERE c.account_name LIKE '%EBENEZER%'
LIMIT 3;
