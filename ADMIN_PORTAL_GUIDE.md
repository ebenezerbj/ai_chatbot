# Admin Portal Guide

## Overview
The AKCB Admin Portal provides a comprehensive web-based interface for managing the chatbot system, including customer balance uploads, knowledge base management, system monitoring, and settings.

## Accessing the Admin Portal

### Local Development
Navigate to: `http://localhost:4000/admin-portal.html`

### Production (Render)
Navigate to: `https://ai-chatbot-latest-7hhy.onrender.com/admin-portal.html`

## Login

**Admin Password**: Set in environment variable `ADMIN_PASSWORD`

- **Local Development**: `changeme123` (from .env file)
- **Production**: Set in Render environment variables

⚠️ **Security Note**: Always change the default password in production!

## Portal Features

### 1. Dashboard
The main dashboard provides:
- **Total Accounts**: Number of customer accounts in the system
- **Last Balance Update**: Timestamp of the most recent balance update
- **Knowledge Base Entries**: Total number of KB entries
- **System Status**: Current system health status
- **Quick Actions**: Fast access to common tasks
- **System Information**: Database type, connection status, service status
- **Recent Activity Log**: Last 10 system events

### 2. Customer Demographics
View comprehensive demographic analytics with interactive charts.

**Features:**
- **Coverage Statistics**: Percentage of customers with each demographic field
- **Interactive Charts** (Chart.js):
  - Gender Distribution (Doughnut Chart)
  - Age Group Distribution (Bar Chart)
  - Customer Type Distribution (Pie Chart)
  - Account Status Distribution (Doughnut Chart)
- **Detailed Tables**: Complete demographic data with all captured fields
- **20+ Demographic Fields**: Names, gender, ID info, addresses, phone, email, DOB, etc.
- **Database Migration**: Run Migration 001 to add demographic columns

**Captured Demographics:**
- Personal: Title, First/Middle/Last Name, Gender, Date of Birth
- Identification: ID Type, ID Number, PEP Status
- Contact: Mobile Phone, Email, Home Address, Postal Address, Country
- Account: Customer Type, Ownership, Product Name, Status, Branch, Currency

### 3. Balance Upload
Upload CSV files to update customer account balances.

**Features:**
- File upload with validation (any file size supported)
- Real-time progress indicator
- Detailed success/error reporting
- Automatic stats refresh after upload
- **Batch Processing** (Added Dec 20, 2025):
  - Large files processed in 500-record batches
  - Prevents timeout on large uploads
  - Handles up to 100 errors per upload
  - Tested with 48,872 records successfully

**CSV Format:**
```csv
Account Number,Ledger Balance,Available Balance
1511520000230861,12500.50,12500.50
1511520000230862,8750.25,8750.25
```

**Supported Column Names:**
- Account Number: `Account Number`, `account_number`, `AccountNumber`, `ACCOUNT_NUMBER`, `Account No`, `account_no`
- Ledger Balance: `Ledger Balance`, `ledger_balance`, `LedgerBalance`, `Balance`, `balance`, `BALANCE`
- Available Balance: `Available Balance`, `available_balance`, `AvailableBalance`, `Available`

**Steps:**
1. Navigate to "Balance Upload" section
2. Click "Choose File" and select your CSV
3. Click "Upload Balances"
4. Review the results (total, successful, errors)

### 3. Knowledge Base
Manage the chatbot's knowledge base entries.

**Features:**
- Quick access to KB editor
- Opens the full KB management interface in a new tab
- Link to dedicated KB admin page (`/kb-admin.html`)

**To Use:**
- Click "Open KB Editor" to launch the full KB management interface
- Or navigate directly to `/kb-admin.html`

### 4. System Logs
View system activity and monitoring information.

**Features:**
- Recent activity log (last 10 events)
- Quick link to Render dashboard for detailed server logs
- Real-time event tracking

**Events Tracked:**
- Admin logins
- Balance uploads (success/failure)
- System errors
- Configuration changes

### 5. Settings
Configure system settings and manage the admin password.

**Features:**
- Environment variables reference
- Password change interface
- System configuration overview

**Environment Variables:**
- `DATABASE_URL`: PostgreSQL connection string
- `SMS_ONLINE_API_KEY`: SMS Online Ghana API key
- `OPENAI_API_KEY`: OpenAI API key
- `ADMIN_PASSWORD`: Admin portal password

**Note:** Environment variables must be updated on the server (Render dashboard) or in the `.env` file for local development.

## Navigation

### Sidebar Menu
- **Dashboard**: System overview and quick actions
- **Balance Upload**: Upload customer balance CSV files
- **Knowledge Base**: Manage chatbot knowledge entries
- **System Logs**: View activity and system events
- **Settings**: System configuration and password management

### Top Bar
- **Page Title**: Shows current section
- **User Info**: Displays logged-in admin user
- **Admin Avatar**: Visual indicator

## Daily Workflow

