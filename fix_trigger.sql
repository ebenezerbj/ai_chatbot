-- Fix PostgreSQL trigger for account_balances table
-- This script fixes the trigger error: record "new" has no field "updated_at"

-- Step 1: Drop the incorrect trigger if it exists
DROP TRIGGER IF EXISTS update_account_balances_updated_at ON account_balances;
DROP TRIGGER IF EXISTS update_account_balances_last_updated ON account_balances;

-- Step 2: Create the correct trigger function for last_updated column
CREATE OR REPLACE FUNCTION update_last_updated_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_updated = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Step 3: Create the trigger on account_balances table
CREATE TRIGGER update_account_balances_last_updated 
    BEFORE UPDATE ON account_balances
    FOR EACH ROW 
    EXECUTE FUNCTION update_last_updated_column();

-- Verify the fix
SELECT 
    tgname AS trigger_name,
    tgrelid::regclass AS table_name,
    proname AS function_name
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgrelid = 'account_balances'::regclass;
