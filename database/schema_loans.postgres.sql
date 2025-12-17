-- AKCB Loans Database Schema
-- PostgreSQL Schema for Loan Management

-- =====================================================
-- Table: loans
-- Stores customer loan information
-- =====================================================
CREATE TABLE IF NOT EXISTS loans (
    id SERIAL PRIMARY KEY,
    facility_account_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id VARCHAR(50),
    phone_number VARCHAR(50),
    customer_name VARCHAR(100),
    national_id VARCHAR(50),
    branch_code VARCHAR(20),
    
    -- Loan Details
    facility_type VARCHAR(10),
    purpose_of_facility VARCHAR(10),
    facility_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    current_balance DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(3) DEFAULT 'GHS',
    
    -- Dates
    disbursement_date DATE,
    maturity_date DATE,
    next_payment_date DATE,
    last_payment_date DATE,
    
    -- Payment Details
    facility_term INT, -- Loan term in months
    scheduled_installment DECIMAL(15,2) DEFAULT 0.00,
    last_payment_amount DECIMAL(15,2) DEFAULT 0.00,
    repayment_frequency VARCHAR(2), -- 12=Monthly, 4=Quarterly, etc.
    
    -- Status
    facility_status_code VARCHAR(1), -- A=Active, C=Closed, D=Dormant
    asset_classification VARCHAR(1), -- A=Performing, B=Substandard, etc.
    amount_in_arrears DECIMAL(15,2) DEFAULT 0.00,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_facility_number ON loans(facility_account_number);
CREATE INDEX IF NOT EXISTS idx_customer_id ON loans(customer_id);
CREATE INDEX IF NOT EXISTS idx_phone_number ON loans(phone_number);
CREATE INDEX IF NOT EXISTS idx_status ON loans(facility_status_code);
CREATE INDEX IF NOT EXISTS idx_maturity ON loans(maturity_date);
CREATE INDEX IF NOT EXISTS idx_next_payment ON loans(next_payment_date);

-- Trigger to update last_updated timestamp
CREATE OR REPLACE FUNCTION update_loans_last_updated()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_updated = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_loans_last_updated_trigger BEFORE UPDATE ON loans
    FOR EACH ROW EXECUTE FUNCTION update_loans_last_updated();

-- Add sample loan data (for testing)
INSERT INTO loans (
    facility_account_number, 
    customer_id, 
    phone_number, 
    customer_name,
    facility_amount, 
    current_balance, 
    disbursement_date,
    maturity_date,
    next_payment_date,
    facility_term,
    scheduled_installment,
    repayment_frequency,
    facility_status_code,
    asset_classification
) VALUES
(
    'LO2024001',
    1,
    '0242123456',
    'John Doe',
    10000.00,
    6500.00,
    '2024-01-15',
    '2025-01-15',
    '2025-01-20',
    12,
    833.33,
    '12',
    'A',
    'A'
) ON CONFLICT (facility_account_number) DO NOTHING;
