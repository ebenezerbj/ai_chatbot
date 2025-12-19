# Customer Demographics Gap Analysis

## Current Implementation vs. Comprehensive Framework

### ✅ Currently Captured (Basic Fields)

| Field | Current Column | Status |
|-------|---------------|--------|
| Account Number | `account_number` | ✓ |
| Full Name | `account_name` | ✓ |
| Phone Number | `phone_number` | ✓ |
| Date of Birth | `date_of_birth` | ✓ |
| Account Type | `account_type` | ✓ (Limited: Savings, Current, Salary, Susu) |
| Account Status | `status` | ✓ (Active, Dormant, Closed, Frozen) |

### ❌ Missing Critical Fields

#### 1. Personal Identification (0% Coverage)
- [ ] First Name, Middle Name, Last Name (separate fields)
- [ ] Age (derived from DOB)
- [ ] Gender
- [ ] Nationality
- [ ] Country of Residence
- [ ] Marital Status
- [ ] Number of Dependents
- [ ] National ID Type
- [ ] National ID Number
- [ ] ID Expiry Date

#### 2. Contact Information (33% Coverage)
- [x] Primary Mobile Number ✓
- [ ] Secondary Phone Number
- [ ] Email Address
- [ ] Residential Address (full breakdown needed):
  - [ ] House Number
  - [ ] Street / Area
  - [ ] City / Town
  - [ ] District
  - [ ] Region
  - [ ] GPS Address
- [ ] Postal Address
- [ ] Preferred Contact Method

#### 3. Geographic Data (0% Coverage)
- [ ] Country
- [ ] Region
- [ ] District / Municipality
- [ ] Urban/Rural Classification
- [ ] GPS / Digital Address
- [ ] Length of Stay at Address

#### 4. Socio-Economic (0% Coverage)
- [ ] Employment Status
- [ ] Occupation / Job Title
- [ ] Industry / Sector
- [ ] Employer Name
- [ ] Employment Type
- [ ] Length of Employment
- [ ] Monthly Income Range
- [ ] Income Source(s)
- [ ] Household Income
- [ ] Social Class Segment

#### 5. Education Profile (0% Coverage)
- [ ] Highest Level of Education
- [ ] Field of Study
- [ ] Literacy Level
- [ ] Professional Certifications

#### 6. Financial & Banking (20% Coverage)
- [x] Account Type(s) ✓
- [x] Account Balance (via account_balances) ✓
- [ ] Banked/Unbanked Status
- [ ] Existing Bank Relationships
- [ ] Average Monthly Inflows
- [ ] Average Monthly Outflows
- [ ] Savings Behavior
- [ ] Credit History
- [ ] Loan Exposure
- [ ] Insurance Coverage

#### 7. Behavioral Demographics (0% Coverage)
- [ ] Preferred Service Channel
- [ ] Transaction Frequency
- [ ] Product Usage Patterns
- [ ] Digital Literacy Level
- [ ] Technology Access
- [ ] Peak Activity Times
- [ ] Brand Loyalty

#### 8. Psychographic (0% Coverage)
- [ ] Financial Goals
- [ ] Risk Tolerance
- [ ] Lifestyle Category
- [ ] Spending Behavior
- [ ] Decision-Making Style
- [ ] Trust Level

#### 9. Cultural & Social (0% Coverage)
- [ ] Language Preference
- [ ] Religious Affiliation
- [ ] Cultural Group / Ethnicity
- [ ] Community Memberships

#### 10. KYC / AML Compliance (0% Coverage)
- [ ] KYC Status
- [ ] Risk Rating
- [ ] PEP Status
- [ ] Source of Funds
- [ ] Source of Wealth
- [ ] Sanctions Screening Result
- [ ] Last KYC Review Date

#### 11. Lifecycle Information (17% Coverage)
- [x] Customer Status (Active/Dormant) ✓
- [ ] Customer Type (Prospect/Active/Dormant)
- [ ] Date of Onboarding
- [ ] Product Holding Duration
- [ ] Customer Value Tier
- [ ] Churn Risk Indicator
- [ ] Relationship Manager

#### 12. Consent & Preferences (0% Coverage)
- [ ] Marketing Consent
- [ ] Data Processing Consent
- [ ] Communication Opt-In Channels
- [ ] Privacy Acknowledgement Date

#### 13. Derived Analytics (0% Coverage)
- [ ] Customer Segment
- [ ] Customer Lifetime Value (CLV)
- [ ] Profitability Score
- [ ] Risk Score
- [ ] Cross-Sell/Upsell Potential
- [ ] Personalization Tags

#### 14. Audit Metadata (0% Coverage)
- [ ] Record Creation Date
- [ ] Last Updated Date
- [ ] Created By
- [ ] Updated By
- [ ] Source of Data

