# PostgreSQL Setup for Render

Your application now supports PostgreSQL! Here's how to set it up on Render:

## Step 1: Create PostgreSQL Database on Render

1. Go to https://dashboard.render.com
2. Click "New" → "PostgreSQL"
3. Configure:
   - **Name**: `akcb-chatbot-db`
   - **Database**: `akcb_bank`
   - **User**: (auto-generated)
   - **Region**: Choose closest to your users
   - **Plan**: Free (or paid for production)
4. Click "Create Database"
5. Wait for provisioning (~2-3 minutes)

## Step 2: Get Connection Details

After database is created, you'll see:
- **Internal Database URL** (use this for Render services)
- **External Database URL** (use this for local import)

Copy the **External Database URL** (starts with `postgres://...`)

## Step 3: Import Your Data

On your local machine, run:

```bash
# Install PostgreSQL client (if not installed)
# Windows: Download from https://www.postgresql.org/download/windows/
# Mac: brew install postgresql
# Linux: sudo apt-get install postgresql-client

# Import the schema
psql "YOUR_EXTERNAL_DATABASE_URL" < database/schema.postgres.sql

# Import the customer data (48,710 accounts)
psql "YOUR_EXTERNAL_DATABASE_URL" < data/postgres_import.sql
```

Replace `YOUR_EXTERNAL_DATABASE_URL` with the URL from Render dashboard.

**Example:**
```bash
psql "postgres://user:password@host.oregon-postgres.render.com/dbname" < database/schema.postgres.sql
psql "postgres://user:password@host.oregon-postgres.render.com/dbname" < data/postgres_import.sql
```

## Step 4: Configure Render Web Service

1. Go to your Render dashboard
2. Select your `ai-chatbot` web service
3. Go to "Environment" tab
4. Add these environment variables:

```
DATABASE_URL = [paste Internal Database URL from PostgreSQL service]
SMS_ONLINE_API_KEY = aefc1848ebc7baaa90e71bfb6072287cc2cc197882e73631a1bdc27135a51abb
SMS_ONLINE_SENDER = AkcbSupport
OPENAI_API_KEY = [your OpenAI API key]
```

**Important:** Use the **Internal Database URL** (not External) for the Render web service!

## Step 5: Deploy

The code is already pushed to GitHub. Render will auto-deploy with PostgreSQL support.

After deployment completes:
1. Check logs for "PostgreSQL connection test successful"
2. Test authentication at https://ai-chatbot-latest-7hhy.onrender.com

## How It Works

The application automatically detects which database to use:
- **Has `DATABASE_URL`**: Uses PostgreSQL (Render)
- **No `DATABASE_URL`**: Uses MySQL (Local development)

## Data Included

- ✅ 48,710 customer accounts
- ✅ 48,710 account balances
- ✅ 48,027 transaction records
- ✅ Phone number flexible matching
- ✅ OTP authentication system

## Verify Import

After importing, verify the data:

```bash
psql "YOUR_EXTERNAL_DATABASE_URL"

# Inside psql:
SELECT COUNT(*) FROM customers;       -- Should show 48710
SELECT COUNT(*) FROM account_balances; -- Should show 48710
SELECT COUNT(*) FROM transactions;     -- Should show 48027
```

## Troubleshooting

**Connection timeout:**
- Check firewall allows PostgreSQL port (5432)
- Use External URL for local connections
- Use Internal URL for Render services

**Import fails:**
- Ensure database is empty before importing
- Drop tables if needed: `DROP TABLE IF EXISTS transactions, account_balances, customers CASCADE;`

**Authentication not working:**
- Check `DATABASE_URL` is set correctly
- Check Render logs for connection errors
- Verify SMS_ONLINE_API_KEY is configured

## Local Testing

To test with PostgreSQL locally:
1. Install PostgreSQL on your machine
2. Create database: `createdb akcb_bank`
3. Import: `psql akcb_bank < database/schema.postgres.sql`
4. Import data: `psql akcb_bank < data/postgres_import.sql`
5. Set `DATABASE_URL=postgresql://localhost/akcb_bank`
6. Run: `npm start`
