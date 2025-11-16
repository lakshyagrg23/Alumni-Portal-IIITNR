# LinkedIn OAuth Debugging Guide

## Critical Error: Redirect URI Mismatch

**Error Message**: 
```
Unable to retrieve access token: appid/redirect uri/code verifier does not match authorization code
```

**Error Message 2**:
```
The token used in the request has been revoked by the user (REVOKED_ACCESS_TOKEN)
```

---

## Root Causes & Solutions

### 1. ✅ REDIRECT URI MUST BE EXACT

LinkedIn requires the **EXACT SAME** redirect URI in:
- Authorization request (Step 1 - when user clicks login)
- Token exchange request (Step 2 - backend exchanges code for token)

**Fixed**: Hardcoded to `http://localhost:3000/linkedin` in all places

**Verify in LinkedIn Developer Portal**:
1. Go to: https://www.linkedin.com/developers/apps
2. Select your app (Client ID: 86ueer2e98jyit)
3. Click "Auth" tab
4. Under "Authorized redirect URLs for your app", you should see:
   ```
   http://localhost:3000/linkedin
   ```
5. If it shows anything else, UPDATE IT to match exactly

### 2. ✅ AUTHORIZATION CODE IS SINGLE-USE

Authorization codes from LinkedIn can **only be used ONCE**.

**Problem**: React StrictMode in development causes components to mount twice, leading to duplicate API calls.

**Fixed**: Added code deduplication check:
```javascript
const processedCode = sessionStorage.getItem('linkedin_processed_code');
if (processedCode === code) {
  // Already processed, skip
  return;
}
sessionStorage.setItem('linkedin_processed_code', code);
```

### 3. ✅ NO CODE REFRESHING

**Problem**: If user refreshes the page at `/linkedin?code=...`, the code gets reused.

**Solution**: 
- Code is marked as processed in sessionStorage
- On refresh, user is redirected to dashboard instead
- Old codes are rejected by LinkedIn (expired or revoked)

---

## Testing Steps

### Test 1: Fresh Login Flow
1. Clear browser cache and cookies
2. Go to http://localhost:3000/login
3. Click "Login with LinkedIn"
4. Authorize on LinkedIn
5. Should redirect back and login successfully

### Test 2: Verify No Double Execution
1. Open browser console
2. Follow Test 1 steps
3. Check console logs - should see:
   - "LinkedIn authorization code received..."
   - "LinkedIn user data received..."
   - "LinkedIn login successful!"
4. Should NOT see duplicate API calls

### Test 3: Refresh Protection
1. Complete Test 1
2. Copy the callback URL (http://localhost:3000/linkedin?code=...)
3. Open that URL in a new tab
4. Should see "Login already in progress" toast
5. Should redirect to dashboard

---

## Current Configuration

### Frontend (linked_in.jsx)
```javascript
const redirectUri = 'http://localhost:3000/linkedin'; // Hardcoded
sessionStorage.setItem('linkedin_redirect_uri', redirectUri);
```

### Frontend (LinkedInCallback.jsx)
```javascript
const redirectUri = sessionStorage.getItem('linkedin_redirect_uri') || 'http://localhost:3000/linkedin';
// Send to backend
axios.post('/api/auth/linkedin/callback', { code, redirectUri });
```

### Backend (auth.js)
```javascript
const finalRedirectUri = redirectUri || "http://localhost:3000/linkedin";
// Use in token exchange with LinkedIn
```

### Environment Variables
```bash
# Frontend (.env)
VITE_LINKEDIN_CLIENT_ID=
VITE_LINKEDIN_REDIRECT_URI=http://localhost:3000/linkedin

# Backend (.env)
LINKEDIN_CLIENT_ID=
LINKEDIN_CLIENT_SECRET=
LINKEDIN_REDIRECT_URI=http://localhost:3000/linkedin
```

---

## Debug Logging

Backend now logs token exchange details:
```javascript
console.log('LinkedIn token exchange:', {
  code: code.substring(0, 10) + '...',
  redirectUri: finalRedirectUri,
  clientId: process.env.LINKEDIN_CLIENT_ID
});
```

Check backend console for:
- Redirect URI being sent
- Client ID being used
- Error responses from LinkedIn

---

## Common Issues

### Issue: Still getting redirect_uri mismatch
**Solution**: 
1. Check LinkedIn app settings (must be exact)
2. Restart frontend dev server (Vite caches env vars)
3. Clear sessionStorage: `sessionStorage.clear()`

### Issue: REVOKED_ACCESS_TOKEN errors
**Solution**:
1. Don't refresh callback page
2. Wait for full flow to complete
3. Clear sessionStorage and try again
4. Check for React StrictMode double-rendering

### Issue: Code expired
**Solution**:
- Authorization codes expire after ~10 minutes
- Complete the flow quickly after getting code
- Don't reuse old codes

---

## Production Checklist

Before deploying to production:

- [ ] Update redirect URI in LinkedIn app to production domain
- [ ] Update environment variables:
  ```
  VITE_LINKEDIN_REDIRECT_URI=https://yourdomain.com/linkedin
  LINKEDIN_REDIRECT_URI=https://yourdomain.com/linkedin
  ```
- [ ] Update hardcoded URI in `linked_in.jsx`
- [ ] Test complete flow on production
- [ ] Monitor for 500 errors
- [ ] Set up error tracking (Sentry, etc.)

---

## Support Resources

- LinkedIn OAuth Documentation: https://learn.microsoft.com/en-us/linkedin/shared/authentication/authentication
- OpenID Connect with LinkedIn: https://learn.microsoft.com/en-us/linkedin/consumer/integrations/self-serve/sign-in-with-linkedin-v2
- Error Codes: https://learn.microsoft.com/en-us/linkedin/shared/api-guide/concepts/error-handling

---

Last Updated: October 4, 2025