---

## Overall Coverage Score

**Current Coverage: ~8% of comprehensive framework**

- **Captured:** 6 fields
- **Missing:** 70+ fields

---

## Recommendations

### Phase 1: Essential KYC & Compliance (Priority: Critical)
```sql
ALTER TABLE customers ADD COLUMN (
    first_name VARCHAR(50),
    middle_name VARCHAR(50),
    last_name VARCHAR(50),
    gender ENUM('Male', 'Female', 'Other', 'Prefer not to say'),
    nationality VARCHAR(50) DEFAULT 'Ghanaian',
    marital_status ENUM('Single', 'Married', 'Divorced', 'Widowed'),
    id_type VARCHAR(20),
    id_number VARCHAR(50),
    id_expiry_date DATE,
    email VARCHAR(100),
    residential_address TEXT,
    city VARCHAR(50),
    region VARCHAR(50),
    gps_address VARCHAR(20),
    kyc_status ENUM('Pending', 'Verified', 'Expired') DEFAULT 'Pending',
    kyc_verified_date DATE,
    pep_status BOOLEAN DEFAULT FALSE,
    risk_rating ENUM('Low', 'Medium', 'High') DEFAULT 'Low'
);
```

### Phase 2: Socio-Economic & Financial Behavior
```sql
ALTER TABLE customers ADD COLUMN (
    occupation VARCHAR(100),
    employer_name VARCHAR(100),
    employment_status ENUM('Employed', 'Self-Employed', 'Unemployed', 'Student', 'Retired'),
    monthly_income_range ENUM('0-500', '500-1000', '1000-2500', '2500-5000', '5000+'),
    education_level ENUM('None', 'Basic', 'Secondary', 'Tertiary', 'Postgraduate'),
    preferred_channel ENUM('Branch', 'Mobile App', 'USSD', 'ATM', 'Agent'),
    digital_literacy ENUM('Low', 'Medium', 'High')
);
```

### Phase 3: Analytics & Segmentation
```sql
CREATE TABLE customer_analytics (
    account_number VARCHAR(16) PRIMARY KEY,
    customer_segment VARCHAR(50),
    lifetime_value DECIMAL(15,2),
    profitability_score INT,
    churn_risk_score INT,
    last_transaction_date DATE,
    avg_monthly_inflow DECIMAL(15,2),
    avg_monthly_outflow DECIMAL(15,2),
    transaction_frequency VARCHAR(20),
    relationship_start_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (account_number) REFERENCES customers(account_number)
);
```

### Phase 4: Consent & Preferences
```sql
CREATE TABLE customer_preferences (
    account_number VARCHAR(16) PRIMARY KEY,
    marketing_consent BOOLEAN DEFAULT FALSE,
    sms_consent BOOLEAN DEFAULT FALSE,
    email_consent BOOLEAN DEFAULT FALSE,
    whatsapp_consent BOOLEAN DEFAULT FALSE,
    language_preference VARCHAR(20) DEFAULT 'English',
    preferred_contact_time VARCHAR(50),
    consent_date DATE,
    privacy_acknowledgement BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (account_number) REFERENCES customers(account_number)
);
```

---

## Implementation Strategy

1. **Database Schema Update:** Add priority fields in phases
2. **CSV Import Enhancement:** Update customerImporter.ts to handle new fields
3. **Admin Portal Update:** Add forms for capturing missing data
4. **Data Migration:** Map existing Latest_Acc.csv columns to new schema
5. **API Endpoints:** Expose new fields via REST API
6. **Chatbot Integration:** Use demographics for personalization
7. **Analytics Dashboard:** Visualize customer segments

---

## Data Sources to Leverage

From **Latest_Acc.csv**, we can already extract:
- Bank Specific CIN
- Customer Type
- Title
- First Name
- Middle Name
- Surname
- Company Name
- Gender ✓
- ID Type ✓
- ID Number ✓
- DOB ✓
- Home Address ✓
- Postal Address ✓
- Country ✓
- Email ✓
- Mobile Phone Number ✓
- Account Type ✓
- Account Branch ✓
- Currency ✓
- Account Balance ✓

**We already have ~20 fields in the CSV that we're not capturing!**

---

## Immediate Action Items

1. ✅ Verify Latest_Acc.csv column mapping
2. ⏳ Update database schema to capture available fields
3. ⏳ Enhance customerImporter.ts to parse all CSV columns
4. ⏳ Update admin portal to display/edit new fields
5. ⏳ Add validation rules for sensitive fields (PEP, KYC, etc.)

---

**Generated:** December 19, 2025
**Current Coverage:** 8%
**Target Coverage:** 80% (Phase 1-2 completion)
