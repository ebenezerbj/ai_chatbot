# Fix Account Opening Error on Render (Live Production)

## Problem
Customer tried to open an account on your live Render deployment and got a database error. This is because the `account_openings` table doesn't exist in your production PostgreSQL database yet.

## Solution - Quick Fix (5 minutes)

### Option 1: Using the Setup Script (Recommended)

1. **Get your Render PostgreSQL External Connection URL**
   - Go to https://dashboard.render.com
   - Select your PostgreSQL database
   - Click "Connect" → Copy the **External Connection** URL
   - It looks like: `postgresql://user:password@dpg-xxxxx.oregon-postgres.render.com/dbname`

2. **Run the setup script**

   **Windows PowerShell:**
   ```powershell
   $env:RENDER_DATABASE_URL="postgresql://user:pass@host/db"
   node setup_render_account_openings.js
   ```

   **Mac/Linux:**
   ```bash
   RENDER_DATABASE_URL="postgresql://user:pass@host/db" node setup_render_account_openings.js
   ```

3. **Verify success**
   You should see:
   ```
   🎉 SUCCESS! Account Openings table is ready on Render!
   ✅ Table created: account_openings
   ✅ Indexes created: 4
   ✅ Structure verified: 30 columns
   ✅ INSERT operation tested: Working
   ```

4. **Test on your live site**
   - Go to your live chatbot: `https://your-app.onrender.com`
   - Type: "I want to open an account"
   - Fill and submit the form
   - Should now work! ✅

---

### Option 2: Using psql Command (Alternative)

If you have PostgreSQL client installed:

```bash
# Copy the account_openings section from schema
psql "your-render-database-url" << 'EOF'
CREATE TABLE IF NOT EXISTS account_openings (
    id BIGSERIAL PRIMARY KEY,
    session_id VARCHAR(100),
    ip_address VARCHAR(64),
    user_agent VARCHAR(255),
    full_name VARCHAR(150) NOT NULL,
    date_of_birth DATE NOT NULL,
    gender VARCHAR(20) NOT NULL,
    marital_status VARCHAR(30) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    email VARCHAR(100) NOT NULL,
    residential_address TEXT NOT NULL,
    digital_address VARCHAR(50) NOT NULL,
    postal_address VARCHAR(255) NOT NULL,
    ghana_card_number VARCHAR(50) NOT NULL,
    occupation VARCHAR(100) NOT NULL,
    employer_name VARCHAR(150) NOT NULL,
    monthly_income DECIMAL(15,2) NOT NULL,
    source_of_funds VARCHAR(150) NOT NULL,
    account_type VARCHAR(50) NOT NULL,
    mode_of_operation VARCHAR(50) NOT NULL,
    initial_deposit DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    next_of_kin_name VARCHAR(150) NOT NULL,
    next_of_kin_relationship VARCHAR(50) NOT NULL,
    next_of_kin_phone VARCHAR(20) NOT NULL,
    specimen_signature_acknowledged BOOLEAN NOT NULL DEFAULT FALSE,
    customer_declaration BOOLEAN NOT NULL DEFAULT FALSE,
    terms_accepted BOOLEAN NOT NULL DEFAULT FALSE,
    data_processing_consent BOOLEAN NOT NULL DEFAULT FALSE,
    status VARCHAR(30) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_account_openings_created ON account_openings(created_at);
CREATE INDEX IF NOT EXISTS idx_account_openings_status ON account_openings(status);
CREATE INDEX IF NOT EXISTS idx_account_openings_phone ON account_openings(phone_number);
CREATE INDEX IF NOT EXISTS idx_account_openings_email ON account_openings(email);
EOF
```

---

### Option 3: Using Render SQL Editor (No Installation Required)

1. Go to https://dashboard.render.com
2. Select your PostgreSQL database
3. Click "Access" → "Connect via Shell"
4. Paste the following SQL and press Enter:

