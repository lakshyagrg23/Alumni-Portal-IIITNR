# Login Implementation & Profile Creation Flow

## Overview
The Alumni Portal uses a dual-table architecture separating **authentication** (users table) and **profile data** (alumni_profiles table), with support for local authentication and OAuth (Google & LinkedIn).

---

## 🏗️ Database Architecture

### 1. **Users Table** (Authentication Layer)
```sql
users {
    id UUID PRIMARY KEY
    email VARCHAR(255) UNIQUE
    password_hash VARCHAR(255)  -- NULL for OAuth users
    provider VARCHAR(50)         -- 'local', 'google', 'linkedin'
    provider_id VARCHAR(255)     -- OAuth provider ID
    role VARCHAR(20)             -- 'admin', 'alumni'
    is_approved BOOLEAN
    is_active BOOLEAN
    email_verified BOOLEAN
    created_at, updated_at TIMESTAMP
}
```
**Purpose**: Stores authentication credentials and authorization data only.

### 2. **Alumni Profiles Table** (Profile Data Layer)
```sql
alumni_profiles {
    id UUID PRIMARY KEY
    user_id UUID REFERENCES users(id)
    
    -- Personal: first_name, last_name, middle_name, phone, dob, gender
    -- Academic: student_id, admission_year, graduation_year, degree, branch, cgpa
    -- Professional: current_company, position, industry, work_experience_years, skills[]
    -- Location: current_city/state/country, hometown_city/state
    -- Social: linkedin_url, github_url, portfolio_url
    -- Other: bio, interests[], profile_picture_url
    -- Privacy: is_profile_public, show_contact_info, show_work_info, show_academic_info
    
    created_at, updated_at TIMESTAMP
}
```
**Purpose**: Stores all profile information and personal data.

---

## 🔐 Authentication Flow

### **1. Local Registration** (`POST /api/auth/register`)

#### Backend Flow (`backend/src/routes/auth.js`):
```javascript
1. Validate required fields (email, password, firstName, lastName)
2. Check if user exists → User.findByEmail(email)
3. Create user in users table:
   - Hash password with bcrypt (12 rounds)
   - Set provider = 'local'
   - Set is_approved = true (auto-approve)
   - Store email in lowercase
4. Create alumni profile:
   - Insert firstName, lastName
   - Set isProfilePublic = true (default)
   - Link via userId
5. Generate JWT token (7 days expiry)
6. Return: { token, user data }
```

#### Frontend Flow:
```javascript
AuthContext.register() → authService.register()
→ Store token in localStorage
→ Set axios Authorization header
→ Dispatch LOGIN_SUCCESS
→ Redirect to dashboard
```

---

### **2. Local Login** (`POST /api/auth/login`)

#### Backend Flow:
```javascript
1. Validate email & password
2. Find user → User.findByEmail(email)
3. Check user.is_active (reject if inactive)
4. Verify password → bcrypt.compare(password, user.password_hash)
5. Generate JWT token
6. Return: { token, user basic data }
```

#### JWT Token Structure:
```javascript
{
  userId: user.id,
  email: user.email,
  role: user.role,
  exp: 7 days from now
}
```

---

### **3. Google OAuth Login** (`POST /api/auth/google`)

#### Frontend Flow:
```javascript
1. User clicks "Login with Google"
2. Google OAuth popup opens (frontend/src/services/google_login.jsx)
3. User grants permissions
4. Google returns: { email, googleId, name, picture }
5. Frontend calls: POST /api/auth/google with Google data
```

#### Backend Flow:
```javascript
1. Receive { email, googleId, name } from frontend
2. Check if user exists → User.findByEmail(email)
3. IF USER DOESN'T EXIST:
   - Create user:
     * email = email
     * provider = 'google'
     * providerId = googleId
     * password_hash = NULL
     * is_approved = true
     * email_verified = true
4. Check if alumni profile exists → AlumniProfile.findByUserId(user.id)
5. IF PROFILE DOESN'T EXIST:
   - Parse name into firstName, lastName
   - Create alumni profile with basic data
   - Set isNewUser = true
6. Check if profile is complete:
   - hasAlumniProfile = !!(graduation_year && branch && degree && bio)
7. Generate JWT token
8. Return: { token, user, isNewUser, hasAlumniProfile }
```

