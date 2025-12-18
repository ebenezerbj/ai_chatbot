-- AKCB Customer Authentication Database Schema
-- PostgreSQL Database Setup for Customer Account Queries

-- =====================================================
-- Table: customers
-- Stores customer account information
-- =====================================================
CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    account_number VARCHAR(16) UNIQUE NOT NULL,
    account_name VARCHAR(100) NOT NULL,
    phone_number VARCHAR(20),
    email VARCHAR(100),
    date_of_birth DATE,
    account_type VARCHAR(100) DEFAULT 'Savings',
    branch_code VARCHAR(100),
    status VARCHAR(20) DEFAULT 'Active' CHECK (status IN ('Active', 'Dormant', 'Closed', 'Frozen')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_account_number ON customers(account_number);
CREATE INDEX IF NOT EXISTS idx_phone ON customers(phone_number);
CREATE INDEX IF NOT EXISTS idx_status ON customers(status);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Table: account_balances
-- Stores current account balances
-- =====================================================
CREATE TABLE IF NOT EXISTS account_balances (
    account_number VARCHAR(16) PRIMARY KEY,
    ledger_balance DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    available_balance DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(3) DEFAULT 'GHS',
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (account_number) REFERENCES customers(account_number) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_last_updated ON account_balances(last_updated);

-- Trigger to update last_updated timestamp
CREATE OR REPLACE FUNCTION update_last_updated_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_updated = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_account_balances_last_updated BEFORE UPDATE ON account_balances
    FOR EACH ROW EXECUTE FUNCTION update_last_updated_column();

-- =====================================================
-- Table: transactions
-- Stores account transaction history
-- =====================================================
CREATE TABLE IF NOT EXISTS transactions (
    id BIGSERIAL PRIMARY KEY,
    account_number VARCHAR(16) NOT NULL,
    transaction_date TIMESTAMP NOT NULL,
    description VARCHAR(200),
    debit_amount DECIMAL(15,2) DEFAULT 0.00,
    credit_amount DECIMAL(15,2) DEFAULT 0.00,
    balance_after DECIMAL(15,2) NOT NULL,
    reference_number VARCHAR(50) UNIQUE,
    transaction_type VARCHAR(20) DEFAULT 'Other' CHECK (transaction_type IN ('Deposit', 'Withdrawal', 'Transfer', 'Fee', 'Interest', 'Reversal', 'Other')),
    channel VARCHAR(20) DEFAULT 'Internal' CHECK (channel IN ('ATM', 'Branch', 'Mobile', 'Online', 'POS', 'Agent', 'Internal')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (account_number) REFERENCES customers(account_number) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_account_date ON transactions(account_number, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_reference ON transactions(reference_number);
CREATE INDEX IF NOT EXISTS idx_date ON transactions(transaction_date DESC);

-- =====================================================
-- Sample Data (for testing)
-- =====================================================

-- =====================================================
-- Table: loan_applications
-- Stores loan application submissions from chatbot
-- =====================================================
CREATE TABLE IF NOT EXISTS loan_applications (
    id BIGSERIAL PRIMARY KEY,
    session_id VARCHAR(100),
    ip_address VARCHAR(64),
    user_agent VARCHAR(255),
    full_name VARCHAR(150) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    national_id_number VARCHAR(50) NOT NULL,
    account_number VARCHAR(16) NOT NULL,
    employer_name VARCHAR(150) NOT NULL,
    position VARCHAR(100) NOT NULL,
    employment_type VARCHAR(50) NOT NULL,
    length_of_service VARCHAR(50) NOT NULL,
    net_monthly_salary DECIMAL(15,2) NOT NULL,
    loan_amount DECIMAL(15,2) NOT NULL,
    loan_purpose VARCHAR(300) NOT NULL,
    loan_tenor_months INT NOT NULL,
    monthly_instalment DECIMAL(15,2) NOT NULL,
    salary_deduction_consent BOOLEAN NOT NULL DEFAULT FALSE,
    employer_confirmation BOOLEAN NOT NULL DEFAULT FALSE,
    borrower_declaration BOOLEAN NOT NULL DEFAULT FALSE,
    status VARCHAR(30) NOT NULL DEFAULT 'submitted',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample customers
INSERT INTO customers (account_number, account_name, phone_number, date_of_birth, account_type, branch_code, status) VALUES
('1234567890', 'John Doe', '0242123456', '1990-05-15', 'Savings', 'AMANTIN', 'Active'),
('2345678901', 'Jane Smith', '0243234567', '1985-08-22', 'Current', 'YEJI', 'Active'),
('3456789012', 'Kwame Mensah', '0244345678', '1992-03-10', 'Salary', 'ATEBUBU', 'Active'),
('4567890123', 'Ama Boateng', '0245456789', '1988-11-30', 'Susu', 'EJURA', 'Active'),
('5678901234', 'Kofi Asante', '0246567890', '1995-07-18', 'Savings', 'AMANTIN', 'Active')
ON CONFLICT (account_number) DO NOTHING;

-- Insert sample balances
INSERT INTO account_balances (account_number, ledger_balance, available_balance, currency) VALUES
('1234567890', 5420.50, 5320.50, 'GHS'),
('2345678901', 15750.00, 15750.00, 'GHS'),
('3456789012', 8200.75, 8100.75, 'GHS'),
('4567890123', 3500.00, 3500.00, 'GHS'),
('5678901234', 12450.25, 12250.25, 'GHS')
ON CONFLICT (account_number) DO NOTHING;

-- Insert sample transactions
INSERT INTO transactions (account_number, transaction_date, description, debit_amount, credit_amount, balance_after, reference_number, transaction_type, channel) VALUES
-- John Doe's transactions
('1234567890', '2025-12-10 14:30:00', 'ATM Withdrawal - Amantin', 500.00, 0.00, 5320.50, 'REF20251210001', 'Withdrawal', 'ATM'),
('1234567890', '2025-12-08 09:15:00', 'Salary Credit', 0.00, 3000.00, 5820.50, 'REF20251208001', 'Deposit', 'Internal'),
('1234567890', '2025-12-05 16:45:00', 'Mobile Money Transfer', 200.00, 0.00, 2820.50, 'REF20251205001', 'Transfer', 'Mobile'),
('1234567890', '2025-12-01 10:00:00', 'Branch Deposit', 0.00, 1000.00, 3020.50, 'REF20251201001', 'Deposit', 'Branch'),
('1234567890', '2025-11-28 11:20:00', 'POS Purchase - Shop', 150.00, 0.00, 2020.50, 'REF20251128001', 'Withdrawal', 'POS'),

-- Jane Smith's transactions
('2345678901', '2025-12-11 08:30:00', 'Business Deposit', 0.00, 5000.00, 15750.00, 'REF20251211001', 'Deposit', 'Branch'),
('2345678901', '2025-12-09 15:20:00', 'Transfer to Supplier', 2500.00, 0.00, 10750.00, 'REF20251209001', 'Transfer', 'Online'),
('2345678901', '2025-12-07 12:00:00', 'Cheque Deposit', 0.00, 8000.00, 13250.00, 'REF20251207001', 'Deposit', 'Branch')
ON CONFLICT (reference_number) DO NOTHING;
