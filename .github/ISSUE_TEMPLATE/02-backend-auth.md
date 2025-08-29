---
name: Backend API Foundation & Authentication
about: Set up core backend infrastructure and JWT authentication system
title: "[BACKEND] API Foundation & Authentication System"
labels: ["backend", "Priority: High", "authentication"]
assignees: []
---

## 🔐 Backend API Foundation & Authentication

### **Description**
Implement the core backend infrastructure with JWT authentication, user registration, login, and Google OAuth integration.

### **Acceptance Criteria**
- [ ] Backend server starts without errors
- [ ] All middleware properly configured
- [ ] JWT authentication working
- [ ] User registration endpoint functional
- [ ] Login endpoint with email/password
- [ ] Google OAuth integration
- [ ] Institute email auto-approval (@iiitnr.edu.in)
- [ ] Password hashing and security
- [ ] Error handling and validation

### **API Endpoints to Implement**

#### **Authentication Routes** (`/api/auth/`)
```javascript
POST /register     // User registration
POST /login        // Email/password login
POST /google       // Google OAuth login
POST /logout       // User logout
GET  /me          // Get current user info
POST /refresh     // Refresh JWT token
POST /verify-email // Email verification
```

#### **User Management** (`/api/users/`)
```javascript
GET    /profile/:id    // Get user profile
PUT    /profile        // Update user profile
DELETE /account        // Delete user account
```

### **Technical Requirements**

#### **Dependencies to Install**
```bash
npm install bcryptjs jsonwebtoken passport passport-google-oauth20 
npm install express-validator multer nodemailer
```

#### **Environment Variables** (`.env`)
```
DATABASE_URL=postgresql://username:password@localhost:5432/alumni_portal
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRE=7d
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
EMAIL_SERVICE=gmail
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_email_password
FRONTEND_URL=http://localhost:3000
```

### **Implementation Details**

#### **1. Authentication Middleware**
```javascript
// middleware/auth.js
const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  // JWT verification logic
};

const authorizeRoles = (...roles) => {
  // Role-based authorization
};
```

#### **2. User Model** (Sequelize)
```javascript
// models/User.js
const { DataTypes } = require('sequelize');

const User = sequelize.define('User', {
  email: { type: DataTypes.STRING, unique: true },
  password: DataTypes.STRING,
  role: { type: DataTypes.ENUM, values: ['alumni', 'admin'] },
  is_approved: { type: DataTypes.BOOLEAN, defaultValue: false },
  google_id: DataTypes.STRING,
  // ... other fields
});
```

#### **3. Institute Email Auto-Approval**
```javascript
// Auto-approve @iiitnr.edu.in emails
if (email.endsWith('@iiitnr.edu.in')) {
  user.is_approved = true;
}
```

### **Security Features**
- [ ] Password hashing with bcrypt (minimum 12 rounds)
- [ ] JWT tokens with expiration
- [ ] Rate limiting on auth endpoints
- [ ] Input validation and sanitization
- [ ] CORS configuration
- [ ] Helmet.js security headers
- [ ] SQL injection prevention

### **Files to Create/Modify**
- `/backend/src/routes/auth.js`
- `/backend/src/routes/users.js`
- `/backend/src/controllers/authController.js`
- `/backend/src/controllers/userController.js`
- `/backend/src/middleware/auth.js`
- `/backend/src/models/User.js`
- `/backend/src/models/AlumniProfile.js`
- `/backend/src/utils/email.js`
- `/backend/src/config/passport.js`
- `/backend/.env.example`

### **Testing Requirements**
- [ ] Unit tests for authentication functions
- [ ] Integration tests for auth endpoints
- [ ] Test user registration flow
- [ ] Test login with valid/invalid credentials
- [ ] Test Google OAuth flow
- [ ] Test JWT token validation
- [ ] Test institute email auto-approval

### **Expected API Response Formats**

#### **Registration Success**
```json
{
  "success": true,
  "message": "Registration successful",
  "user": {
    "id": "uuid",
    "email": "user@iiitnr.edu.in",
    "role": "alumni",
    "is_approved": true
  },
  "token": "jwt_token_here"
}
```

#### **Login Success**
```json
{
  "success": true,
  "message": "Login successful",
  "user": { "id": "uuid", "email": "...", "role": "..." },
  "token": "jwt_token_here"
}
```

### **Definition of Done**
- [ ] All acceptance criteria met
- [ ] API endpoints tested with Postman/Thunder Client
- [ ] Security best practices implemented
- [ ] Error handling comprehensive
- [ ] Code reviewed and documented
- [ ] Environment variables documented

### **Priority**: 🔴 High
### **Estimated Time**: 8-12 hours
### **Dependencies**: Database Setup (#1)