**Key Point**: Google login creates BOTH user AND profile if they don't exist.

---

### **4. LinkedIn OAuth Login** (`POST /api/auth/linkedin`)

#### Two-Step Process:

**Step 1**: Exchange Authorization Code (`POST /api/auth/linkedin/callback`)
```javascript
Frontend receives authorization code from LinkedIn
→ Send to backend with redirectUri
→ Backend exchanges code for access token
→ Backend fetches user info from LinkedIn API
→ Returns: { email, linkedinId, name, picture }
```

**Step 2**: Login with LinkedIn Data (`POST /api/auth/linkedin`)
```javascript
Same flow as Google OAuth:
1. Check/create user (provider = 'linkedin')
2. Check/create alumni profile
3. Return JWT token
```

---

## 👤 Profile Management

### **Get Current Profile** (`GET /api/auth/profile`)

#### Backend Flow:
```javascript
1. Authenticate user via JWT middleware
2. Get user from users table → User.findById(userId)
3. Get alumni profile → SELECT * FROM alumni_profiles WHERE user_id = userId
4. IF NO PROFILE:
   - Return user data with empty profile fields
5. ELSE:
   - Merge user + alumni_profile data
   - Return complete profile
```

#### Response Structure:
```javascript
{
  success: true,
  data: {
    // From users table
    id, email, role, isApproved, isActive, provider, createdAt,
    
    // From alumni_profiles table
    firstName, lastName, profilePicture,
    alumniProfile: { /* all profile fields */ }
  }
}
```

---

### **Update Profile** (`PUT /api/auth/profile`)

#### Backend Flow (`backend/src/routes/auth.js`):
```javascript
1. Authenticate user
2. Separate incoming data:
   - userData: email only
   - alumniData: everything else (firstName, lastName, degree, etc.)
3. Handle array fields (skills, interests):
   - Convert comma-separated strings to arrays
   - Convert null/empty to []
4. Check if alumni profile exists:
   - IF EXISTS: AlumniProfile.update(profileId, alumniData)
   - IF NOT EXISTS: AlumniProfile.create({ userId, ...alumniData })
5. Update users table if email changed
6. Return updated profile
```

#### Field Mapping (camelCase → snake_case):
```javascript
Frontend sends:        Backend converts to:
firstName           → first_name
currentCompany      → current_company
linkedinUrl         → linkedin_url
dateOfBirth         → date_of_birth
skills: "JS,Python" → skills: ['JS', 'Python']
```

---

## 🔒 Authentication Middleware

### **JWT Verification** (`backend/src/middleware/auth.js`):
```javascript
authenticate middleware:
1. Extract token from Authorization header
2. Verify JWT signature and expiration
3. Decode userId from token
4. Fetch user from database
5. Check if user.is_active
6. Attach user to req.user
7. Call next()
```

### **Admin Authorization**:
```javascript
requireAdmin middleware:
1. Check if user is authenticated
2. Check if user.role === 'admin'
3. Reject if not admin
```

---

## 🎨 Frontend State Management

### **AuthContext** (`frontend/src/context/AuthContext.jsx`)

#### State:
```javascript
{
  user: null,           // Current user profile data
  token: null,          // JWT token
  isAuthenticated: false,
  loading: true         // Initial loading state
}
```

#### Actions:
- `LOGIN_START` - Set loading true
- `LOGIN_SUCCESS` - Store user & token, set authenticated
- `LOGIN_FAILURE` - Clear user & token
- `LOGOUT` - Clear everything
- `LOAD_USER` - Load user from token on app start
- `UPDATE_PROFILE` - Merge updated profile data

#### Methods:
```javascript
login(credentials)           → Call authService.login()
register(userData)           → Call authService.register()
loginWithGoogle(googleData)  → Call authService.googleLogin()
loginWithLinkedIn(linkedData)→ Call authService.linkedinLogin()
updateProfile(profileData)   → Call authService.updateProfile()
logout()                     → Clear token & state
```

