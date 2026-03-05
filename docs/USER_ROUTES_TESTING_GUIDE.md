# User Routes Security - Manual Testing Guide

## Overview
This guide helps you manually verify that the security fixes for user routes are working correctly.

## Test Environment
- **Local**: http://localhost:5000
- **Production**: https://alumni.iiitnr.ac.in

Replace `$BASE_URL` with your target environment in the commands below.

---

## Test 1: Unauthenticated Access (Should ALL Fail with 401)

### 1.1 List all users without token
```bash
curl -X GET http://localhost:5000/api/users
```
**Expected**: `401 Unauthorized` - "No token provided"

### 1.2 Get user by ID without token
```bash
curl -X GET http://localhost:5000/api/users/1
```
**Expected**: `401 Unauthorized` - "No token provided"

### 1.3 Update user without token
```bash
curl -X PUT http://localhost:5000/api/users/1 \
  -H "Content-Type: application/json" \
  -d '{"first_name":"Hacked"}'
```
**Expected**: `401 Unauthorized` - "No token provided"

### 1.4 Delete user without token
```bash
curl -X DELETE http://localhost:5000/api/users/1
```
**Expected**: `401 Unauthorized` - "No token provided"

### 1.5 Approve user without token
```bash
curl -X PUT http://localhost:5000/api/users/1/approve
```
**Expected**: `401 Unauthorized` - "No token provided"

### 1.6 Deactivate user without token
```bash
curl -X PUT http://localhost:5000/api/users/1/deactivate
```
**Expected**: `401 Unauthorized` - "No token provided"

---

## Test 2: Regular User Access (IDOR Protection)

### Setup
1. Login as a **regular user** (not admin)
2. Copy the JWT token from browser DevTools (localStorage or network response)
3. Set token: `TOKEN="your-jwt-token-here"`
4. Extract your user ID from the token:
   ```bash
   USER_ID=$(echo "$TOKEN" | cut -d'.' -f2 | base64 -d 2>/dev/null | grep -o '"userId":"[^"]*"' | cut -d'"' -f4)
   echo $USER_ID
   ```
   **Note**: User IDs are UUIDs (e.g., `2366fc5f-27e1-445d-837b-e73fc705098d`), not integers!

### 2.1 List all users (Should fail)
```bash
curl -X GET http://localhost:5000/api/users \
  -H "Authorization: Bearer $TOKEN"
```
**Expected**: `403 Forbidden` - "Admin access required"

### 2.2 Get own profile (Should succeed)
```bash
curl -X GET http://localhost:5000/api/users/$USER_ID \
  -H "Authorization: Bearer $TOKEN"
```
**Expected**: `200 OK` - Your profile data returned

### 2.3 Get OTHER user's profile (Should fail - IDOR protection)
```bash
# Use a different user's UUID (not your own)
OTHER_USER_ID="40439d5d-cf71-499b-8d8a-0f67030c8843"  # Example admin UUID
curl -X GET http://localhost:5000/api/users/$OTHER_USER_ID \
  -H "Authorization: Bearer $TOKEN"
```
**Expected**: `403 Forbidden` - "Access denied. You can only view your own profile."

### 2.4 Update own profile (Should succeed)
```bash
curl -X PUT http://localhost:5000/api/users/$USER_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"first_name":"Updated Name"}'
```
**Expected**: `200 OK` - Profile updated successfully

### 2.5 Update OTHER user's profile (Should fail - IDOR protection)
```bash
curl -X PUT http://localhost:5000/api/users/1 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"first_name":"Hacked"}'
```
**Expected**: `403 Forbidden` - "Access denied. You can only update your own profile."

### 2.6 Try to escalate role to admin (Should be ignored)
```bash
curl -X PUT http://localhost:5000/api/users/$USER_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"role":"admin"}'
```
**Expected**: `200 OK` - But role should NOT change (check your profile, role should still be "alumni" or "student")

### 2.7 Try to modify privilege fields (Should be ignored)
```bash
curl -X PUT http://localhost:5000/api/users/$USER_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"is_approved":true,"is_active":true,"role":"superadmin"}'
```
**Expected**: `200 OK` - But fields should NOT change (these are admin-only fields)

### 2.8 Try to delete a user (Should fail)
```bash
curl -X DELETE http://localhost:5000/api/users/999 \
  -H "Authorization: Bearer $TOKEN"
```
**Expected**: `403 Forbidden` - "Admin access required"

### 2.9 Try to approve a user (Should fail)
```bash
curl -X PUT http://localhost:5000/api/users/999/approve \
  -H "Authorization: Bearer $TOKEN"
```
**Expected**: `403 Forbidden` - "Admin access required"

