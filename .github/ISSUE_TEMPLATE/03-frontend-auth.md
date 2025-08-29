---
name: Frontend Authentication UI & State Management
about: Implement frontend authentication system with login/register forms and protected routes
title: "[FRONTEND] Authentication UI & State Management"
labels: ["frontend", "Priority: High", "authentication"]
assignees: []
---

## 🎨 Frontend Authentication UI & State Management

### **Description**
Create the complete frontend authentication system including login/register forms, authentication state management, protected routes, and Google OAuth integration.

### **Acceptance Criteria**
- [ ] User registration form with validation
- [ ] Login form with email/password
- [ ] Google OAuth login button
- [ ] Authentication state management (Context/Redux)
- [ ] Protected routes implementation
- [ ] Auto-redirect for authenticated users
- [ ] Logout functionality
- [ ] Error handling and user feedback
- [ ] Responsive design for all auth components

### **Components to Create**

#### **1. Authentication Forms**
```
/src/components/auth/
├── LoginForm.jsx
├── RegisterForm.jsx
├── GoogleOAuthButton.jsx
├── ForgotPasswordForm.jsx
└── EmailVerification.jsx
```

#### **2. Pages**
```
/src/pages/
├── Login.jsx
├── Register.jsx
├── Dashboard.jsx (protected)
└── Profile.jsx (protected)
```

#### **3. Context & Hooks**
```
/src/hooks/
├── useAuth.js (already exists - enhance)
└── useLocalStorage.js

/src/context/
└── AuthContext.js (already exists - enhance)
```

### **Technical Implementation**

#### **Authentication Context Enhancement**
```javascript
// context/AuthContext.js
const AuthContext = createContext({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  login: () => {},
  register: () => {},
  logout: () => {},
  googleLogin: () => {},
});
```

#### **Protected Route Component**
```javascript
// components/common/ProtectedRoute.jsx
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@hooks/useAuth';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <LoadingSpinner />;
  
  return isAuthenticated ? 
    children : 
    <Navigate to="/login" state={{ from: location }} replace />;
};
```

#### **Registration Form with Validation**
```javascript
// components/auth/RegisterForm.jsx
const RegisterForm = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    graduationYear: '',
    course: '',
  });
  
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  
  // Form validation logic
  // Submit handler
  // Error display
};
```

### **Form Validation Rules**

#### **Registration Validation**
- [ ] **Email**: Valid email format, required
- [ ] **Password**: Minimum 8 characters, at least 1 uppercase, 1 lowercase, 1 number
- [ ] **Confirm Password**: Must match password
- [ ] **First Name**: Required, minimum 2 characters
- [ ] **Last Name**: Required, minimum 2 characters
- [ ] **Graduation Year**: Valid year between 2010-2030
- [ ] **Course**: Required selection from predefined list

#### **Login Validation**
- [ ] **Email**: Valid email format, required
- [ ] **Password**: Required, minimum 6 characters

### **Google OAuth Integration**

#### **Google OAuth Button Component**
```javascript
// components/auth/GoogleOAuthButton.jsx
import { GoogleLogin } from '@react-oauth/google';

const GoogleOAuthButton = () => {
  const { googleLogin } = useAuth();
  
  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      await googleLogin(credentialResponse.credential);
    } catch (error) {
      // Handle error
    }
  };
  
  return (
    <GoogleLogin
      onSuccess={handleGoogleSuccess}
      onError={() => console.log('Login Failed')}
      text="continue_with"
      shape="rectangular"
      size="large"
    />
  );
};
```

#### **Dependencies to Install**
```bash
npm install @react-oauth/google react-hook-form yup @hookform/resolvers
npm install react-hot-toast # for notifications
```

### **Routing Implementation**
```javascript
// App.jsx routes update
import ProtectedRoute from '@components/common/ProtectedRoute';

// Add these routes
<Route path="/login" element={<Login />} />
<Route path="/register" element={<Register />} />
<Route path="/dashboard" element={
  <ProtectedRoute>
    <Dashboard />
  </ProtectedRoute>
} />
<Route path="/profile" element={
  <ProtectedRoute>
    <Profile />
  </ProtectedRoute>
} />
```

### **State Management Flow**

#### **Authentication Flow**
1. **Login/Register** → Send credentials to backend
2. **Success** → Store JWT token in localStorage + Context
3. **Auto-login** → Check localStorage on app load
4. **Token Refresh** → Refresh before expiration
5. **Logout** → Clear token and redirect

#### **Error Handling**
- [ ] Network errors (connection issues)
- [ ] Validation errors (invalid email, weak password)
- [ ] Authentication errors (wrong credentials)
- [ ] Authorization errors (insufficient permissions)
- [ ] Token expiration handling

### **UI/UX Requirements**

#### **Design Consistency**
- [ ] Use existing IIIT color scheme
- [ ] Match current header/footer styling
- [ ] Responsive design (mobile-first)
- [ ] Loading states and spinners
- [ ] Success/error notifications

#### **User Experience**
- [ ] Remember login state across sessions
- [ ] Auto-redirect after login to intended page
- [ ] Clear error messages
- [ ] Form field validation feedback
- [ ] Password visibility toggle
- [ ] "Keep me logged in" option

### **Files to Create/Modify**
- `/src/pages/Login.jsx`
- `/src/pages/Register.jsx`
- `/src/components/auth/LoginForm.jsx`
- `/src/components/auth/RegisterForm.jsx`
- `/src/components/auth/GoogleOAuthButton.jsx`
- `/src/components/common/ProtectedRoute.jsx`
- `/src/context/AuthContext.js` (enhance existing)
- `/src/hooks/useAuth.js` (enhance existing)
- `/src/services/authService.js` (enhance existing)
- `/src/utils/validation.js`
- `/src/App.jsx` (add new routes)

### **Testing Checklist**
- [ ] Registration with valid IIIT email (@iiitnr.edu.in)
- [ ] Registration with external email (manual approval)
- [ ] Login with correct credentials
- [ ] Login with incorrect credentials
- [ ] Google OAuth login flow
- [ ] Protected route access (authenticated)
- [ ] Protected route redirect (unauthenticated)
- [ ] Logout functionality
- [ ] Token refresh on app reload
- [ ] Form validation (all fields)
- [ ] Responsive design on mobile/tablet

### **Definition of Done**
- [ ] All acceptance criteria met
- [ ] Authentication flow fully functional
- [ ] All forms validated and working
- [ ] Error handling comprehensive
- [ ] Responsive design tested
- [ ] Code reviewed and documented
- [ ] Integration tested with backend

### **Priority**: 🔴 High
### **Estimated Time**: 10-14 hours
### **Dependencies**: Backend Authentication (#2)
