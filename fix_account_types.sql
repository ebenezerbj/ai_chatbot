-- Fix account_type column based on account number structure
-- Position 6 of account number indicates type: 1=Savings, 2=Current

-- First, let's see the current state
SELECT 
    SUBSTRING(account_number, 6, 1) as type_indicator,
    account_type,
    COUNT(*) as count
FROM customers
WHERE LENGTH(REPLACE(account_number, 'v', '')) >= 6
GROUP BY SUBSTRING(account_number, 6, 1), account_type
ORDER BY type_indicator, count DESC;

-- Update Savings Accounts (type indicator = 1)
UPDATE customers
SET account_type = '1850'
WHERE LENGTH(REPLACE(account_number, 'v', '')) >= 6
  AND SUBSTRING(REPLACE(account_number, 'v', ''), 6, 1) = '1'
  AND account_type != '1850';

-- Update Current Accounts (type indicator = 2)
UPDATE customers
SET account_type = '1800'
WHERE LENGTH(REPLACE(account_number, 'v', '')) >= 6
  AND SUBSTRING(REPLACE(account_number, 'v', ''), 6, 1) = '2'
  AND account_type != '1800';

-- Verify the changes
SELECT 
    SUBSTRING(account_number, 6, 1) as type_indicator,
    account_type,
    COUNT(*) as count,
    CASE 
        WHEN SUBSTRING(REPLACE(account_number, 'v', ''), 6, 1) = '1' THEN 'Should be 1850 (Savings)'
        WHEN SUBSTRING(REPLACE(account_number, 'v', ''), 6, 1) = '2' THEN 'Should be 1800 (Current)'
        ELSE 'Unknown pattern'
    END as expected_type
FROM customers
WHERE LENGTH(REPLACE(account_number, 'v', '')) >= 6
GROUP BY SUBSTRING(account_number, 6, 1), account_type
ORDER BY type_indicator, count DESC;

-- Show specific example: the account in question
SELECT 
    account_number,
    SUBSTRING(REPLACE(account_number, 'v', ''), 6, 1) as type_indicator,
    account_type,
    CASE 
        WHEN SUBSTRING(REPLACE(account_number, 'v', ''), 6, 1) = '1' THEN 'Savings Account'
        WHEN SUBSTRING(REPLACE(account_number, 'v', ''), 6, 1) = '2' THEN 'Current Account'
        ELSE 'Unknown'
    END as derived_type
FROM customers
WHERE account_number IN ('1511520000230861', '1511510000230861')
ORDER BY account_number;
