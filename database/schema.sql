-- AKCB Customer Authentication Database Schema
-- MySQL Database Setup for Customer Account Queries

-- Create database (if not exists)
CREATE DATABASE IF NOT EXISTS akcb_bank CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE akcb_bank;

-- =====================================================
-- Table: customers
-- Stores customer account information
-- =====================================================
CREATE TABLE IF NOT EXISTS customers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    account_number VARCHAR(16) UNIQUE NOT NULL,
    account_name VARCHAR(100) NOT NULL,
    phone_number VARCHAR(20),
    email VARCHAR(100),
    date_of_birth DATE,
    account_type VARCHAR(100) DEFAULT 'Savings',
    branch_code VARCHAR(100),
    status ENUM('Active', 'Dormant', 'Closed', 'Frozen') DEFAULT 'Active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_account_number (account_number),
    INDEX idx_phone (phone_number),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- Table: account_balances
-- Stores current account balances
-- =====================================================
CREATE TABLE IF NOT EXISTS account_balances (
    account_number VARCHAR(16) PRIMARY KEY,
    ledger_balance DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    available_balance DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(3) DEFAULT 'GHS',
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (account_number) REFERENCES customers(account_number) ON DELETE CASCADE,
    INDEX idx_last_updated (last_updated)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- Table: transactions
-- Stores account transaction history
-- =====================================================
CREATE TABLE IF NOT EXISTS transactions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    account_number VARCHAR(16) NOT NULL,
    transaction_date DATETIME NOT NULL,
    description VARCHAR(200),
    debit_amount DECIMAL(15,2) DEFAULT 0.00,
    credit_amount DECIMAL(15,2) DEFAULT 0.00,
    balance_after DECIMAL(15,2) NOT NULL,
    reference_number VARCHAR(50) UNIQUE,
    transaction_type ENUM('Deposit', 'Withdrawal', 'Transfer', 'Fee', 'Interest', 'Reversal', 'Other') DEFAULT 'Other',
    channel ENUM('ATM', 'Branch', 'Mobile', 'Online', 'POS', 'Agent', 'Internal') DEFAULT 'Internal',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (account_number) REFERENCES customers(account_number) ON DELETE CASCADE,
    INDEX idx_account_date (account_number, transaction_date DESC),
    INDEX idx_reference (reference_number),
    INDEX idx_date (transaction_date DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- Sample Data (for testing)
-- =====================================================

-- =====================================================
-- Table: loan_applications
-- Stores loan application submissions from chatbot
-- =====================================================
CREATE TABLE IF NOT EXISTS loan_applications (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
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
    salary_deduction_consent TINYINT(1) NOT NULL DEFAULT 0,
    employer_confirmation TINYINT(1) NOT NULL DEFAULT 0,
    borrower_declaration TINYINT(1) NOT NULL DEFAULT 0,
    status VARCHAR(30) NOT NULL DEFAULT 'submitted',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_loan_apps_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- Table: account_openings
-- Stores account opening applications from non-customers
-- =====================================================
CREATE TABLE IF NOT EXISTS account_openings (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    session_id VARCHAR(100),
    ip_address VARCHAR(64),
    user_agent VARCHAR(255),
    
    -- Personal Information
    full_name VARCHAR(150) NOT NULL,
    date_of_birth DATE NOT NULL,
    gender VARCHAR(20) NOT NULL,
    marital_status VARCHAR(30) NOT NULL,
    
    -- Contact Information
    phone_number VARCHAR(20) NOT NULL,
    email VARCHAR(100) NOT NULL,
    residential_address TEXT NOT NULL,
    digital_address VARCHAR(50) NOT NULL,
    postal_address VARCHAR(255) NOT NULL,
    
    -- Identification
    ghana_card_number VARCHAR(50) NOT NULL,
    
    -- Employment Information
    occupation VARCHAR(100) NOT NULL,
    employer_name VARCHAR(150) NOT NULL,
    monthly_income DECIMAL(15,2) NOT NULL,
    source_of_funds VARCHAR(150) NOT NULL,
    
    -- Account Details
    account_type VARCHAR(50) NOT NULL,
    mode_of_operation VARCHAR(50) NOT NULL,
    initial_deposit DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    
    -- Next of Kin
    next_of_kin_name VARCHAR(150) NOT NULL,
    next_of_kin_relationship VARCHAR(50) NOT NULL,
    next_of_kin_phone VARCHAR(20) NOT NULL,
    
    -- Consents and Declarations
    specimen_signature_acknowledged TINYINT(1) NOT NULL DEFAULT 0,
    customer_declaration TINYINT(1) NOT NULL DEFAULT 0,
    terms_accepted TINYINT(1) NOT NULL DEFAULT 0,
    data_processing_consent TINYINT(1) NOT NULL DEFAULT 0,
    
    status VARCHAR(30) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_account_openings_created (created_at),
    INDEX idx_account_openings_status (status),
    INDEX idx_account_openings_phone (phone_number),
    INDEX idx_account_openings_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert sample customers
INSERT INTO customers (account_number, account_name, phone_number, date_of_birth, account_type, branch_code, status) VALUES
('1234567890', 'John Doe', '0242123456', '1990-05-15', 'Savings', 'AMANTIN', 'Active'),
('2345678901', 'Jane Smith', '0243234567', '1985-08-22', 'Current', 'YEJI', 'Active'),
('3456789012', 'Kwame Mensah', '0244345678', '1992-03-10', 'Salary', 'ATEBUBU', 'Active'),
('4567890123', 'Ama Boateng', '0245456789', '1988-11-30', 'Susu', 'EJURA', 'Active'),
('5678901234', 'Kofi Asante', '0246567890', '1995-07-18', 'Savings', 'AMANTIN', 'Active');

-- Insert sample balances
INSERT INTO account_balances (account_number, ledger_balance, available_balance, currency) VALUES
('1234567890', 5420.50, 5320.50, 'GHS'),
('2345678901', 15750.00, 15750.00, 'GHS'),
('3456789012', 8200.75, 8100.75, 'GHS'),
('4567890123', 3500.00, 3500.00, 'GHS'),
('5678901234', 12450.25, 12250.25, 'GHS');

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
('2345678901', '2025-12-07 12:00:00', 'Cheque Deposit', 0.00, 8000.00, 13250.00, 'REF20251207001', 'Deposit', 'Branch'),

-- Kwame Mensah's transactions
('3456789012', '2025-12-10 16:00:00', 'ATM Withdrawal', 100.00, 0.00, 8100.75, 'REF20251210002', 'Withdrawal', 'ATM'),
('3456789012', '2025-12-01 09:00:00', 'Monthly Salary', 0.00, 4500.00, 8200.75, 'REF20251201002', 'Deposit', 'Internal'),
('3456789012', '2025-11-25 14:30:00', 'Bill Payment', 350.00, 0.00, 3700.75, 'REF20251125001', 'Transfer', 'Mobile'),

-- Ama Boateng's transactions
('4567890123', '2025-12-11 10:15:00', 'Susu Collection', 0.00, 200.00, 3500.00, 'REF20251211002', 'Deposit', 'Agent'),
('4567890123', '2025-12-08 10:00:00', 'Susu Collection', 0.00, 200.00, 3300.00, 'REF20251208002', 'Deposit', 'Agent'),
('4567890123', '2025-12-05 09:45:00', 'Susu Collection', 0.00, 200.00, 3100.00, 'REF20251205002', 'Deposit', 'Agent'),

-- Kofi Asante's transactions
('5678901234', '2025-12-10 11:30:00', 'Online Transfer Out', 200.00, 0.00, 12250.25, 'REF20251210003', 'Transfer', 'Online'),
('5678901234', '2025-12-06 13:45:00', 'Branch Deposit', 0.00, 2500.00, 12450.25, 'REF20251206001', 'Deposit', 'Branch'),
('5678901234', '2025-12-02 15:20:00', 'ATM Withdrawal', 300.00, 0.00, 9950.25, 'REF20251202001', 'Withdrawal', 'ATM');

-- =====================================================
-- Verification Queries
-- =====================================================

-- View all customers
-- SELECT * FROM customers;

-- View all balances
-- SELECT c.account_name, b.* FROM account_balances b
-- JOIN customers c ON b.account_number = c.account_number;

-- View recent transactions for an account
-- SELECT * FROM transactions 
-- WHERE account_number = '1234567890' 
-- ORDER BY transaction_date DESC 
-- LIMIT 10;

-- Test authentication query
-- SELECT account_number, account_name, phone_number 
-- FROM customers 
-- WHERE account_number = '1234567890' 
-- AND phone_number = '0242123456';