---

### **Auth Service** (`frontend/src/services/authService.js`)

#### Axios Setup:
```javascript
- Base URL: http://localhost:5000/api
- Request interceptor: Adds Authorization header
- Response interceptor: Handles 401 errors, auto-logout
```

#### Methods:
```javascript
setToken(token)          → Store in localStorage
removeToken()            → Remove from localStorage
login(credentials)       → POST /auth/login
register(userData)       → POST /auth/register
googleLogin(googleData)  → POST /auth/google
linkedinLogin(data)      → POST /auth/linkedin
getProfile()             → GET /auth/profile
updateProfile(data)      → PUT /auth/profile
logout()                 → POST /auth/logout
```

---

## 🔄 Complete Login Flow Example

### **New User Registration via Google**:

```
1. User clicks "Login with Google" button
   ↓
2. Google OAuth popup → User grants permission
   ↓
3. Google returns: { email: "john@gmail.com", googleId: "12345", name: "John Doe" }
   ↓
4. Frontend calls: POST /api/auth/google { email, googleId, name }
   ↓
5. Backend checks: User.findByEmail("john@gmail.com") → NULL
   ↓
6. Backend creates user:
   {
     email: "john@gmail.com",
     provider: "google",
     provider_id: "12345",
     password_hash: NULL,
     is_approved: true,
     is_active: true
   }
   ↓
7. Backend checks: AlumniProfile.findByUserId(userId) → NULL
   ↓
8. Backend creates profile:
   {
     user_id: userId,
     first_name: "John",
     last_name: "Doe",
     is_profile_public: true
   }
   ↓
9. Backend generates JWT token
   ↓
10. Backend returns:
   {
     token: "eyJhbGc...",
     isNewUser: true,
     hasAlumniProfile: false,  // No graduation_year/branch/degree/bio yet
     user: { id, email, role, ... }
   }
   ↓
11. Frontend stores token in localStorage
   ↓
12. Frontend dispatches LOGIN_SUCCESS
   ↓
13. Frontend redirects to /profile (to complete profile)
```

---

### **Existing User Login via Email/Password**:

```
1. User enters email & password
   ↓
2. Frontend calls: POST /api/auth/login { email, password }
   ↓
3. Backend finds user: User.findByEmail(email)
   ↓
4. Backend verifies: bcrypt.compare(password, user.password_hash) ✓
   ↓
5. Backend checks: user.is_active === true ✓
   ↓
6. Backend generates JWT token
   ↓
7. Backend returns: { token, user }
   ↓
8. Frontend stores token → localStorage
   ↓
9. Frontend dispatches LOGIN_SUCCESS
   ↓
10. Frontend calls: GET /api/auth/profile (to load full profile)
   ↓
11. Backend returns: { user data + alumni_profile data }
   ↓
12. Frontend dispatches LOAD_USER
   ↓
13. Frontend redirects to /dashboard
```

---

## 🛡️ Security Features

### **Password Security**:
- bcrypt hashing with 12 salt rounds
- No passwords stored for OAuth users
- Password reset tokens with expiration

### **Token Security**:
- JWT with 7-day expiration
- Signed with JWT_SECRET
- Stored in localStorage
- Automatically attached to requests
- Server validates on every protected route

### **Authorization**:
- Middleware checks token validity
- Role-based access (admin vs alumni)
- Active status check (is_active)

### **Data Validation**:
- Required field validation
- Email format validation
- Duplicate email prevention
- Case-insensitive email storage

---

## 📊 Data Separation Benefits

### **Why Two Tables?**

1. **Security**: Authentication data isolated from profile data
2. **Performance**: Faster auth lookups (users table is smaller)
3. **Flexibility**: Users can exist without complete profiles
4. **Privacy**: Profile data can be hidden while user remains active
5. **OAuth Support**: OAuth users don't need password_hash
6. **Scalability**: Can add more profile types without touching users table

