# Quick Guide: Viewing Account Openings in Admin Portal

## For Bank Administrators

### Step 1: Access the Admin Portal
Open your browser and go to:
- **Local**: `http://localhost:4000/admin-portal.html`
- **Production**: `https://your-app.onrender.com/admin-portal.html`

### Step 2: Login
Enter your admin credentials to access the portal.

### Step 3: Navigate to Account Openings
Look at the left sidebar and click on **"Account Openings"**
(You'll see it between "Loan Applications" and "Knowledge Base")

### Step 4: View Applications
You'll see a table showing all account opening applications with:
- **Created**: When the application was submitted
- **Full Name**: Applicant's name
- **Phone**: Contact number
- **Email**: Email address
- **Ghana Card**: National ID number
- **Account Type**: Savings, Current, etc.
- **Initial Deposit**: Amount in GHS
- **Status**: pending/approved/rejected

### Step 5: View Full Details
Click on any row to see complete application details including:

#### Personal Information
- Full Name
- Date of Birth
- Gender
- Marital Status

#### Contact Information
- Phone Number
- Email Address
- Residential Address
- Digital Address (Ghana Post GPS)
- Postal Address

#### Identification
- Ghana Card Number

#### Employment Information
- Occupation
- Employer Name
- Monthly Income
- Source of Funds

#### Account Details
- Account Type (Savings/Current/etc.)
- Mode of Operation (Individual/Joint)
- Initial Deposit Amount

#### Next of Kin
- Name
- Relationship
- Phone Number

#### Consents (All must be checked)
- ✓ Specimen Signature Acknowledged
- ✓ Customer Declaration
- ✓ Terms Accepted
- ✓ Data Processing Consent

### Step 6: Refresh Data
Click the **"Refresh"** button at the top to reload and see new applications.

---

## Sample Application Data

Here's what you'll see from the test application we created:

```
Created: 12/18/2025, 8:00:51 PM
Full Name: Kwame Asante
Phone: 0241234567
Email: kwame.asante@example.com
Ghana Card: GHA-123456789-0
Account Type: Savings
Initial Deposit: GHS 100.00
Status: pending

Complete Details:
{
  "id": 1,
  "sessionId": "test_session_123",
  "fullName": "Kwame Asante",
  "dateOfBirth": "1990-05-15",
  "gender": "Male",
  "maritalStatus": "Single",
  "phoneNumber": "0241234567",
  "email": "kwame.asante@example.com",
  "residentialAddress": "123 Main Street, Amantin",
  "digitalAddress": "AK-123-4567",
  "postalAddress": "P.O. Box 123, Amantin",
  "ghanaCardNumber": "GHA-123456789-0",
  "occupation": "Teacher",
  "employerName": "Ghana Education Service",
  "monthlyIncome": 3500,
  "sourceOfFunds": "Salary",
  "accountType": "Savings",
  "modeOfOperation": "Individual",
  "initialDeposit": 100,
  "nextOfKinName": "Ama Asante",
  "nextOfKinRelationship": "Sister",
  "nextOfKinPhone": "0243456789",
  "specimenSignatureAcknowledged": true,
  "customerDeclaration": true,
  "termsAccepted": true,
  "dataProcessingConsent": true,
  "status": "pending",
  "createdAt": "2025-12-18T20:00:51.000Z"
}
```

---

## What Admins Can Do

### Current Features ✓
- View all account opening applications
- See summary in table format
- Click to view full application details
- Refresh to get latest data
- Applications are sorted by newest first

### Coming Soon ⏳
- Update application status (approve/reject)
- Search and filter applications
- Export to CSV/Excel
- Add notes to applications
- Email notifications for new applications

---

## Tips for Administrators

1. **Regular Monitoring**: Check the portal regularly for new applications
2. **Verify Information**: Cross-check Ghana Card numbers and other details
3. **Contact Applicants**: Use phone/email to verify information if needed
4. **Track Status**: Keep track of which applications have been processed

---

## Need Help?

If you encounter any issues:
1. Try refreshing the page
2. Check your internet connection
3. Make sure you're logged in as an administrator
4. Contact technical support if the problem persists