### Morning Balance Update
1. Export CSV from core banking system
2. Login to admin portal
3. Navigate to "Balance Upload"
4. Select and upload CSV file
5. Verify success message
6. Check dashboard for updated stats
7. Logout

### Knowledge Base Updates
1. Login to admin portal
2. Navigate to "Knowledge Base"
3. Click "Open KB Editor"
4. Add/edit/delete entries as needed
5. Save changes
6. Return to admin portal
7. Logout

## Security Best Practices

1. **Strong Passwords**
   - Use minimum 12 characters
   - Mix uppercase, lowercase, numbers, symbols
   - Never share or commit to version control

2. **Session Management**
   - Always logout when done
   - Token stored in localStorage (cleared on logout)
   - Tokens are in-memory only (not persisted in database)

3. **Access Control**
   - Only authorized personnel should have admin password
   - Change password if compromised
   - Monitor activity logs for unauthorized access

4. **Network Security**
   - Use HTTPS in production (Render provides this automatically)
   - Don't access admin portal from public WiFi
   - Consider IP whitelisting for production

## Troubleshooting

### Cannot Login
**Problem**: "Invalid password" error  
**Solution**: 
- Verify password is correct
- Check `ADMIN_PASSWORD` environment variable
- For production, check Render environment settings

### Dashboard Stats Not Loading
**Problem**: Stats show "-" or don't update  
**Solution**:
- Check database connection
- Verify API endpoints are accessible
- Check browser console for errors

### Balance Upload Fails
**Problem**: Upload returns error  
**Solution**:
- Verify CSV format matches expected structure
- Check file size (max 10MB)
- Ensure account numbers exist in database
- Review error details in result message

### Session Expired
**Problem**: Actions return "Unauthorized"  
**Solution**:
- Logout and login again
- Clear browser localStorage
- Check if server was restarted (tokens are in-memory)

## API Endpoints

The admin portal uses these backend endpoints:

### Authentication
```
POST /api/admin/login
Body: { "password": "your_password" }
Response: { "token": "auth_token" }

POST /api/admin/logout  
Headers: { "Authorization": "Bearer <token>" }
Response: { "success": true }
```

### Data & Stats
```
GET /api/admin/stats
Headers: { "Authorization": "Bearer <token>" }
Response: { "totalAccounts": 48715, "lastUpdate": "2024-01-15T10:30:00Z" }

GET /api/health
Response: { "status": "ok", "kbEntries": 95 }
```

### Balance Upload
```
POST /api/admin/upload-balances
Headers: { "Authorization": "Bearer <token>" }
Body: FormData with file
Response: {
  "success": true,
  "totalRecords": 100,
  "successCount": 100,
  "errorCount": 0,
  "errors": [],
  "stats": { "totalAccounts": 48715, "lastUpdate": "..." }
}
```

## Mobile Responsiveness

The admin portal is fully responsive and works on:
- Desktop computers (recommended)
- Tablets (iPad, Android tablets)
- Mobile phones (limited, use desktop for best experience)

**Note**: For balance uploads with large CSV files, use a desktop computer for better performance.

## Browser Compatibility

Tested and supported browsers:
- Google Chrome (recommended)
- Microsoft Edge
- Mozilla Firefox
- Safari

**Minimum Versions**:
- Chrome 90+
- Edge 90+
- Firefox 88+
- Safari 14+

## Support

For technical issues:
1. Check browser console for JavaScript errors
2. Verify server logs in Render dashboard
3. Check database connection status
4. Ensure environment variables are set correctly
5. Contact system administrator

## Quick Reference

| Task | Steps |
|------|-------|
| Upload Balances | Login → Balance Upload → Choose File → Upload |
| View Stats | Login → Dashboard |
| Manage KB | Login → Knowledge Base → Open KB Editor |
| Check Logs | Login → System Logs |
| Change Password | Login → Settings → Change Admin Password |
| Logout | Click "Logout" button in sidebar |

## Keyboard Shortcuts

- **Tab**: Navigate between form fields
- **Enter**: Submit forms (login, file upload)
- **Esc**: Close alerts/dialogs (when implemented)

## Future Enhancements

Planned features:
- User management (multiple admin users)
- Audit logs with export
- Scheduled balance uploads
- Email notifications for errors
- Dashboard charts and graphs
- CSV download of current balances
- Backup and restore functionality

## Version History

- **v1.0** (December 2024): Initial release
  - Dashboard with system stats
  - Balance upload functionality
  - Knowledge base integration
  - System logs view
  - Settings management

## Related Documentation

- [Balance Upload Guide](BALANCE_UPLOAD_GUIDE.md) - Detailed balance upload documentation
- [Daily Balance Update](DAILY_BALANCE_UPDATE.md) - Balance update workflows
- [KB Admin](kb-admin.html) - Knowledge base editor

---

**Last Updated**: December 13, 2024  
**Version**: 1.0  
**Support**: AKCB IT Department
