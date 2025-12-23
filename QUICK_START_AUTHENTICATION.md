# Quick Start Guide - User Authentication System

## 🚀 Quick Setup (5 minutes)

### Step 1: Build and Start Server
```bash
npm run build
npm start
```

The server will:
- Create the `users` table automatically
- Create default admin account (username: `admin`)

### Step 2: Login as Admin
1. Open browser: `http://localhost:4000/admin-portal.html`
2. Login with:
   - **Username**: `admin`
   - **Password**: `admin123` (or your `ADMIN_PASSWORD` from .env)

### Step 3: Create Customer Service Rep
1. Click "User Management" in sidebar
2. Click "Add New User"
3. Fill in:
   ```
   Username: rep1
   Full Name: Service Rep 1
   Email: rep1@akcb.com
   Role: Customer Service Rep
   Password: Rep123!
   ```
4. Click "Create User"

### Step 4: Test Customer Rep Login
1. Open: `http://localhost:4000/customer-rep-dashboard.html`
2. Login with:
   - **Username**: `rep1`
   - **Password**: `Rep123!`
3. ✅ You should see the dashboard with applications

## 🎯 What You Get

### For Admins (`/admin-portal.html`)
- Full user management interface
- Create/edit/delete customer service reps
- Manage user status (active/inactive)
- View user activity (last login)

### For Customer Service Reps (`/customer-rep-dashboard.html`)
- Secure login with backend authentication
- View loan applications
- View salary overdraft applications
- View account opening applications
- Approve/reject applications

## 🔐 Default Credentials

| Role | Username | Password | Access |
|------|----------|----------|--------|
| Admin | `admin` | `admin123` | Full admin portal + user management |
| Customer Rep | *(create via admin)* | *(set by admin)* | Customer service dashboard only |

## 📁 Key Files

| File | Purpose |
|------|---------|
| `src/userManagement.ts` | Backend user logic |
| `src/index.ts` | API endpoints |
| `public/rep-auth.js` | Customer rep authentication |
| `public/admin-users.html` | User management UI |
| `public/customer-rep-dashboard.html` | Customer service dashboard |

## 🛠️ Common Tasks

### Create Multiple Customer Service Reps
```
Admin Portal → User Management → Add New User
Repeat for each rep
```

### Reset a User's Password
```
Admin Portal → User Management → Edit (user) → Enter new password → Save
```

### Deactivate a User
```
Admin Portal → User Management → Edit (user) → Status: Inactive → Save
```

### View All Active Customer Reps
```
Admin Portal → User Management
All active users show green "Active" badge
```

## ⚠️ Important Notes

1. **Change Default Password**: Update `ADMIN_PASSWORD` in `.env` for production
2. **Server Restart**: Customer reps need to re-login after server restart (tokens cleared)
3. **Last Admin Protection**: Cannot delete the last active admin account
4. **Username Uniqueness**: Usernames must be unique (enforced by database)

## 🐛 Troubleshooting

### "Failed to load users"
- Check database connection
- Verify users table was created (check server logs)

### Can't login as admin
- Verify password matches `ADMIN_PASSWORD` in .env
- Default is `admin123` if not set

### "Token expired" on customer rep dashboard
- This happens after server restart
- Just login again with credentials

### Users table not created
- Check server logs on startup
- Ensure PostgreSQL/database is running
- Verify database credentials in .env

## 📚 More Information

- **Full Documentation**: [USER_MANAGEMENT_README.md](USER_MANAGEMENT_README.md)
- **Implementation Details**: [AUTHENTICATION_IMPLEMENTATION_SUMMARY.md](AUTHENTICATION_IMPLEMENTATION_SUMMARY.md)

## ✅ Verification Checklist

- [ ] Server starts without errors
- [ ] Can login to admin portal
- [ ] Can access User Management page
- [ ] Can create customer service rep
- [ ] Can login as customer service rep
- [ ] Customer rep can view applications
- [ ] Can edit/delete users as admin

**All done! 🎉** Your authentication system is ready to use.
