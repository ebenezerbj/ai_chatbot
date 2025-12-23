# Customer Service Representative Dashboard

## Overview
The Customer Service Representative Dashboard is a dedicated interface for bank staff to manage loan applications, salary overdraft requests, and account opening applications submitted through the AKCB chatbot.

## Access Information

**URL (Local):** http://localhost:4000/customer-rep-dashboard.html  
**URL (Production):** https://your-app.onrender.com/customer-rep-dashboard.html

### Authentication System
The dashboard now uses **secure backend authentication**. Customer service representative accounts must be created by an administrator.

### Getting Your Credentials
1. Contact your system administrator
2. Admin will create your account via the Admin Portal → User Management
3. You will receive your unique username and password
4. Use these credentials to login to the dashboard

### First-Time Setup for Admins
If you're setting up the system for the first time:

1. **Login as Admin:**
   - URL: http://localhost:4000/admin-portal.html
   - Username: `admin`
   - Password: `admin123` (or value from ADMIN_PASSWORD env variable)

2. **Create Customer Service Rep Account:**
   - Navigate to "User Management" in the admin sidebar
   - Click "Add New User"
   - Fill in the form:
     - Username: Choose a unique username
     - Full Name: Rep's full name
     - Email: Rep's email address
     - Role: Select "Customer Service Rep"
     - Password: Set a secure password
   - Click "Create User"

3. **Distribute Credentials:**
   - Provide the username and password to the customer service rep
   - Rep can now login to the dashboard

⚠️ **Security Note:** Passwords are securely hashed in the database. Change the default admin password in production.

## Features

### 1. Real-Time Statistics Dashboard
- **Pending Applications:** Shows number of applications awaiting review
- **Approved Today:** Count of applications approved today
- **Rejected Today:** Count of applications declined today
- **Total Applications:** Overall count of all applications

### 2. Three Application Types

#### Loan Applications
- View all loan requests with details
- Filter by status (pending, approved, rejected)
- Search by name, phone, or account number
- Key information displayed:
  - Applicant name and contact
  - Loan type and amount
  - Purpose and employment status
  - Monthly income
  - Application date

#### Salary Overdrafts
- Manage salary-backed overdraft requests
- View calculated approved amounts
- Monthly repayment schedules
- Key information:
  - Employer details
  - Net monthly salary
  - Requested vs approved amount
  - Repayment period and monthly payment

#### Account Openings
- Process new account applications
- View complete customer information
- Verify documents and details
- Key information:
  - Personal details (name, DOB, gender)
  - Contact information
  - Ghana Card number
  - Account type and initial deposit
  - Employment and income details

### 3. Application Management

#### View Details
- Click any application row to view complete details
- All fields displayed in organized format
- Status badges for easy identification

#### Approve Applications
1. Click "View" on an application
2. Review all details carefully
3. Add internal notes (optional)
4. Click "Approve Application"
5. Confirm the action

#### Reject Applications
1. Click "View" on an application
2. Review application details
3. Click "Reject Application"
4. Provide rejection reason (required)
5. Confirm the action

### 4. Search and Filter

#### Status Filter
- **All Status:** View all applications
- **Pending:** Only awaiting review
- **Approved:** Only approved applications
- **Rejected:** Only declined applications
- **Processing:** Applications in process

#### Search Function
Search across:
- Applicant names
- Phone numbers
- Account numbers
- Email addresses

### 5. Internal Notes
Add notes to applications for:
- Documentation of review process
- Communication between staff
- Reason for decisions
- Follow-up actions needed

## Workflow Guide

### Processing a Loan Application
1. Go to "Loan Applications" tab
2. Filter for "Pending" status
3. Click on an application to review
4. Check:
   - Employment status
   - Monthly income vs requested amount
   - Loan purpose
   - Credit history (if available)
5. Add notes about decision rationale
6. Approve or Reject with reason

### Processing a Salary Overdraft
1. Go to "Salary Overdrafts" tab
2. Review pending applications
3. Verify:
   - Employer information
   - Salary details
   - Calculated approved amount (max 3x salary)
   - Repayment capacity
4. Check repayment period feasibility
5. Make decision and add notes

### Processing an Account Opening
1. Go to "Account Openings" tab
2. Review application details
3. Verify:
   - Complete personal information
   - Valid Ghana Card number
   - Appropriate account type
   - Initial deposit amount meets minimum
   - Contact information accuracy
