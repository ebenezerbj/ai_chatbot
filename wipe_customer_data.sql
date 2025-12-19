-- SQL Script to wipe all customer data from database
-- Run this in the Render Postgres Shell or pgAdmin

-- IMPORTANT: This will permanently delete all customer data!
-- Make sure you want to do this before running.

BEGIN;

-- Delete data in order that respects foreign key constraints
DELETE FROM transactions;
DELETE FROM account_balances;
DELETE FROM customers;
DELETE FROM loans;

-- Verify deletion
SELECT 'transactions' as table_name, COUNT(*) as remaining_rows FROM transactions
UNION ALL
SELECT 'account_balances', COUNT(*) FROM account_balances
UNION ALL
SELECT 'customers', COUNT(*) FROM customers
UNION ALL
SELECT 'loans', COUNT(*) FROM loans;

-- If everything looks good, commit:
COMMIT;

-- If you want to undo, run instead:
-- ROLLBACK;
