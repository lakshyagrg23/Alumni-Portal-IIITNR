# Admin Portal Testing Guide

## 🧪 Testing the Admin Portal Implementation

### Prerequisites
1. Backend server running on `http://localhost:5000`
2. Frontend server running on `http://localhost:3000`
3. Database with users (including admin users)

### Testing Steps

#### 1. **Login as Admin**
- Go to `http://localhost:3000/login`
- Login with an admin account
- Verify JWT token is stored in localStorage

#### 2. **Access Admin Panel**
- Navigate to `http://localhost:3000/admin`
- Should see the admin dashboard with sidebar
- Verify only admin users can access this page

#### 3. **Test User Management**
- Click on "User Management" in sidebar
- Should see user statistics cards
- Should see a table of all users with:
  - Email addresses
  - Roles (admin/alumni)
  - Approval status (Approved/Pending)
  - Account status (Active/Inactive)
  - Join dates
  - Action buttons

#### 4. **Test User Actions**
- **Approve User**: Click "Approve" for pending users
- **Revoke Approval**: Click "Revoke" for approved external email users
- **Deactivate**: Click "Deactivate" for active users
- **Activate**: Click "Activate" for inactive users

#### 5. **Test Filters**
- Search by email in search box
- Filter by role (Admin/Alumni)
- Filter by approval status (Approved/Pending)
- Test refresh button

#### 6. **API Testing with curl/Postman**

```bash
# Get auth token first (login)
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@iiitnr.edu.in","password":"your_password"}'

# Use the token in subsequent requests
export TOKEN="your_jwt_token_here"

# Get all users (admin only)
curl -X GET http://localhost:5000/api/admin/users \
  -H "Authorization: Bearer $TOKEN"

# Approve a user
curl -X PUT http://localhost:5000/api/admin/users/USER_ID/approve \
  -H "Authorization: Bearer $TOKEN"

# Get user stats
curl -X GET http://localhost:5000/api/admin/stats/users \
  -H "Authorization: Bearer $TOKEN"
```

### Expected Behaviors

#### ✅ Institute Email Logic
- Users with `@iiitnr.edu.in` emails should be auto-approved
- Should show "✓ Institute" indicator in the UI
- Cannot revoke approval for institute emails

#### ✅ Security
- Non-admin users should be redirected from admin pages
- API routes should return 403 for non-admin requests
- Admin cannot deactivate their own account

#### ✅ Real-time Updates
- After approval/rejection, user table should update
- Statistics should reflect changes immediately

### 🐛 Common Issues & Solutions

1. **403 Forbidden on API calls**
   - Check if JWT token is valid
   - Verify user has admin role
   - Check token is being sent in Authorization header

2. **Frontend shows "Access Denied"**
   - Ensure user role is 'admin' in database
   - Check AuthContext is providing correct user data

3. **Users not loading**
   - Check backend console for database connection errors
   - Verify User.findAll() method works correctly

4. **Styling issues**
   - Check CSS modules are importing correctly
   - Verify all CSS classes exist in AdminPanel.module.css

### 📊 Sample Test Data

Create test users in your database:
```sql
-- Admin user (auto-approved)
INSERT INTO users (id, email, password_hash, role, is_approved, is_active) 
VALUES (uuid_generate_v4(), 'admin@iiitnr.edu.in', 'hashed_password', 'admin', true, true);

-- Institute student (auto-approved)
INSERT INTO users (id, email, password_hash, role, is_approved, is_active) 
VALUES (uuid_generate_v4(), 'student@iiitnr.edu.in', 'hashed_password', 'alumni', true, true);

-- External user (pending approval)
INSERT INTO users (id, email, password_hash, role, is_approved, is_active) 
VALUES (uuid_generate_v4(), 'external@gmail.com', 'hashed_password', 'alumni', false, true);
```

### 🎯 Success Criteria

- ✅ Admin can view all users with proper information
- ✅ Admin can approve/reject external email users
- ✅ Admin can activate/deactivate user accounts  
- ✅ Statistics update in real-time
- ✅ Proper security (non-admins blocked)
- ✅ Institute emails auto-approved and protected
- ✅ Responsive design works on mobile
- ✅ Error handling for failed operations
