# Messaging 404 Error - Root Cause and Fix

## Date: October 6, 2025

## 🔍 Problem Analysis

### Issue Reported

```
Failed to load resource: the server responded with a status of 404 (Not Found)
:5000/api/messages/public-key/9941ad6d-cb55-488b-8429-79ff4d41ea03
```

### Root Causes Identified

#### 1. **Missing Public Keys in Database**

- Users were trying to send messages to recipients who didn't have public keys
- Only 3 out of 14 users had public keys in the database
- Some existing keys were dummy/invalid "sample*public_key*" strings

#### 2. **Frontend Key Upload Logic Flaw**

The original code only uploaded public keys when **generating new keys**, not when **loading existing keys** from localStorage:

```javascript
// OLD CODE - BUGGY
if (storedPriv && storedPub) {
  // Load existing keys
  kp = { privateKey, publicKey }
  // ❌ No upload to server!
} else {
  // Generate new keys
  kp = await crypto.generateKeyPair()
  // ✅ Upload to server (but URL was wrong!)
  await axios.post('/api/messages/public-key', ...)
}
```

**Problem**: If a user visited Messages page before, their keys were in localStorage but never uploaded to the server because:

1. The first visit had wrong API URLs (`/api/api/...`)
2. Subsequent visits would skip upload since keys existed in localStorage

#### 3. **Invalid Dummy Keys**

- Seed data and temporary fixes added invalid keys like `sample_public_key_9941ad6d...`
- These caused `InvalidCharacterError: Failed to execute 'atob'` when trying to decode
- Real keys must be base64-encoded ECDH P-256 public keys (65 bytes raw)

## ✅ Solutions Implemented

### 1. **Fixed Frontend Key Upload Logic**

Modified `Messages.jsx` to **always upload** public keys on page load:

```javascript
// NEW CODE - FIXED
let publicKeyBase64 = null;

if (storedPriv && storedPub) {
  // Load existing keys
  kp = { privateKey, publicKey };
  publicKeyBase64 = storedPub; // ✅ Store for upload
} else {
  // Generate new keys
  kp = await crypto.generateKeyPair();
  publicKeyBase64 = pub;
  localStorage.setItem("e2e_pub_raw", pub);
  localStorage.setItem("e2e_priv_jwk", priv);
}

// ✅ Always upload public key to server (in case it's missing or outdated)
if (publicKeyBase64) {
  await axios.post(`${VITE_API_URL}/messages/public-key`, {
    publicKey: publicKeyBase64,
  });
}
```

### 2. **Cleaned Up Invalid Keys**

- Created `clear-invalid-keys.js` script
- Removed all dummy/invalid public keys from database
- Left only 1 valid key: `l5grg23@gmail.com`
- All other users will generate fresh keys when they visit Messages page

### 3. **Fixed API URL Paths** (Previous fix)

- Changed from `${VITE_API_URL}/api/messages/...` → `${VITE_API_URL}/messages/...`
- Reason: `VITE_API_URL=http://localhost:5000/api` already includes `/api`

## 🎯 Current State

### Database

```sql
-- Only 1 valid public key remains
user_id: 166899cc-c123-4777-8e7c-32354cf2379b
email: l5grg23@gmail.com
public_key: BMciPyyUHZOo6GCcBNA+w3T+... (valid ECDH P-256)
```

### What Happens Now

1. **First-time users**: Generate keys → Store in localStorage → Upload to server
2. **Returning users**: Load from localStorage → **Upload to server** (NEW!)
3. **Invalid key users**: Keys deleted → Will regenerate on next Messages page visit

## 🧪 Testing Steps

### For User Without Public Key

1. Clear browser localStorage (Application → Local Storage → Clear)
2. Refresh Messages page
3. Check console for: `✅ Public key uploaded successfully`
4. Verify in database: Should have new entry in `public_keys` table

### For Messaging Between Users

1. Both sender and receiver must visit Messages page first (to generate keys)
2. Try sending a message
3. Should encrypt successfully and send via Socket.io
4. Should NOT see 404 errors or `atob` errors

## 📝 Files Changed

1. **frontend/src/pages/Messages.jsx** (lines 37-69)

   - Added `publicKeyBase64` variable
   - Moved public key upload outside of the conditional blocks
   - Now uploads on every page load

2. **backend/clear-invalid-keys.js** (new file)

   - Script to clean up invalid/dummy public keys
   - Can be run anytime to verify key integrity

3. **backend/check-public-keys-issue.js** (new file)
   - Diagnostic script to check user public key status
   - Helps debug messaging issues

## 🔐 Encryption Flow

### Key Generation (ECDH P-256)

```
1. Browser: crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' })
2. Export public key as raw bytes (65 bytes)
3. Base64 encode: btoa(String.fromCharCode(...bytes))
4. Store in localStorage + Upload to server
```

### Message Encryption (AES-GCM)

```
1. Fetch recipient's public key from server
2. Derive shared secret: ECDH(my_private, their_public)
3. Derive AES-GCM key: HKDF(shared_secret)
4. Encrypt message: AES-GCM-256(plaintext, random_iv)
5. Send: { ciphertext, iv, metadata }
```

### Message Decryption

```
1. Fetch sender's public key from server
2. Derive shared secret: ECDH(my_private, their_public)
3. Derive AES-GCM key: HKDF(shared_secret)
4. Decrypt: AES-GCM-256(ciphertext, iv) → plaintext
```

## 🚀 Next Steps

### Immediate

1. ✅ Frontend fix deployed
2. ✅ Invalid keys cleaned
3. 🔄 **User action required**: Visit Messages page to generate/upload keys

### Future Improvements

1. **Add UI indicator** when public key is missing
2. **Batch key fetch** for conversation list
3. **Key rotation** mechanism
4. **Backup/recovery** flow for lost keys
5. **Better error messages** for crypto failures

## ⚠️ Important Notes

- **Keys are device-specific**: Different browsers/devices have different keys
- **Lost keys = lost messages**: Private keys in localStorage cannot decrypt old messages if cleared
- **No server-side decryption**: Server never sees plaintext (E2E encryption)
- **Public keys are public**: No security issue if exposed
- **Private keys must stay private**: Never upload or share private keys

---

**Status**: ✅ **FIXED** - All users must refresh Messages page once to upload their public keys
