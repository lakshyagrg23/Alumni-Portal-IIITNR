# OAuth Flow Bug Fix - Required Changes

## Problem Summary

Currently, when a user attempts to login with OAuth (Google/LinkedIn) using an unregistered email address on the **Login page**, they are being allowed to create an account and redirected to the onboarding form. This is incorrect behavior.

The proper flow should be:

- **Registration paths (Institute Email / Personal Email)**: Allow OAuth with new emails → verify identity → proceed to onboarding
- **Login path**: Only allow OAuth with **already-registered** emails → deny OAuth attempt with new emails

## Root Cause Analysis

### Backend Issue: `/api/auth/google` & `/api/auth/linkedin` endpoints

**Location**: [backend/src/routes/auth.js](backend/src/routes/auth.js#L732-L865) (Google) and [backend/src/routes/auth.js](backend/src/routes/auth.js#L877-L1000) (LinkedIn)

**Current Logic** (Lines 760-815 for Google, similar for LinkedIn):

```javascript
if (!user) {
  // NEW USER CREATION - HAPPENS FOR ANY UNREGISTERED EMAIL
  const userData = {
    email: emailLower,
    provider: "google",
    providerId: googleId,
    role: "alumni",
    isApproved: true,
    email_verified: true,
    registration_path: registrationPath,
  };
  user = await User.create(userData); // ❌ Creates user even on login page!
  isNewUser = true;
}
```

**Problem**: The endpoint accepts both **login requests** and **registration requests** but treats them identically. There's no way to distinguish between:

1. OAuth login attempt from Login page (should FAIL for unregistered emails)
2. OAuth registration attempt from Register page (should SUCCEED for unregistered emails)

### Frontend Issue: No distinction in OAuth calls

**Location**: [frontend/src/services/google_login.jsx](frontend/src/services/google_login.jsx) and [frontend/src/pages/auth/Login.jsx](frontend/src/pages/auth/Login.jsx#L174)

**Current Logic**:

- The `GoogleLogin` component sends `registrationPath` ONLY when on registration pages
- On the **Login page**, it sends NO context flag to indicate this is a login-only attempt
- Backend receives request with no `registrationPath` and assumes it's a regular OAuth flow (auto-create user)

## Required Changes

### 1. Backend: Add Login-Only Flag to OAuth Endpoints

**File**: [backend/src/routes/auth.js](backend/src/routes/auth.js#L732)

**Changes Needed**:

#### For `/api/auth/google` endpoint (lines 732-865):

- Add a `isLoginAttempt` flag parameter to the request
- When `isLoginAttempt === true` AND user doesn't exist → Return 401 error
- Only auto-create user if:
  - `verificationToken` is provided (personal email registration), OR
  - `registrationPath === 'institute_email'` (institute email registration), OR
  - `isLoginAttempt === false` (general OAuth flow)

**Pseudo-code**:

```javascript
if (!user) {
  // If this is a login-only attempt and user doesn't exist, deny access
  if (isLoginAttempt === true) {
    return res.status(401).json({
      success: false,
      message: "No account found with this email. Please register first.",
      canRegister: true, // Frontend can suggest registration
    });
  }

  // Otherwise, proceed with user creation (for registration flows)
  // ... existing user creation code ...
}
```

#### For `/api/auth/linkedin` endpoint (lines 877-1000):

- Apply the same `isLoginAttempt` logic

### 2. Frontend: Pass Login Context to OAuth Endpoints

**File**: [frontend/src/services/google_login.jsx](frontend/src/services/google_login.jsx)

**Changes Needed**:

- Add an `isLoginAttempt` prop to the `GoogleLoginButton` component
- Include `isLoginAttempt: true` when calling `loginWithGoogle()` on the Login page
- Default to `false` to maintain backward compatibility with registration pages

**Example**:

```jsx
// In google_login.jsx handleSuccess function
const payload = {
  email: decoded.email,
  googleId: decoded.sub,
  name: decoded.name,
  isLoginAttempt: isLoginAttempt, // NEW: Pass the flag
};
```

**File**: [frontend/src/pages/auth/Login.jsx](frontend/src/pages/auth/Login.jsx#L174)

**Changes Needed**:

- Pass `isLoginAttempt={true}` prop to the `<GoogleLogin />` component
- Handle the new 401 error response with a message directing user to register

**Example**:

```jsx
<GoogleLogin isLoginAttempt={true} />
```

**File**: [frontend/src/context/AuthContext.jsx](frontend/src/context/AuthContext.jsx#L530)

**Changes Needed** (if GoogleLogin is called from here):

- Handle the 401 error case when `isLoginAttempt === true`
- Show appropriate error message: "No account found. Please register first."
- Optionally redirect to registration page or show registration link

### 3. Frontend: Error Handling for Unregistered Emails on Login

**File**: [frontend/src/services/google_login.jsx](frontend/src/services/google_login.jsx) - `handleSuccess()` function

**Changes Needed**:

- Catch 401 errors when `isLoginAttempt === true`
- Display user-friendly error message
- Provide link/button to navigate to registration page

**Example**:

```jsx
catch (err) {
  if (err.response?.status === 401 && err.response?.data?.message?.includes('No account found')) {
    toast.error(
      `${err.response.data.message} Please register first.`,
      { duration: 5000 }
    );
    // Optionally redirect to register page
    navigate('/register');
  } else {
    // Handle other errors...
  }
}
```

### 4. Similar Changes for LinkedIn OAuth

**File**: [frontend/src/services/linked_in.jsx](frontend/src/services/linked_in.jsx)

**Changes Needed**:

- Same as Google: add `isLoginAttempt` parameter
- Pass `isLoginAttempt={true}` on Login page
- Handle 401 error appropriately

**File**: [frontend/src/pages/auth/LinkedInCallback.jsx](frontend/src/pages/auth/LinkedInCallback.jsx)

**Changes Needed**:

- Handle 401 error and redirect to registration with appropriate message

## Implementation Priority

1. **Backend First** (critical): Add `isLoginAttempt` check to reject new user creation on login attempts
2. **Frontend**: Pass `isLoginAttempt: true` from Login page components
3. **Error Handling**: Implement proper error messages and UX feedback
4. **Testing**: Verify both login and registration flows work correctly

## Testing Checklist

- [ ] **Login with unregistered email via Google**: Should fail with "No account found"
- [ ] **Login with registered email via Google**: Should succeed
- [ ] **Register with unregistered email via Google**: Should succeed (institute or personal email flow)
- [ ] **Login with unregistered email via LinkedIn**: Should fail with "No account found"
- [ ] **Login with registered email via LinkedIn**: Should succeed
- [ ] **Register with unregistered email via LinkedIn**: Should succeed
- [ ] **New user created via registration should be able to login**: Verify flow works end-to-end

## Files to Modify

1. `/backend/src/routes/auth.js` - Add `isLoginAttempt` validation logic
2. `/frontend/src/services/google_login.jsx` - Add `isLoginAttempt` prop and handling
3. `/frontend/src/pages/auth/Login.jsx` - Pass `isLoginAttempt={true}`
4. `/frontend/src/services/linked_in.jsx` - Add `isLoginAttempt` prop and handling
5. `/frontend/src/pages/auth/LinkedInCallback.jsx` - Handle 401 errors
6. `/frontend/src/context/AuthContext.jsx` - If needed, handle OAuth errors consistently