### 2.10 Try to deactivate a user (Should fail)
```bash
curl -X PUT http://localhost:5000/api/users/999/deactivate \
  -H "Authorization: Bearer $TOKEN"
```
**Expected**: `403 Forbidden` - "Admin access required"

---

## Test 3: Admin Access (Should ALL Succeed)

### Setup
1. Login as an **admin user**
2. Copy the JWT token
3. Set token: `ADMIN_TOKEN="your-admin-jwt-token-here"`
4. Get a valid user UUID from the database:
   ```bash
   # You'll need actual UUIDs from your database
   # Example: Get from the admin panel or database query
   TEST_USER_ID="2366fc5f-27e1-445d-837b-e73fc705098d"  # Replace with actual UUID
   ```

### 3.1 List all users (Should succeed)
```bash
curl -X GET http://localhost:5000/api/users \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```
**Expected**: `200 OK` - Array of all users

### 3.2 Get any user's profile (Should succeed)
```bash
curl -X GET http://localhost:5000/api/users/$TEST_USER_ID \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```
**Expected**: `200 OK` - User profile data

### 3.3 Update any user's profile (Should succeed)
```bash
curl -X PUT http://localhost:5000/api/users/$TEST_USER_ID \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"first_name":"Admin Updated"}'
```
**Expected**: `200 OK` - User updated successfully

### 3.4 Modify user role (Should succeed)
```bash
curl -X PUT http://localhost:5000/api/users/$TEST_USER_ID \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"role":"alumni"}'
```
**Expected**: `200 OK` - Role updated successfully

### 3.5 Modify privilege fields (Should succeed)
```bash
curl -X PUT http://localhost:5000/api/users/$TEST_USER_ID \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"is_approved":true,"is_active":true}'
```
**Expected**: `200 OK` - Fields updated successfully

### 3.6 Approve a user (Should succeed)
```bash
# Use a test user ID that needs approval
curl -X PUT http://localhost:5000/api/users/TEST_ID/approve \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```
**Expected**: `200 OK` - User approved successfully

### 3.7 Deactivate a user (Should succeed)
```bash
# Use a test user ID
curl -X PUT http://localhost:5000/api/users/TEST_ID/deactivate \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```
**Expected**: `200 OK` - User deactivated successfully

---

## Quick Test Checklist

### ✅ Authentication
- [ ] All routes require valid JWT token (401 without token)

### ✅ IDOR Protection
- [ ] Users can view their own profile
- [ ] Users CANNOT view other users' profiles
- [ ] Users can update their own profile
- [ ] Users CANNOT update other users' profiles

### ✅ Authorization (Admin-Only Routes)
- [ ] Regular users CANNOT list all users
- [ ] Regular users CANNOT delete users
- [ ] Regular users CANNOT approve users
- [ ] Regular users CANNOT deactivate users
- [ ] Admins CAN do all of the above

### ✅ Field Restrictions
- [ ] Regular users CANNOT change their role
- [ ] Regular users CANNOT modify is_approved
- [ ] Regular users CANNOT modify is_active
- [ ] Regular users CANNOT modify email_verified
- [ ] Admins CAN modify all fields

---

## How to Get Your JWT Token

### From Browser (Frontend)
1. Login to the application
2. Open DevTools (F12)
3. Go to **Application** tab → **Local Storage**
4. Find `token` key
5. Copy the value

### From Network Tab
1. Login to the application
2. Open DevTools (F12) → **Network** tab
3. Look for login request response
4. Find `token` in response body
5. Copy the value

---

## PowerShell Version (Windows)

Replace `curl` with `Invoke-RestMethod` or `Invoke-WebRequest`:

```powershell
# Without token (should fail)
Invoke-RestMethod -Uri "http://localhost:5000/api/users" -Method GET

# With token
$headers = @{ "Authorization" = "Bearer $TOKEN" }
Invoke-RestMethod -Uri "http://localhost:5000/api/users/2" -Method GET -Headers $headers

# With body
$body = @{ first_name = "Updated" } | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:5000/api/users/2" -Method PUT -Headers $headers -Body $body -ContentType "application/json"
```

---

## Automated Testing

Run the automated test scripts:

### Linux/Mac:
```bash
cd backend
chmod +x test-user-routes-security.sh
./test-user-routes-security.sh
```

### Windows:
```powershell
cd backend
.\test-user-routes-security.ps1
```

The scripts will guide you through all tests and provide a summary.
