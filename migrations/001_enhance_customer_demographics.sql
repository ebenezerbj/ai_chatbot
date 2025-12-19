-- Enhanced Customer Demographics Schema
-- Capturing all available fields from Latest_Acc.csv
-- Created: December 19, 2025

-- PostgreSQL Version

ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS customer_id VARCHAR(20),           -- Bank Specific CIN
ADD COLUMN IF NOT EXISTS customer_type VARCHAR(20),         -- Individual/Corporate
ADD COLUMN IF NOT EXISTS title VARCHAR(10),                 -- Mr/Mrs/Ms/Dr
ADD COLUMN IF NOT EXISTS first_name VARCHAR(50),
ADD COLUMN IF NOT EXISTS middle_name VARCHAR(50),
ADD COLUMN IF NOT EXISTS surname VARCHAR(50),
ADD COLUMN IF NOT EXISTS previous_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS company_name VARCHAR(150),
ADD COLUMN IF NOT EXISTS gender VARCHAR(10),                -- Male/Female
ADD COLUMN IF NOT EXISTS id_type VARCHAR(30),               -- Ghana Card/Passport/Voter ID
ADD COLUMN IF NOT EXISTS id_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS date_of_birth DATE,
ADD COLUMN IF NOT EXISTS home_address TEXT,
ADD COLUMN IF NOT EXISTS postal_address VARCHAR(150),
ADD COLUMN IF NOT EXISTS country VARCHAR(50) DEFAULT 'Ghana',
ADD COLUMN IF NOT EXISTS email VARCHAR(100),
ADD COLUMN IF NOT EXISTS mobile_phone VARCHAR(20),
ADD COLUMN IF NOT EXISTS pep_status BOOLEAN DEFAULT FALSE,  -- Politically Exposed Person
ADD COLUMN IF NOT EXISTS account_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS account_ownership VARCHAR(30),     -- Individual/Joint/Other
ADD COLUMN IF NOT EXISTS product_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS account_status VARCHAR(20),        -- Active/Dormant/Closed
ADD COLUMN IF NOT EXISTS exclusion_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS branch_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'GHS',
ADD COLUMN IF NOT EXISTS exchange_rate DECIMAL(10,4) DEFAULT 1.0000,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Create indexes for frequently queried fields
CREATE INDEX IF NOT EXISTS idx_customer_id ON customers(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_type ON customers(customer_type);
CREATE INDEX IF NOT EXISTS idx_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_mobile ON customers(mobile_phone);
CREATE INDEX IF NOT EXISTS idx_branch ON customers(branch_name);
CREATE INDEX IF NOT EXISTS idx_pep ON customers(pep_status);
CREATE INDEX IF NOT EXISTS idx_account_status ON customers(account_status);
CREATE INDEX IF NOT EXISTS idx_dob ON customers(date_of_birth);

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_customers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS customers_updated_at_trigger ON customers;
CREATE TRIGGER customers_updated_at_trigger
    BEFORE UPDATE ON customers
    FOR EACH ROW
    EXECUTE FUNCTION update_customers_updated_at();

-- Comments for documentation
COMMENT ON COLUMN customers.customer_id IS 'Bank Specific CIN - Core banking customer identifier';
COMMENT ON COLUMN customers.pep_status IS 'Politically Exposed Person flag for compliance';
COMMENT ON COLUMN customers.account_ownership IS 'Individual, Joint, Corporate, or Other';
COMMENT ON COLUMN customers.exclusion_type IS 'Account exclusion category if applicable';

-- Validation notes
-- Fields from CSV that are now captured:
-- ✓ Bank Specific CIN → customer_id
-- ✓ Customer Type → customer_type
-- ✓ Title → title
-- ✓ First Name → first_name
-- ✓ Middle Name → middle_name
-- ✓ Surname → surname
-- ✓ Previous Name → previous_name
-- ✓ Company Name → company_name
-- ✓ Gender → gender
-- ✓ ID Type → id_type
-- ✓ ID Number → id_number
-- ✓ DOB → date_of_birth
-- ✓ Home Address → home_address
-- ✓ Postal Address → postal_address
-- ✓ Country → country
-- ✓ Email → email
-- ✓ Mobile Phone Number → mobile_phone
-- ✓ Politically Exposed Person → pep_status
-- ✓ Account Type → account_type
-- ✓ Account By Ownership → account_ownership
-- ✓ Product Name → product_name
-- ✓ Status Of Account → account_status
-- ✓ Exclusion Type → exclusion_type
-- ✓ Account Branch → branch_name
-- ✓ Currency Of Account → currency
-- ✓ Exchange Rate → exchange_rate

-- Coverage: 26/28 fields (93%)
-- Note: Account Balance is stored in account_balances table
-- Note: Account Number remains the primary key
