# User Management & Authentication System

This document describes the backend authentication system for customer service representatives and admin user management.

## Overview

The system provides:
- **Secure authentication** for customer service representatives
- **Role-based access control** (Admin and Customer Rep roles)
- **Admin user management** interface
- **Session-based authentication** with JWT-like tokens
- **Password hashing** using SHA-256

## Database Schema

### Users Table

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(64) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'customer_rep')),
  full_name VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP
);
```

## Default Credentials

### Admin Account
- **Username**: `admin`
- **Password**: Value from `ADMIN_PASSWORD` environment variable (default: `admin123`)
- **Role**: `admin`

The default admin account is automatically created on first server startup.

## API Endpoints

### Customer Service Rep Authentication

#### Login
```
POST /api/rep/login
```

**Request:**
```json
{
  "username": "john_doe",
  "password": "password123"
}
```

**Response:**
```json
{
  "token": "abc123...",
  "user": {
    "id": 1,
    "username": "john_doe",
    "email": "john@example.com",
    "role": "customer_rep",
    "full_name": "John Doe"
  }
}
```

#### Logout
```
POST /api/rep/logout
Authorization: Bearer <token>
```

#### Verify Token
```
GET /api/rep/verify
Authorization: Bearer <token>
```

**Response:**
```json
{
  "valid": true,
  "user": {
    "userId": 1,
    "username": "john_doe",
    "role": "customer_rep"
  }
}
```

#### Get Current User Info
```
GET /api/rep/me
Authorization: Bearer <token>
```

### Admin User Management

All admin endpoints require authentication with an admin token.

#### List Users
```
GET /api/admin/users
Authorization: Bearer <admin-token>
```

Optional query parameter:
- `role`: Filter by role (`admin` or `customer_rep`)

**Response:**
```json
{
  "success": true,
  "users": [
    {
      "id": 1,
      "username": "john_doe",
      "email": "john@example.com",
      "role": "customer_rep",
      "full_name": "John Doe",
      "is_active": true,
      "created_at": "2025-01-01T00:00:00Z",
      "updated_at": "2025-01-01T00:00:00Z",
      "last_login": "2025-01-15T10:30:00Z"
    }
  ]
}
```

#### Create User
```
POST /api/admin/users
Authorization: Bearer <admin-token>
```

**Request:**
```json
{
  "username": "jane_smith",
  "email": "jane@example.com",
  "password": "SecurePass123!",
  "role": "customer_rep",
  "full_name": "Jane Smith"
}
```

#### Update User
```
PUT /api/admin/users/:id
Authorization: Bearer <admin-token>
```

**Request:**
```json
{
  "email": "newemail@example.com",
  "full_name": "Jane M. Smith",
  "is_active": true,
  "password": "NewPassword123!" // Optional
}
```

#### Delete User
```
DELETE /api/admin/users/:id
Authorization: Bearer <admin-token>
```

## Frontend Integration

### Customer Service Rep Dashboard

File: `public/customer-rep-dashboard.html`

**Features:**
- Login screen with username/password
- Automatic session restoration on page reload
- Token verification on startup
- Automatic logout on token expiration
- Uses `rep-auth.js` for authentication

**Authentication Flow:**
1. User enters credentials
2. `repAuth.login()` called
3. Token and user info stored in localStorage
4. Dashboard displayed
5. All API requests use `repAuth.fetchWithAuth()`

### Admin User Management

File: `public/admin-users.html`

**Features:**
- List all users (admins and customer reps)
- Create new users
- Edit existing users (email, name, status, password)
- Delete users (with protection for last admin)
- Role-based display (color-coded badges)
- Activity status (active/inactive)

**Access:**
- Available from admin portal sidebar: "User Management"
- Requires admin authentication

## Authentication Scripts

### rep-auth.js
Authentication utility for customer service representatives.

**Methods:**
- `repAuth.login(username, password)` - Authenticate user
- `repAuth.logout()` - Clear session and show login screen
- `repAuth.verify()` - Verify current token is valid
- `repAuth.fetchWithAuth(url, options)` - Make authenticated API calls
- `repAuth.getToken()` - Get current auth token
- `repAuth.getUser()` - Get current user info
- `repAuth.displayUserInfo(selector)` - Display user info in UI

### admin-auth.js
Authentication utility for admin users (existing).

## Security Features

1. **Password Hashing**: All passwords are hashed using SHA-256 before storage
2. **Session Tokens**: Secure random tokens generated for each session
3. **Token Validation**: Tokens validated on every API request
4. **Role-Based Access**: Endpoints restricted by user role
5. **Inactive Account Protection**: Inactive users cannot login
6. **Last Admin Protection**: Cannot delete the last active admin

## Usage Examples

### Creating a Customer Service Rep Account (Admin)

1. Login to admin portal
2. Navigate to "User Management"
3. Click "Add New User"
4. Fill in the form:
   - Username: `cs_rep_1`
   - Full Name: `Mary Johnson`
   - Email: `mary@akcb.com`
   - Role: `Customer Service Rep`
   - Password: Choose secure password
5. Click "Create User"

### Customer Rep Login

1. Navigate to `/customer-rep-dashboard.html`
2. Enter username and password
3. Click "Sign In"
4. Dashboard loads with access to:
   - Loan applications
   - Salary overdraft applications
   - Account opening applications

### Admin Managing Users

**View all customer reps:**
```javascript
const response = await adminAuth.fetchWithAuth('/api/admin/users?role=customer_rep');
const data = await response.json();
console.log(data.users);
```

**Deactivate a user:**
```javascript
const userId = 5;
const response = await adminAuth.fetchWithAuth(`/api/admin/users/${userId}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ is_active: false })
});
```

## Environment Variables

Add to `.env` file:

```env
# Admin password for default admin account
ADMIN_PASSWORD=your_secure_admin_password

# Optional: Static admin token for programmatic access
ADMIN_TOKEN=your_static_admin_token
```

## Migration from Old System

The old customer rep dashboard used simple hardcoded credentials:
- Username: `csrep`
- Password: `csrep123`

**Migration steps:**
1. Server automatically creates users table on startup
2. Default admin account created
3. Admin can create customer rep accounts
4. Distribute new credentials to customer service reps
5. Old hardcoded authentication removed

## Testing

### Test Customer Rep Login
```bash
curl -X POST http://localhost:4000/api/rep/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

### Test Admin User Creation
```bash
curl -X POST http://localhost:4000/api/admin/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "username": "test_rep",
    "email": "test@akcb.com",
    "password": "Test123!",
    "role": "customer_rep",
    "full_name": "Test Representative"
  }'
```

## Troubleshooting

### Users table not found
- Ensure database connection is working
- Restart server to trigger automatic table creation
- Check server logs for initialization errors

### Login fails with valid credentials
- Verify user account is active (`is_active = true`)
- Check server logs for authentication errors
- Verify password was set correctly

### Cannot delete admin user
- System prevents deleting the last active admin
- Create another admin first, then delete

### Token expired
- Tokens are session-based and cleared on logout
- Browser refresh maintains session via localStorage
- Server restart clears all active tokens

## Future Enhancements

- [ ] Password complexity requirements
- [ ] Password reset functionality
- [ ] Two-factor authentication (2FA)
- [ ] Audit log for user actions
- [ ] Session timeout configuration
- [ ] Password expiration policy
- [ ] Login attempt limiting
- [ ] Email verification
