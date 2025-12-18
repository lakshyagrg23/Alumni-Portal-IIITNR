# 🧪 Quick Test Guide - Encryption Keys

## Test the Fixes Immediately

---

## 1️⃣ Backend Test (2 minutes)

```bash
cd backend

# Check if keys exist in database
node check-encryption-keys.js
```

**Expected Output:**
```
✅ public_keys table exists
👥 Total users: X
🔑 Users with public keys: Y
📈 Key coverage: Z%
```

---

## 2️⃣ Frontend Test - Registration (3 minutes)

### A. Open Browser Console (F12)

### B. Register New Account
1. Go to `/register`
2. Fill form and submit
3. Watch console

**Look for these logs:**
```
[Registration] 🔐 Starting encryption key generation...
[Registration] ✅ Keys generated, public key preview: BH8xK...
[Registration] 🔐 Encrypting private key...
[Registration] ✅ Private key encrypted
```

### C. Check LocalStorage
```javascript
localStorage.getItem('e2e_pub_raw')  // Should return base64 string
localStorage.getItem('e2e_priv_jwk') // Should return base64 string
localStorage.getItem('e2e_decrypt_pw') // Should return your email
```

---

## 3️⃣ Frontend Test - Login (3 minutes)

### A. Clear Keys (to test fetch from server)
```javascript
localStorage.removeItem('e2e_pub_raw')
localStorage.removeItem('e2e_priv_jwk')
localStorage.clear() // or just clear specific keys
```

### B. Login
1. Log in with your account
2. Watch console

**Look for:**
```
[Login] 🔐 Starting encryption key setup...
[Login] 🎯 API Configuration: {...}
[Login] 📡 Fetching encryption keys from server...
```

**If keys exist on server:**
```
[Login] 📦 Keys found on server, decrypting...
[Login] ✅ Encryption keys fetched and decrypted during login
```

**If NO keys on server (404):**
```
[Login] ⚠️ No keys found on server (404), will generate new ones
[Login] 🔑 Generating new encryption keys...
[Login] ✅ New encryption keys generated, uploaded, and stored
```

---

## 4️⃣ Messages Test (2 minutes)

### A. Go to Messages Page
```
/messages
```

### B. Check for Errors

**✅ Good (no banner):**
- Page loads normally
- No red error banner at top

**❌ Bad (error banner visible):**
```
⚠️ Encryption Key Error: [Error message here]
```

### C. Run Debug Command
```javascript
window.debugE2EKeys()
```

**Expected:**
```
🔑 Encryption Keys Debug:
Public Key (first 50 chars): BH8xK...
Private Key exists: true
Decrypt password exists: true
Keys stored in: {
  localStorage: { pub: true, priv: true, pw: true },
  sessionStorage: { pub: true, priv: true, pw: true }
}
```

---

## 5️⃣ End-to-End Messaging Test (5 minutes)

### Setup: Need 2 accounts

**Account A:**
1. Login
2. Go to Messages
3. Start new chat with Account B
4. Send message: "Test from A"

**Account B:**
1. Login
2. Go to Messages
3. Should see conversation from A
4. Reply: "Test from B"

**Both accounts:**
- No error banners
- Messages appear in conversation
- Can send/receive files

---

## 🚨 Common Issues & Quick Fixes

### Issue: API 404 Error

**Check console for:**
```
[Messages] 🔗 Request URL: http://localhost:5000/api/messages/public-key
```

**Fix:**
```bash
# Check .env file
cat frontend/.env

# Should be:
VITE_API_URL=http://localhost:5000
# NOT: http://localhost:5000/api
```

---

### Issue: "No keys found" Error

**Run:**
```bash
node backend/check-encryption-keys.js
```

**If 0% coverage:**
```
All users need to log out and log back in
```

---

### Issue: Can't Decrypt Keys

**Check password:**
```javascript
// In console
localStorage.getItem('e2e_decrypt_pw')
// Should match your email (lowercase)
```

**Fix:**
```javascript
// Clear and re-login
localStorage.clear()
// Then log out and log in again
```

---

## ✅ Success Checklist

After running all tests, you should have:

- [x] Backend shows keys in database
- [x] Registration generates keys (console logs)
- [x] Login fetches/generates keys (console logs)
- [x] Messages page has no error banner
- [x] `window.debugE2EKeys()` shows keys present
- [x] Can send messages between users
- [x] No 404 errors in Network tab

---

## 📊 Quick Metrics

Run these to verify everything:

```bash
# Backend
cd backend
node check-encryption-keys.js | grep "Key coverage"
# Should show: "Key coverage: 100%"

# Frontend (browser console)
window.debugE2EKeys()
# Should show all keys present

# Network (DevTools)
# Filter: "public-key"
# Should see: 200 OK responses
```

---

## 🆘 If All Tests Fail

1. **Check backend is running:**
   ```bash
   curl http://localhost:5000/api/auth/ping
   ```

2. **Check database is running:**
   ```bash
   psql -U postgres -d alumni_portal -c "SELECT COUNT(*) FROM users"
   ```

3. **Check table exists:**
   ```bash
   psql -U postgres -d alumni_portal -c "SELECT COUNT(*) FROM public_keys"
   ```

4. **Run migration if needed:**
   ```bash
   psql -U postgres -d alumni_portal -f database/migrations/001_messaging_essential.sql
   ```

---

## ⏱️ Total Test Time: ~15 minutes

**Quick Version (5 min):**
1. Backend check
2. Login test
3. Messages page check
4. `window.debugE2EKeys()` run

**Full Version (15 min):**
- All 5 tests above
- Cross-device test
- Database verification

---

**Good luck! 🚀**
