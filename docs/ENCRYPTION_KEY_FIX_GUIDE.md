# Encryption Key Restoration Issue - Debugging & Fix Guide

## Problem Description

When users:
1. Log out and log back in
2. Log in on a different browser

They see "Encrypted message (failed to decrypt)" for previously sent/received messages.

## Root Cause Analysis

The encryption system uses **password-based key derivation**:
1. Private key is encrypted with: `email.toLowerCase()`
2. When user logs out, all keys are cleared from localStorage
3. When user logs back in, the system:
   - Fetches encrypted keys from server
   - Tries to decrypt with `email.toLowerCase()`
   - If successful, decryption works; if failed, generates new keys

**The Issue**: 
- If the encryption password (email) changes between logins, old messages can't be decrypted
- This can happen if:
  - User changes their email
  - OAuth provider returns different email casing
  - Old messages were encrypted with a different password

## Current Flow

### On Login (AuthContext.jsx lines 195-310):
```javascript
1. Check localStorage for keys
2. If not found:
   - Fetch encrypted keys from server
   - Decrypt with credentials.email.toLowerCase()
   - Store decrypted keys in localStorage
```

### On Logout (AuthContext.jsx line 485):
```javascript
localStorage.removeItem('e2e_priv_jwk')
localStorage.removeItem('e2e_pub_raw')
localStorage.removeItem('e2e_decrypt_pw')
sessionStorage.removeItem('e2e_priv_jwk')
sessionStorage.removeItem('e2e_pub_raw')
```

## Debugging Steps

### Step 1: Check Console Logs
1. Open browser DevTools (F12)
2. Go to **Console** tab
3. Log out and log back in
4. Look for messages like:
   - `✅ Keys found on server, decrypting...`
   - `❌ Failed to decrypt server key`
   - `🔄 Generating new encryption keys`

### Step 2: Verify Email Used for Encryption
```javascript
// In console
const token = localStorage.getItem('token');
const parts = token.split('.');
const payload = JSON.parse(atob(parts[1]));
console.log('Verified email from JWT:', payload.email);

// This email should match the password used to encrypt old messages
```

### Step 3: Check Public Key Upload
1. Open DevTools → Network tab
2. Log in
3. Look for POST request to `/api/messages/public-key`
4. Check response - should see `success: true`

### Step 4: Check Key Decryption
```javascript
// In console
const pub = localStorage.getItem('e2e_pub_raw');
const priv = localStorage.getItem('e2e_priv_jwk');
console.log('Keys after login:', { pub: !!pub, priv: !!priv });
```

---

## The Fix

The issue is likely that **the encryption password is not being consistently set on login**. Fix:

### Step 1: Improve Password Storage on Login

In `backend/src/context/AuthContext.jsx`, after successful decryption on login, add:

```javascript
// User LOGIN (after successful key decryption)
const encryptionPassword = response.user.email.toLowerCase()  // Use server-verified email, not client input
localStorage.setItem('e2e_decrypt_pw', encryptionPassword)
sessionStorage.setItem('e2e_decrypt_pw', encryptionPassword)
```

### Step 2: Use Verified Email from Backend

Change this line (line 289-290):
```javascript
// OLD - uses client-provided input
const encryptionPassword = credentials.email.toLowerCase()
```

To:
```javascript
// NEW - uses verified email from JWT
const encryptionPassword = response.user?.email?.toLowerCase() || credentials.email.toLowerCase()
```

### Step 3: Add Migration for Old Keys

For users whose old messages were encrypted with different email casing:

```javascript
/**
 * Try decryption with multiple password variations:
 * 1. Current verified email
 * 2. Original credential email  
 * 3. Email from old localStorage
 */
const tryDecryptWithPasswords = async (encryptedData, passwords) => {
  for (const pwd of passwords) {
    try {
      return await crypto.decryptPrivateKeyWithPassword(encryptedData, pwd);
    } catch (e) {
      console.log(`Decryption attempt failed with: ${pwd}`);
    }
  }
  throw new Error('Could not decrypt with any password variation');
};
```

---

## Recommended Fix Code

Add this to `frontend/src/context/AuthContext.jsx` at line 285 (in login keyboard input):

```javascript
// Generate new encryption keys if decryption fails
} else if (keyData.success && keyData.data?.encrypted_private_key && keyData.data?.public_key) {
  console.log('[Login] Keys found on server, attempting decryption...');
  
  // Use VERIFIED email from backend response, not client input
  const encryptionPassword = response.user?.email?.toLowerCase();
  if (!encryptionPassword) {
    throw new Error('Cannot determine encryption password - no email from server');
  }
  
  const encryptedData = JSON.parse(keyData.data.encrypted_private_key);
  
  try {
    // Try current email
    const decryptedPrivKey = await crypto.decryptPrivateKeyWithPassword(
      encryptedData,
      encryptionPassword
    );
    
    storedPriv = decryptedPrivKey;
    storedPub = keyData.data.public_key;
    
    // Store decrypted keys locally
    localStorage.setItem('e2e_priv_jwk', storedPriv);
    localStorage.setItem('e2e_pub_raw', storedPub);
    sessionStorage.setItem('e2e_priv_jwk', storedPriv);
    sessionStorage.setItem('e2e_pub_raw', storedPub);
    
    // IMPORTANT: Store password using verified email
    sessionStorage.setItem('e2e_decrypt_pw', encryptionPassword);
    localStorage.setItem('e2e_decrypt_pw', encryptionPassword);
    
    console.log('[Login] ✅ Encryption keys decrypted with verified email:', encryptionPassword);
  } catch (decryptErr) {
    console.warn('[Login] ⚠️ Failed to decrypt with verified email, attempting with credential email...');
    
    // Fallback: try with the email user input during login
    const fallbackPassword = credentials.email.toLowerCase();
    try {
      const decryptedPrivKey = await crypto.decryptPrivateKeyWithPassword(
        encryptedData,
        fallbackPassword  
      );
      
      console.log('[Login] ✅ Decrypted with credential email (will regenerate keys next time)');
      // Keys work with old password - will rotate on next Messages page visit
    } catch (finalErr) {
      console.error('[Login] ❌ Could not decrypt keys with either password, generating new ones');
      // Trigger key regeneration (see line 315+)
    }
  }
}
```

---

## Testing the Fix

### Before Fix
1. User logs in as `test@example.com` (OAuth might use different casing)
2. Messages show "Encrypted message (failed to decrypt)"

### After Fix
1. User logs in
2. Encryption password is derived from `response.user.email` (server-verified)
3. Old messages decrypt correctly
4. If old password differs, new keys are generated for future messages

---

## Additional Improvements

### Store Non-Destroyable Password

Don't clear `e2e_decrypt_pw` on logout - instead reconstruct it from email on login:

```javascript
// Current logout (line 485)
logout = () => {
  localStorage.removeItem('token')
  // Keep these for offline use:
  // localStorage.removeItem('e2e_decrypt_pw')  // DON'T remove
  
  // Remove only keys that need to be re-downloaded
  localStorage.removeItem('e2e_priv_jwk')
  localStorage.removeItem('e2e_pub_raw')
  sessionStorage.removeItem('e2e_priv_jwk')
  sessionStorage.removeItem('e2e_pub_raw')
  sessionStorage.removeItem('e2e_decrypt_pw')
}
```

This way, if the password is needed for decryption before next login, it's still available.

---

## Implementation Plan

1. Update AuthContext.jsx to use `response.user.email` for encryption password
2. Add fallback password attempts
3. Test with different email casings (gmail.com vs Gmail.com)
4. Verify old messages decrypt after login
5. Ensure new keys are properly rotated if needed
