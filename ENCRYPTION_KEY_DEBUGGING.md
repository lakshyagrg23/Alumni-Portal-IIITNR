# 🔐 Encryption Key Debugging Guide

## Overview

This guide helps you diagnose and fix encryption key issues in the IIIT Naya Raipur Alumni Portal messaging system.

---

## 🐛 Common Issues & Solutions

### Issue 1: "No encryption keys found on server"

**Symptoms:**
- Error message in Messages page
- Cannot send or receive encrypted messages
- Console shows 404 when fetching keys

**Root Causes:**
1. User registered before key generation was implemented
2. Keys were never created during registration/login
3. Database table `public_keys` is missing or empty

**Solution:**
```bash
# 1. Check if keys exist
cd backend
node check-encryption-keys.js

# 2. If table is missing, run migration
psql -U postgres -d alumni_portal -f ../database/migrations/001_messaging_essential.sql

# 3. User must log out and log back in to generate keys
```

**What happens during login:**
1. Frontend checks localStorage for keys
2. If not found, fetches from backend `/api/messages/public-key`
3. If 404, generates new keys automatically
4. Keys are encrypted with user's email and uploaded

---

### Issue 2: "Failed to decrypt keys"

**Symptoms:**
- Keys exist in database but can't be decrypted
- Error: "Could not unlock your encryption keys"

**Root Causes:**
1. Encryption password changed
2. Keys encrypted with different password than stored
3. Corrupted encryption data

**Solution:**
```bash
# User must re-login with the original email/password used when keys were created
# Or generate new keys (will lose access to old messages)
```

**Manual Key Reset (if needed):**
```sql
-- Delete old keys for user
DELETE FROM public_keys WHERE user_id = 'USER_ID_HERE';

-- User logs in again → new keys generated automatically
```

---

### Issue 3: API URL mismatch

**Symptoms:**
- Console shows 404 or network errors
- URL looks like `http://localhost:5000/5000/api/messages/public-key`
- Or missing `/api` prefix

**Root Cause:**
- `VITE_API_URL` includes `/api` when it shouldn't
- Or code adds `/api` twice

**Solution:**
```bash
# frontend/.env
# ✅ CORRECT:
VITE_API_URL=http://localhost:5000

# ❌ WRONG:
VITE_API_URL=http://localhost:5000/api
```

**Code automatically adds `/api`:**
```javascript
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000'
const API = `${API_BASE}/api`
// Result: http://localhost:5000/api
```

---

## 🔍 Debugging Steps

### Step 1: Check Browser Console

Open browser DevTools (F12) and look for:

**✅ Good signs:**
```
[Login] 🔐 Starting encryption key setup...
[Login] 📡 Fetching encryption keys from server...
[Login] ✅ Encryption keys fetched and decrypted during login
```

**❌ Bad signs:**
```
[Login] ❌ Key fetch failed: 404
[Messages] ❌ Failed to fetch keys from server
[Messages] ❌ No encryption keys available
```

### Step 2: Run Debug Function

In browser console, type:
```javascript
window.debugE2EKeys()
```

**Output:**
```
🔑 Encryption Keys Debug:
Public Key (first 50 chars): BH8xK...
Private Key exists: true
Decrypt password exists: true
Keys stored in: {...}
```

### Step 3: Check Backend Database

```bash
cd backend
node check-encryption-keys.js
```

**Expected output:**
```
✅ public_keys table exists
👥 Total users: 10
🔑 Users with public keys: 8
🔐 Users with encrypted private keys: 8
📈 Key coverage: 80.0%
```

### Step 4: Check Network Requests

In DevTools → Network tab:

**Look for:**
- `GET /api/messages/public-key` → Should return 200 or 404
- `POST /api/messages/public-key` → Should return 200 with `{success: true}`

**Check:**
- ✅ Authorization header present: `Bearer eyJ...`
- ✅ Response has `data.public_key` and `data.encrypted_private_key`
- ❌ 401 = Token expired/invalid
- ❌ 404 = No keys for user
- ❌ 500 = Server error

---

## 🔧 Manual Fixes

### Fix 1: Generate Keys for Existing User

```javascript
// In browser console (while logged in)
(async () => {
  const crypto = await import('/src/utils/crypto.js');
  const keyPair = await crypto.generateKeyPair();
  const publicKey = await crypto.exportPublicKey(keyPair.publicKey);
  const privateKey = await crypto.exportPrivateKey(keyPair.privateKey);
  
  // Get user email
  const email = 'user@example.com'; // Replace with actual email
  const encryptedPrivKey = await crypto.encryptPrivateKeyWithPassword(privateKey, email.toLowerCase());
  
  // Store locally
  localStorage.setItem('e2e_pub_raw', publicKey);
  localStorage.setItem('e2e_priv_jwk', privateKey);
  localStorage.setItem('e2e_decrypt_pw', email.toLowerCase());
  
  // Upload to server
  const token = localStorage.getItem('token');
  const API = 'http://localhost:5000/api';
  
  const response = await fetch(`${API}/messages/public-key`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      publicKey,
      encryptedPrivateKey: JSON.stringify(encryptedPrivKey)
    })
  });
  
  console.log('Upload result:', await response.json());
})();
```

### Fix 2: Clear All Keys and Start Fresh