### **When Profiles Are Created**:
- ✅ Local registration: Profile created immediately
- ✅ Google OAuth: Profile created on first login
- ✅ LinkedIn OAuth: Profile created on first login
- ✅ Manual update: Profile created if doesn't exist

---

## 🔍 Key Model Methods

### **User Model** (`backend/src/models/User.js`):
```javascript
findById(id)              → Get user by UUID
findByEmail(email)        → Get user by email (case-insensitive)
findByProviderId(id)      → Get OAuth user by provider ID
create(userData)          → Create new user (hashes password)
update(id, data)          → Update user data
updatePassword(id, pass)  → Update & hash password
verifyPassword(pass, hash)→ Compare password with hash
```

### **AlumniProfile Model** (`backend/src/models/AlumniProfile.js`):
```javascript
findById(id)              → Get profile by UUID
findByUserId(userId)      → Get profile by user_id FK
create(profileData)       → Create new profile
update(id, data)          → Update profile (handles array fields)
```

---

## 🚀 Profile Completion Flow

### **Determining Profile Completeness**:
```javascript
hasAlumniProfile = !!(
  alumniProfile.graduation_year &&
  alumniProfile.branch &&
  alumniProfile.degree &&
  alumniProfile.bio &&
  alumniProfile.bio.trim().length > 0
)
```

If `hasAlumniProfile = false`, frontend should redirect to profile completion page.

---

## 📝 Common Operations

### **Check if User Exists**:
```javascript
const user = await User.findByEmail(email)
if (user) {
  // User exists
}
```

### **Create Complete User + Profile**:
```javascript
// 1. Create user
const user = await User.create({
  email, password, role: 'alumni'
})

// 2. Create profile
const profile = await AlumniProfile.create({
  userId: user.id,
  firstName, lastName, ...otherData
})
```

### **Load Full Profile**:
```javascript
// 1. Get user
const user = await User.findById(userId)

// 2. Get profile
const profile = await AlumniProfile.findByUserId(userId)

// 3. Merge data
const fullProfile = { ...user, ...profile }
```

---

## 🐛 Debugging Tips

### **Common Issues**:

1. **"User not found"** → Check if userId in token matches database
2. **"Invalid token"** → Token expired or JWT_SECRET changed
3. **"Profile not complete"** → Missing graduation_year/branch/degree/bio
4. **Array fields not saving** → Ensure proper array conversion (string → array)
5. **OAuth user can't login** → Check provider and provider_id match

### **Logging Points**:
```javascript
// Backend
console.log('User ID:', userId)
console.log('Request data:', req.body)
console.log('Alumni data:', alumniData)

// Frontend
console.log('Auth state:', state)
console.log('Token:', localStorage.getItem('token'))
console.log('API response:', response)
```

---

## 📚 Related Files

### Backend:
- `backend/src/routes/auth.js` - Auth endpoints
- `backend/src/models/User.js` - User model
- `backend/src/models/AlumniProfile.js` - Profile model
- `backend/src/middleware/auth.js` - JWT verification
- `database/schema.sql` - Database schema

### Frontend:
- `frontend/src/context/AuthContext.jsx` - Auth state management
- `frontend/src/services/authService.js` - API calls
- `frontend/src/services/google_login.jsx` - Google OAuth
- `frontend/src/services/linked_in.jsx` - LinkedIn OAuth
- `frontend/src/pages/auth/Login.jsx` - Login UI
- `frontend/src/pages/Profile.jsx` - Profile management UI

---

## ✅ Summary

The Alumni Portal implements a **robust, secure authentication system** with:
- ✅ Dual-table architecture (users + alumni_profiles)
- ✅ Multiple auth providers (local, Google, LinkedIn)
- ✅ JWT-based stateless authentication
- ✅ Automatic profile creation on OAuth login
- ✅ Secure password hashing (bcrypt)
- ✅ Role-based authorization (admin/alumni)
- ✅ Token refresh on app reload
- ✅ Centralized error handling
- ✅ Privacy controls (profile visibility)

**User Journey**: Register/Login → Token stored → Profile loaded → Access granted → Profile can be updated anytime
