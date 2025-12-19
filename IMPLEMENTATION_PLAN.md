# Enhanced Customer Demographics Implementation Plan

## Summary
Capture 26 additional customer fields from Latest_Acc.csv (93% coverage of available data)

## Current Status: Database Migration Required

### Step 1: Run Database Migration (Server-Side)

**Option A: Via psql command line (Recommended)**
```bash
# Connect to Render Postgres
psql postgresql://akcb_bank_user:IlcndVR943byznoByTRzN1zBQS3gB9lI@dpg-d4u410ali9vc73am148g-a.oregon-postgres.render.com/akcb_bank

# Run migration
\i migrations/001_enhance_customer_demographics.sql
```

**Option B: Via Render Dashboard**
1. Go to Render Dashboard → akcb_bank database
2. Open "Shell" tab
3. Paste contents of `migrations/001_enhance_customer_demographics.sql`
4. Execute

**Option C: Deploy and use API endpoint** (needs to be coded)

---

## Step 2: Update Customer Importer (Local - Ready to Code)

File: `src/customerImporter.ts`

### Fields to Extract from CSV:

```typescript
interface EnhancedCustomerImport {
  // Existing
  accountNumber: string;
  accountTitle: string;  // Composite name
  
  // NEW - Identification
  customerId: string;              // Bank Specific CIN
  customerType: string;            // Individual/Corporate
  title: string;                   // Mr/Mrs/Ms/Dr
  firstName: string;
  middleName: string;
  surname: string;
  previousName: string;
  companyName: string;
  gender: string;
  idType: string;
  idNumber: string;
  dateOfBirth: string;             // Parse DD/MM/YYYY
  
  // NEW - Contact
  homeAddress: string;
  postalAddress: string;
  country: string;
  email: string;
  mobilePhone: string;
  
  // NEW - Compliance
  pepStatus: boolean;              // Parse Yes/No
  
  // NEW - Account Details
  accountType: string;
  accountOwnership: string;        // Account By Ownership
  productName: string;
  accountStatus: string;           // Status Of Account
  exclusionType: string;
  branchName: string;             // Account Branch
  currency: string;
  exchangeRate: number;
  
  // Existing (preserved)
  balance?: number;                // Account Balance
}
```

### CSV Column Mapping:

```typescript
const mapping = {
  customerId: 'Bank Specific CIN',
  customerType: 'Customer Type',
  title: 'Title',
  firstName: 'First Name',
  middleName: 'Middle Name',
  surname: 'Surname',
  previousName: 'Previous Name',
  companyName: 'Company Name',
  gender: 'Gender',
  idType: 'ID Type',
  idNumber: 'ID Number',
  dateOfBirth: 'DOB',
  homeAddress: 'Home Address',
  postalAddress: 'Postal Address',
  country: 'Country',
  email: 'Email',
  mobilePhone: 'Mobile Phone Number',
  pepStatus: 'Politically Exposed Person (Yes/No)',
  accountType: 'Account Type',
  accountOwnership: 'Account By Ownership',
  productName: 'Product Name',
  accountStatus: 'Status Of Account',
  exclusionType: 'Exclusion Type',
  branchName: 'Account Branch',
  currency: 'Currency Of Account',
  exchangeRate: 'Exchange Rate',
  balance: 'Account Balance'
};
```

### Helper Functions Needed:

```typescript
// Parse DD/MM/YYYY to YYYY-MM-DD
function parseDate(ddmmyyyy: string): string | null {
  if (!ddmmyyyy) return null;
  const parts = ddmmyyyy.split('/');
  if (parts.length !== 3) return null;
  return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
}

// Parse Yes/No to boolean
function parseBoolean(yesNo: string): boolean {
  return yesNo?.trim().toLowerCase() === 'yes';
}

// Parse decimal
function parseDecimal(value: any): number | null {
  if (!value) return null;
  const num = parseFloat(String(value).replace(/,/g, ''));
  return isNaN(num) ? null : num;
}
```

---

## Step 3: Update INSERT Query

**Old Query:**
```sql
INSERT INTO customers (account_number, account_name, category, branch_code, co_code)
VALUES ($1, $2, $3, $4, $5)
ON CONFLICT (account_number) DO UPDATE SET ...
```

**New Query:**
```sql
INSERT INTO customers (
  account_number, account_name,
  customer_id, customer_type, title, first_name, middle_name, surname, 
  previous_name, company_name, gender, id_type, id_number, date_of_birth,
  home_address, postal_address, country, email, mobile_phone,
  pep_status, account_type, account_ownership, product_name, account_status,
  exclusion_type, branch_name, currency, exchange_rate
)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28)
ON CONFLICT (account_number) DO UPDATE SET
  account_name = EXCLUDED.account_name,
  customer_id = EXCLUDED.customer_id,
  customer_type = EXCLUDED.customer_type,
  title = EXCLUDED.title,
  first_name = EXCLUDED.first_name,
  middle_name = EXCLUDED.middle_name,
  surname = EXCLUDED.surname,
  previous_name = EXCLUDED.previous_name,
  company_name = EXCLUDED.company_name,
  gender = EXCLUDED.gender,
  id_type = EXCLUDED.id_type,
  id_number = EXCLUDED.id_number,
  date_of_birth = EXCLUDED.date_of_birth,
  home_address = EXCLUDED.home_address,
  postal_address = EXCLUDED.postal_address,
  country = EXCLUDED.country,
  email = EXCLUDED.email,
  mobile_phone = EXCLUDED.mobile_phone,
  pep_status = EXCLUDED.pep_status,
  account_type = EXCLUDED.account_type,
  account_ownership = EXCLUDED.account_ownership,
  product_name = EXCLUDED.product_name,
  account_status = EXCLUDED.account_status,
  exclusion_type = EXCLUDED.exclusion_type,
  branch_name = EXCLUDED.branch_name,
  currency = EXCLUDED.currency,
  exchange_rate = EXCLUDED.exchange_rate,
  updated_at = CURRENT_TIMESTAMP
```

