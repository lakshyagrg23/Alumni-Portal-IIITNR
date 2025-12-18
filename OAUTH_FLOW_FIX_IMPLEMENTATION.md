# OAuth Flow Bug Fix - Implementation Complete

## Summary

Successfully implemented the OAuth flow fix to prevent unregistered users from creating accounts via OAuth on the Login page. Now only existing users can login with OAuth, while new users must register first through the proper registration flow.

## Changes Implemented

### 1. Backend: OAuth Endpoints (2 files modified)

#### [backend/src/routes/auth.js](backend/src/routes/auth.js) - POST /api/auth/google

**Lines Modified**: 735-820

**Changes**:

- Added `isLoginAttempt` parameter extraction from request body
- Added login-only validation check (lines 765-772):
  ```javascript
  if (isLoginAttempt === true) {
    return res.status(401).json({
      success: false,
      message: "No account found with this email. Please register first.",
      canRegister: true,
    });
  }
  ```
- When `isLoginAttempt === true` and user doesn't exist → returns 401 error
- Auto-user creation only proceeds if: verification token provided OR institute email registration OR NOT a login attempt

**Impact**: Login page OAuth requests with unregistered emails now fail with a helpful error message

---

#### [backend/src/routes/auth.js](backend/src/routes/auth.js) - POST /api/auth/linkedin

**Lines Modified**: 887-977

**Changes**:

- Added `isLoginAttempt` parameter extraction from request body
- Added identical login-only validation check as Google endpoint
- Maintains consistency between Google and LinkedIn OAuth flows

**Impact**: LinkedIn login requests with unregistered emails now fail with a helpful error message

---

### 2. Frontend: Google OAuth Service ([frontend/src/services/google_login.jsx](frontend/src/services/google_login.jsx))

**Changes**:

- Added `isLoginAttempt = false` prop to component signature (line 9)
- Added `isLoginAttempt` to payload sent to backend (lines 35-37):
  ```javascript
  if (isLoginAttempt) {
    payload.isLoginAttempt = true;
  }
  ```
- Added 401 error handling for unregistered emails (lines 60-68):
  ```javascript
  if (
    isLoginAttempt &&
    err.response?.status === 401 &&
    err.response?.data?.canRegister
  ) {
    toast.error(`${err.response?.data?.message}`);
    setTimeout(() => navigate("/register"), 2000);
    return;
  }
  ```

**Impact**: Google OAuth on Login page now properly rejects unregistered emails and redirects to registration

---

### 3. Frontend: Login Page ([frontend/src/pages/auth/Login.jsx](frontend/src/pages/auth/Login.jsx))

**Changes**:

- Added `isLoginAttempt={true}` prop to GoogleLogin component (line 174):
  ```jsx
  <GoogleLogin isLoginAttempt={true} />
  ```

**Impact**: Login page now signals to Google OAuth service that this is a login-only attempt

---

### 4. Frontend: LinkedIn Service ([frontend/src/services/linked_in.jsx](frontend/src/services/linked_in.jsx))

**Changes**:

- Added `registrationPath = null` and `isLoginAttempt = false` props (line 4)
- Added session storage for registration path (lines 27-30):
  ```javascript
  if (registrationPath) {
    sessionStorage.setItem("linkedin_registration_path", registrationPath);
  }
  ```
- Added session storage for login attempt flag (lines 32-34):
  ```javascript
  if (isLoginAttempt) {
    sessionStorage.setItem("linkedin_is_login_attempt", "true");
  }
  ```

**Impact**: LinkedIn OAuth can now distinguish between login and registration attempts via session storage

---

### 5. Frontend: LinkedIn Callback Handler ([frontend/src/pages/auth/LinkedInCallback.jsx](frontend/src/pages/auth/LinkedInCallback.jsx))

**Changes**:

