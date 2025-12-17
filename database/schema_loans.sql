-- AKCB Loans Database Schema
-- MySQL Schema for Loan Management

-- =====================================================
-- Table: loans
-- Stores customer loan information
-- =====================================================
CREATE TABLE IF NOT EXISTS loans (
    id INT AUTO_INCREMENT PRIMARY KEY,
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
    facility_term INT COMMENT 'Loan term in months',
    scheduled_installment DECIMAL(15,2) DEFAULT 0.00,
    last_payment_amount DECIMAL(15,2) DEFAULT 0.00,
    repayment_frequency VARCHAR(2) COMMENT '12=Monthly, 4=Quarterly, etc.',
    
    -- Status
    facility_status_code VARCHAR(1) COMMENT 'A=Active, C=Closed, D=Dormant',
    asset_classification VARCHAR(1) COMMENT 'A=Performing, B=Substandard, etc.',
    amount_in_arrears DECIMAL(15,2) DEFAULT 0.00,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Indexes
    INDEX idx_facility_number (facility_account_number),
    INDEX idx_customer_id (customer_id),
    INDEX idx_phone_number (phone_number),
    INDEX idx_status (facility_status_code),
    INDEX idx_maturity (maturity_date),
    INDEX idx_next_payment (next_payment_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
);
