// Script to create account_openings table in the database
const { executeQuery } = require('./dist/database');

const createTableSQL = `
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
`;

async function createTable() {
  try {
    console.log('Creating account_openings table...');
    await executeQuery(createTableSQL, []);
    console.log('✓ Table created successfully!');
  } catch (error) {
    console.error('✗ Error creating table:', error.message);
    process.exit(1);
  }
  process.exit(0);
}

createTable();
