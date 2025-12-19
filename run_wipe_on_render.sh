#!/bin/bash
# Run this script on your Render server shell

# Connect to PostgreSQL and execute the wipe commands
psql $DATABASE_URL << 'EOF'

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

COMMIT;

EOF

echo "✓ Data wipe complete"