```javascript
// In browser console
localStorage.removeItem('e2e_pub_raw');
localStorage.removeItem('e2e_priv_jwk');
localStorage.removeItem('e2e_decrypt_pw');
sessionStorage.removeItem('e2e_pub_raw');
sessionStorage.removeItem('e2e_priv_jwk');
sessionStorage.removeItem('e2e_decrypt_pw');

console.log('✅ Keys cleared. Please log out and log back in.');
```

---

## 📊 Key Generation Flow

### During Registration:

```
1. User submits registration form
   ↓
2. Backend creates user account
   ↓
3. Frontend generates ECDH key pair
   ↓
4. Public key exported as base64
   ↓
5. Private key exported as JWK, encrypted with user's email
   ↓
6. Keys stored in localStorage
   ↓
7. If auto-approved (OAuth), upload to backend immediately
   ↓
8. Backend stores in public_keys table
```

### During Login:

```
1. User logs in successfully
   ↓
2. Check localStorage for keys
   ↓
3. If found → Import and use them
   ↓
4. If not found → Fetch from backend
   ↓
5. If 404 → Generate new keys (same as registration)
   ↓
6. If 200 → Decrypt with user's email, store locally
```

### During Messaging:

```
1. Load local keys from localStorage
   ↓
2. Upload public key to backend (if not already there)
   ↓
3. Fetch recipient's public key
   ↓
4. Derive shared secret using ECDH
   ↓
5. Derive AES-GCM key from shared secret
   ↓
6. Encrypt/decrypt messages with AES-GCM
```

---

## 🧪 Testing Checklist

### Test 1: New User Registration
- [ ] Register new account
- [ ] Check console for key generation logs
- [ ] Check localStorage has `e2e_pub_raw` and `e2e_priv_jwk`
- [ ] Run `node check-encryption-keys.js` to verify database entry

### Test 2: Existing User Login
- [ ] Log in with existing account
- [ ] Check console for key fetch/generation logs
- [ ] Verify no errors in console
- [ ] Run `window.debugE2EKeys()` to check keys

### Test 3: Send Message
- [ ] Navigate to Messages page
- [ ] No error banner displayed
- [ ] Can select a conversation
- [ ] Can send a message
- [ ] Message appears encrypted in database

### Test 4: Cross-Device
- [ ] Log in on Device A → Generate keys
- [ ] Log in on Device B with same account
- [ ] Keys should be fetched and decrypted
- [ ] Can read messages sent from Device A

---

## 📝 Error Messages Explained

| Error Message | Cause | Solution |
|--------------|-------|----------|
| "No encryption keys found on server" | User never generated keys | Log out and log in again |
| "Failed to decrypt server keys" | Wrong password/corrupted data | Clear keys and log in again |
| "Encryption keys not found. Please log out and log back in" | localStorage cleared or expired | Log out and log in |
| "Failed to retrieve encryption keys (404)" | Backend has no keys for user | Keys will auto-generate on login |
| "Failed to retrieve encryption keys (500)" | Backend error | Check backend logs and database |

---

## 🎯 Success Indicators

**✅ Everything working correctly:**

1. **Console logs during login:**
   ```
   [Login] 🔐 Starting encryption key setup...
   [Login] ✅ Keys generated, public key preview: BH8xK...
   [Login] ✅ Private key encrypted
   [Login] 📤 Uploading keys to server...
   [Login] ✅ Keys uploaded successfully
   ```

2. **Browser storage:**
   - `localStorage.getItem('e2e_pub_raw')` → base64 string (~88 chars)
   - `localStorage.getItem('e2e_priv_jwk')` → base64 encoded JWK
   - `localStorage.getItem('e2e_decrypt_pw')` → user's email

3. **Database check:**
   ```bash
   node check-encryption-keys.js
   # Shows 100% key coverage
   ```

4. **Messages page:**
   - No error banner
   - Can send and receive messages
   - Console shows encryption/decryption logs

---

## 🆘 Getting Help

If issues persist:

1. **Collect diagnostic info:**
   ```bash
   # In browser console
   window.debugE2EKeys()
   
   # In backend
   cd backend
   node check-encryption-keys.js
   ```

2. **Check logs:**
   - Browser console (F12)
   - Backend terminal output
   - Network tab for API requests

3. **Provide details:**
   - Error messages (exact text)
   - Console logs
   - Steps to reproduce
   - Database status from `check-encryption-keys.js`

---

## 🔄 Key Rotation (Future Enhancement)

Currently, keys are generated once and never rotated. To implement key rotation:

1. Keep old keys for decrypting old messages
2. Generate new keys periodically
3. Store multiple key versions per user
4. Include key version in message metadata

This is not implemented yet but can be added if needed.

---

## 📚 Related Files

**Frontend:**
- `frontend/src/utils/crypto.js` - Encryption utilities
- `frontend/src/context/AuthContext.jsx` - Key generation during auth
- `frontend/src/pages/Messages.jsx` - Key usage for messaging

**Backend:**
- `backend/src/routes/messages.js` - Public key endpoints
- `backend/src/models/PublicKey.js` - Database model
- `backend/check-encryption-keys.js` - Diagnostic script

**Database:**
- `database/migrations/001_messaging_essential.sql` - Creates public_keys table
- Table: `public_keys` (user_id, public_key, encrypted_private_key)

---

**Last Updated:** December 17, 2025