```sql
CREATE TABLE IF NOT EXISTS account_openings (
    id BIGSERIAL PRIMARY KEY,
    session_id VARCHAR(100),
    ip_address VARCHAR(64),
    user_agent VARCHAR(255),
    full_name VARCHAR(150) NOT NULL,
    date_of_birth DATE NOT NULL,
    gender VARCHAR(20) NOT NULL,
    marital_status VARCHAR(30) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    email VARCHAR(100) NOT NULL,
    residential_address TEXT NOT NULL,
    digital_address VARCHAR(50) NOT NULL,
    postal_address VARCHAR(255) NOT NULL,
    ghana_card_number VARCHAR(50) NOT NULL,
    occupation VARCHAR(100) NOT NULL,
    employer_name VARCHAR(150) NOT NULL,
    monthly_income DECIMAL(15,2) NOT NULL,
    source_of_funds VARCHAR(150) NOT NULL,
    account_type VARCHAR(50) NOT NULL,
    mode_of_operation VARCHAR(50) NOT NULL,
    initial_deposit DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    next_of_kin_name VARCHAR(150) NOT NULL,
    next_of_kin_relationship VARCHAR(50) NOT NULL,
    next_of_kin_phone VARCHAR(20) NOT NULL,
    specimen_signature_acknowledged BOOLEAN NOT NULL DEFAULT FALSE,
    customer_declaration BOOLEAN NOT NULL DEFAULT FALSE,
    terms_accepted BOOLEAN NOT NULL DEFAULT FALSE,
    data_processing_consent BOOLEAN NOT NULL DEFAULT FALSE,
    status VARCHAR(30) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_account_openings_created ON account_openings(created_at);
CREATE INDEX IF NOT EXISTS idx_account_openings_status ON account_openings(status);
CREATE INDEX IF NOT EXISTS idx_account_openings_phone ON account_openings(phone_number);
CREATE INDEX IF NOT EXISTS idx_account_openings_email ON account_openings(email);
```

---

## What This Does

Creates the `account_openings` table with:
- ✅ 30 columns for all account opening information
- ✅ Personal details (name, DOB, gender, marital status)
- ✅ Contact info (phone, email, addresses)
- ✅ Identification (Ghana Card)
- ✅ Employment details (occupation, employer, income)
- ✅ Account preferences (type, mode, initial deposit)
- ✅ Next of kin information
- ✅ Consent checkboxes (4 required consents)
- ✅ 4 indexes for fast queries
- ✅ Auto-incrementing ID
- ✅ Timestamp tracking

---

## Verify It Worked

### Check in Admin Portal
1. Go to: `https://your-app.onrender.com/admin-portal.html`
2. Login with your admin credentials
3. Click "Account Openings" in sidebar
4. Should load without errors (may show 0 records initially)

### Test with Live Form
1. Go to your chatbot: `https://your-app.onrender.com`
2. Type: "I want to open an account"
3. Fill out the form completely
4. Click Submit
5. Should see: "✓ Thank you! Your account opening application has been submitted successfully."

---

## View Submissions

After customers submit forms, you can view them:

1. **Admin Portal:**
   - Go to: `https://your-app.onrender.com/admin-portal.html`
   - Click "Account Openings"
   - View all applications in a table

2. **Database Query:**
   ```sql
   SELECT id, full_name, email, phone_number, account_type, status, created_at 
   FROM account_openings 
   ORDER BY created_at DESC;
   ```

---

## Troubleshooting

### Error: "relation 'account_openings' does not exist"
**Solution:** Run the setup script above

### Error: "connection refused"
**Solution:** Check your DATABASE_URL is correct in Render environment variables

### Error: "permission denied"
**Solution:** Ensure you're using the correct database user with CREATE TABLE permissions

### Setup script shows errors
**Solution:** 
1. Verify your RENDER_DATABASE_URL is correct
2. Check you're connected to the internet
3. Ensure Render database is running (check dashboard)

---

## Need Help?

If you still encounter issues:
1. Check Render logs: Dashboard → Your Web Service → Logs
2. Look for errors starting with `[AccountOpening]`
3. Verify DATABASE_URL is set in Render environment variables
4. Ensure your database is in the same region as your web service

---

## Future Updates

The `account_openings` table is now included in:
- `database/schema.postgres.sql` (for future deployments)
- `database/schema.sql` (for MySQL/local development)

Next time you deploy a new instance, the table will be created automatically if you run the full schema setup.