4. Check for duplicate accounts
5. Approve for account creation or reject with reason

## Best Practices

### 1. Regular Monitoring
- Check dashboard at start of shift
- Review pending applications hourly
- Process applications within 24 hours

### 2. Thorough Review
- Always review all fields before decision
- Verify contact information accuracy
- Check employment and income details
- Look for red flags or inconsistencies

### 3. Documentation
- Always add notes explaining decisions
- Document follow-up actions needed
- Record any customer communications
- Note missing or unclear information

### 4. Communication
- Use professional language in notes
- Be specific about rejection reasons
- Document attempted verifications
- Record any special circumstances

### 5. Security
- Never share login credentials
- Always log out when leaving workstation
- Report suspicious applications
- Protect customer information

## Status Workflow

### Application Lifecycle
```
Submitted → Pending → [Processing] → Approved/Rejected
```

### Status Meanings
- **Pending:** New application awaiting review
- **Processing:** Under active review
- **Approved:** Application accepted
- **Rejected:** Application declined

## Technical Details

### API Endpoints Used
- `GET /api/admin/loan-applications` - List loan applications
- `GET /api/admin/salary-overdrafts` - List overdraft applications
- `GET /api/admin/account-openings` - List account openings
- `PUT /api/admin/loan-applications/:id/status` - Update loan status
- `PUT /api/admin/salary-overdrafts/:id/status` - Update overdraft status
- `PUT /api/admin/account-openings/:id/status` - Update account status

### Authentication
The dashboard uses Bearer token authentication with the following features:
- Secure backend authentication via `/api/rep/login`
- Session tokens stored in localStorage
- Automatic token validation on page load
- Automatic logout on token expiration
- Password hashing (SHA-256) for security

### User Roles
- **Admin:** Full access to admin portal and user management
- **Customer Service Rep:** Access to customer rep dashboard only

### Browser Compatibility
- Chrome/Edge: Fully supported
- Firefox: Fully supported
- Safari: Fully supported
- Internet Explorer: Not supported

## Troubleshooting

### Cannot Login / "Failed to load applications"
**Problem:** You see "Failed to load applications" or cannot login with old credentials (`csrep`/`csrep123`)

**Solution:**
1. The system now requires proper user accounts
2. Old hardcoded credentials no longer work
3. You need an account created by admin:
   - Contact your administrator
   - Admin creates account via Admin Portal → User Management
   - Use the new credentials provided

**For Admins Setting Up First Time:**
```bash
# 1. Ensure server is running
npm start

# 2. Login to admin portal
# URL: http://localhost:4000/admin-portal.html
# Username: admin
# Password: admin123 (or your ADMIN_PASSWORD)

# 3. Go to User Management
# 4. Create customer service rep account
# 5. Provide credentials to rep
```

### Cannot Login
- Verify credentials are correct (case-sensitive)
- Check that your account is active (admin can verify)
- Clear browser cache and cookies
- Try different browser
- Ensure server is running

### Applications Not Loading
- Click "Refresh" button
- Check internet connection
- Verify server is running
- Check browser console for errors

### Status Update Fails
- Ensure application is in "pending" status
- Verify internet connection
- Try refreshing the page
- Contact technical support if persists

### Search Not Working
- Clear search field and try again
- Check spelling
- Try different search terms
- Use status filter instead

## Support

### For Technical Issues
- Check server logs
- Verify database connection
- Check API endpoint availability
- Review browser console errors

### For Process Questions
- Consult bank policies
- Contact supervisor
- Review application guidelines
- Check training materials

## Updates and Maintenance

### Regular Updates
- System updates occur after business hours
- Dashboard automatically refreshes
- No action required from users

### Feature Requests
- Submit through proper channels
- Include detailed description
- Explain business need
- Provide examples

## Security and Compliance

### Data Protection
- All data encrypted in transit
- Secure authentication required
- Session timeout after inactivity
- Audit trail maintained

### Compliance
- GDPR compliant
- Bank secrecy maintained
- Audit logs available
- Regular security reviews

## Contact

For dashboard support or issues:
- Technical Support: IT Department
- Process Questions: Supervisor
- System Access: IT Administrator
- Training: HR/Training Department

---

**Last Updated:** December 23, 2025  
**Version:** 1.0  
**For:** AKCB Customer Service Representatives
