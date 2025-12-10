# OAuth Verification Token Fix - Summary

## Problem
When users completed identity verification (Step 1) and then clicked "Sign up with Google" (Step 2), the verification token wasn't being passed to the backend, so their account wasn't linked to their institute record.

## Root Cause
The OAuth buttons in different parts of the app weren't accepting or passing verification tokens:
1. **GoogleLoginButton** (`google_login.jsx`) - didn't accept `verificationToken` prop
2. **LinkedInLoginButton** (`linked_in.jsx`) - didn't store verification token in sessionStorage
3. **LinkedInCallback** (`LinkedInCallback.jsx`) - didn't retrieve and pass token to backend

## Changes Made

### 1. Updated GoogleLoginButton (`frontend/src/services/google_login.jsx`)
**Changes:**
- Added `verificationToken` prop (optional, defaults to null)
- Added `onSuccess` callback prop for custom success handling
- Added `buttonText` prop for customizable button text
- Modified payload to include `verificationToken` when provided
- Extracted OAuth success logic into separate `handleSuccess` function

**Code:**
```javascript
export default function GoogleLoginButton({ 
  verificationToken = null, 
  onSuccess, 
  buttonText = "Continue with Google" 
}) {
  // ...
  const payload = {
    email: decoded.email,
    googleId: decoded.sub,
    name: decoded.name,
  };

  if (verificationToken) {
    payload.verificationToken = verificationToken;
  }
  // ...
}
```

### 2. Updated LinkedInLoginButton (`frontend/src/services/linked_in.jsx`)
**Changes:**
- Added `verificationToken` prop (optional, defaults to null)
- Stores verification token in sessionStorage before redirect
- Token is retrieved after OAuth callback completes

**Code:**
```javascript
export default function LinkedInLoginButton({ verificationToken = null }) {
  // ...
  if (verificationToken) {
    sessionStorage.setItem('linkedin_verification_token', verificationToken);
  }
  // ...
}
```

### 3. Updated LinkedInCallback (`frontend/src/pages/auth/LinkedInCallback.jsx`)
**Changes:**
- Retrieves verification token from sessionStorage
- Adds token to LinkedIn data before calling loginWithLinkedIn
- Cleans up token from sessionStorage after use

**Code:**
```javascript
const verificationToken = sessionStorage.getItem('linkedin_verification_token');
sessionStorage.removeItem('linkedin_verification_token');

if (verificationToken) {
  linkedinData.verificationToken = verificationToken;
}
```

### 4. Updated RegisterPersonalEmail (`frontend/src/pages/auth/RegisterPersonalEmail.jsx`)
**Changes:**
- Removed custom `onSuccess` handler
- Now passes `verificationToken` prop directly to GoogleLogin component
- Component handles everything internally via updated GoogleLoginButton

**Before:**
```jsx
<GoogleLogin 
  onSuccess={handleGoogleSuccess}
  buttonText="Sign up with Google"
/>
```

**After:**
```jsx
<GoogleLogin 
  verificationToken={verificationToken}
  buttonText="Sign up with Google"
/>
```

## Backend Support (Already Existed)
The backend already supported verification tokens in OAuth endpoints:

**`backend/src/routes/auth.js` (Google OAuth, lines 729-770):**
```javascript
if (verificationToken) {
  try {
    const tokenData = jwt.verify(verificationToken, process.env.JWT_SECRET);
    if (tokenData.type === "identity_verification") {
      registrationPath = "personal_email";
      instituteRecordId = tokenData.instituteRecordId;
      // Check for duplicates...
    }
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: "Invalid or expired verification token.",
    });
  }
}
```

**`backend/src/routes/auth.js` (LinkedIn OAuth) - UPDATED:**
LinkedIn endpoint was missing verification token support, so it was added to match Google OAuth behavior. Now both providers support the same verification flow.

## Testing Guide

### Test Case 1: Google OAuth with Verification
1. Go to Personal Email Registration
2. **Step 1**: Enter roll number, name, DOB and verify identity
3. **Step 2**: Click "Sign up with Google" (NOT email/password)
4. Complete Google OAuth
5. **Expected Result**: Redirected to `/complete-profile` with form auto-filled and fields locked

### Test Case 2: LinkedIn OAuth with Verification  
1. Go to Personal Email Registration
2. **Step 1**: Enter roll number, name, DOB and verify identity
3. **Step 2**: Click "Sign up with LinkedIn" (if available)
4. Complete LinkedIn OAuth
5. **Expected Result**: Redirected to `/complete-profile` with form auto-filled and fields locked

### Test Case 3: Google OAuth without Verification (Login Page)
1. Go to Login page
2. Click "Login with Google"
3. **Expected Result**: Works normally, no verification token needed

### Test Case 4: Institute Email OAuth (Auto-approved)
1. Go to Institute Email Registration
2. Click "Sign up with Institute Google Account"
3. **Expected Result**: Auto-approved, no verification needed

## Verification Commands

### Check User Account Linking
```bash
cd backend
node check-accounts.js
```

Look for:
- `institute_record_id`: Should NOT be null for verified users
- `registration_path`: Should be "personal_email" for verified OAuth users

### Manual Linking (If Needed)
```bash
cd backend
node link-user-to-record.js
```

Follow prompts to:
1. Select user account
2. Select matching institute record
3. Confirm linking

## Files Modified
1. ✅ `frontend/src/services/google_login.jsx` - Added verification token support
2. ✅ `frontend/src/services/linked_in.jsx` - Added verification token support
3. ✅ `frontend/src/pages/auth/LinkedInCallback.jsx` - Retrieve and pass token
4. ✅ `frontend/src/pages/auth/RegisterPersonalEmail.jsx` - Pass token to OAuth button
5. ✅ `backend/src/routes/auth.js` - Added LinkedIn verification token support (Google already had it)

## What This Fixes
- ✅ Verified users who use OAuth now get auto-filled profile forms
- ✅ Their accounts are properly linked to institute_records
- ✅ Registration path is correctly set to "personal_email"
- ✅ institute_record_id foreign key is properly saved
- ✅ Works for both Google and LinkedIn OAuth

## Next Steps
1. Test the complete flow with a fresh account
2. Consider using `link-user-to-record.js` to fix existing accounts
3. Monitor backend logs during OAuth to verify token is received