- Added retrieval of registration path from session storage (lines 98-101):
  ```javascript
  const registrationPath = sessionStorage.getItem("linkedin_registration_path");
  if (registrationPath) {
    linkedinData.registrationPath = registrationPath;
  }
  ```
- Added retrieval of login attempt flag from session storage (lines 103-106):
  ```javascript
  const isLoginAttempt =
    sessionStorage.getItem("linkedin_is_login_attempt") === "true";
  if (isLoginAttempt) {
    linkedinData.isLoginAttempt = true;
  }
  ```
- Added session storage cleanup (line 114):
  ```javascript
  sessionStorage.removeItem("linkedin_is_login_attempt");
  ```
- Added 401 error handling for unregistered emails (lines 129-135):
  ```javascript
  if (err.response?.status === 401 && err.response?.data?.canRegister) {
    const errorMessage =
      err.response?.data?.message || "No account found. Please register first.";
    setError(errorMessage);
    toast.error(errorMessage, { duration: 5000 });
    setTimeout(() => navigate("/register"), 3000);
    return;
  }
  ```

**Impact**: LinkedIn callback now properly handles login-only rejections and redirects unregistered users to registration

---

## How It Works

### Login Flow (New Behavior)

1. User clicks "Sign in with Google" on Login page
2. GoogleLogin component sets `isLoginAttempt={true}`
3. Frontend sends OAuth data with `isLoginAttempt: true` to backend
4. Backend checks: if user doesn't exist AND `isLoginAttempt === true` → returns 401 error
5. Frontend catches 401 and shows error: "No account found. Please register first."
6. User is redirected to registration page after 2 seconds

### Registration Flow (Unchanged)

1. User clicks "Sign up with Google" on Registration page
2. GoogleLogin component has `isLoginAttempt={false}` (default) OR `registrationPath` is set
3. Frontend sends OAuth data WITHOUT `isLoginAttempt` or with `registrationPath`
4. Backend allows new user creation for unregistered emails
5. User proceeds to onboarding

### Security Implications

- Login pages can no longer be exploited to auto-create accounts
- Registration flows remain intact for proper identity verification
- Institute email and personal email registration paths unaffected
- Proper separation of concerns between login and registration

## Testing Checklist

- [ ] **Login with unregistered email via Google**: Should show "No account found" error
- [ ] **Login with registered email via Google**: Should login successfully
- [ ] **Register with unregistered email via Google (Institute Email)**: Should proceed
- [ ] **Register with unregistered email via Google (Personal Email)**: Should proceed
- [ ] **Login with unregistered email via LinkedIn**: Should show "No account found" error
- [ ] **Login with registered email via LinkedIn**: Should login successfully
- [ ] **Register with unregistered email via LinkedIn (Institute Email)**: Should proceed
- [ ] **Register with unregistered email via LinkedIn (Personal Email)**: Should proceed

## Files Modified (Summary)

| File                                         | Changes                                                 | Lines                |
| -------------------------------------------- | ------------------------------------------------------- | -------------------- |
| backend/src/routes/auth.js                   | Google OAuth: Added isLoginAttempt check                | 735-820              |
| backend/src/routes/auth.js                   | LinkedIn OAuth: Added isLoginAttempt check              | 887-977              |
| frontend/src/services/google_login.jsx       | Added isLoginAttempt prop & handling                    | 9, 35-37, 60-68      |
| frontend/src/pages/auth/Login.jsx            | Pass isLoginAttempt={true}                              | 174                  |
| frontend/src/services/linked_in.jsx          | Added isLoginAttempt & registrationPath props           | 4, 27-34             |
| frontend/src/pages/auth/LinkedInCallback.jsx | Added isLoginAttempt flag handling & 401 error handling | 98-106, 114, 129-135 |

## Backward Compatibility

✅ All changes are backward compatible:

- Default `isLoginAttempt = false` maintains current behavior for registration pages
- `registrationPath` prop already existed and continues to work
- No breaking changes to API contracts
- Registration flow remains unchanged