---

## Step 4: Update Customer Auth API

File: `src/customerAuth.ts`

Add new fields to customer response:

```typescript
// Existing balance query
const customer = {
  accountNumber: result.account_number,
  name: result.account_name,
  balance: balanceResult?.ledger_balance || 0,
  
  // NEW - Add demographics
  customerType: result.customer_type,
  email: result.email,
  mobilePhone: result.mobile_phone,
  branch: result.branch_name,
  accountStatus: result.account_status,
  productName: result.product_name,
  pepStatus: result.pep_status
};
```

---

## Step 5: Update Admin Stats Endpoint

File: `src/index.ts` - `/api/admin/stats`

Add new analytics:

```typescript
// Gender distribution
const genderStats = await executeQuery(`
  SELECT gender, COUNT(*) as count
  FROM customers
  WHERE gender IS NOT NULL AND gender != ''
  GROUP BY gender
`);

// Customer type distribution
const customerTypeStats = await executeQuery(`
  SELECT customer_type, COUNT(*) as count
  FROM customers
  WHERE customer_type IS NOT NULL
  GROUP BY customer_type
`);

// PEP flagged customers
const pepCount = await querySingle(`
  SELECT COUNT(*) as count
  FROM customers
  WHERE pep_status = true
`);

// Branch distribution
const branchStats = await executeQuery(`
  SELECT branch_name, COUNT(*) as count
  FROM customers
  WHERE branch_name IS NOT NULL AND branch_name != ''
  GROUP BY branch_name
  ORDER BY count DESC
  LIMIT 10
`);

// Age demographics (derived from DOB)
const ageStats = await executeQuery(`
  SELECT 
    CASE 
      WHEN EXTRACT(YEAR FROM AGE(date_of_birth)) < 18 THEN 'Under 18'
      WHEN EXTRACT(YEAR FROM AGE(date_of_birth)) BETWEEN 18 AND 25 THEN '18-25'
      WHEN EXTRACT(YEAR FROM AGE(date_of_birth)) BETWEEN 26 AND 35 THEN '26-35'
      WHEN EXTRACT(YEAR FROM AGE(date_of_birth)) BETWEEN 36 AND 50 THEN '36-50'
      WHEN EXTRACT(YEAR FROM AGE(date_of_birth)) BETWEEN 51 AND 65 THEN '51-65'
      ELSE '65+'
    END as age_group,
    COUNT(*) as count
  FROM customers
  WHERE date_of_birth IS NOT NULL
  GROUP BY age_group
  ORDER BY age_group
`);

// Contact completeness
const contactCompleteness = await querySingle(`
  SELECT 
    COUNT(*) as total,
    COUNT(email) as has_email,
    COUNT(mobile_phone) as has_mobile,
    COUNT(home_address) as has_address,
    COUNT(CASE WHEN email IS NOT NULL AND mobile_phone IS NOT NULL THEN 1 END) as has_both
  FROM customers
`);
```

---

## Step 6: Testing Checklist

- [ ] Run database migration successfully
- [ ] Update customerImporter.ts with new fields
- [ ] Build TypeScript: `npm run build`
- [ ] Re-upload Latest_Acc.csv
- [ ] Verify new fields are populated:
  ```sql
  SELECT account_number, first_name, surname, email, mobile_phone, gender, branch_name
  FROM customers
  LIMIT 5;
  ```
- [ ] Test customer auth with new fields
- [ ] Check admin stats for demographics
- [ ] Commit and push changes
- [ ] Deploy to Render
- [ ] Verify production data

---

## Benefits After Implementation

### Immediate Wins:
- ✅ Full KYC compliance (ID Type, ID Number, DOB, PEP status)
- ✅ Better customer communication (Email + Mobile)
- ✅ Geographic analysis (Branch distribution)
- ✅ Demographic segmentation (Age, Gender, Customer Type)
- ✅ Enhanced chatbot personalization

### Analytics Enabled:
- Customer segmentation by demographics
- Branch performance analysis
- Age-based product targeting
- Corporate vs Individual insights
- PEP flagged account monitoring
- Email marketing lists
- SMS campaign targeting

---

## Files Created:
1. `/migrations/001_enhance_customer_demographics.sql` - Database schema
2. `/run_migration.js` - Local migration runner (blocked by network)
3. `/CUSTOMER_DEMOGRAPHICS_ANALYSIS.md` - Gap analysis
4. `/analyze_available_columns.js` - CSV structure analyzer
5. **THIS FILE** - Implementation plan

---

## Next Action:
**Run the migration SQL on Render, then I'll update the importer code.**
