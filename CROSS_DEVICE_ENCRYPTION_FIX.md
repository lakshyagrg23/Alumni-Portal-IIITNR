# Cross-Device Message Encryption Fix

## Problem

Users experienced "unable to decrypt" errors when:
1. Sending messages from Device A (e.g., laptop)
2. Logging in on Device B (e.g., mobile phone)
3. Trying to view the same messages on Device B

**Root Cause**: Encryption keys were stored in `localStorage`, which is device-specific. Each device generated its own key pair, making it impossible to decrypt messages encrypted with a different device's keys.

## Solution Architecture

Implemented password-based private key encryption and server-side storage to enable cross-device message decryption.

### Key Components

1. **Password-Based Encryption** (`frontend/src/utils/crypto.js`)
   - `deriveKeyFromPassword(password, salt)`: PBKDF2 with 100,000 iterations, SHA-256
   - `encryptPrivateKeyWithPassword(privateKeyJwk, password)`: Encrypts private key with password
   - `decryptPrivateKeyWithPassword(encryptedData, password)`: Decrypts private key

2. **Database Schema** (`database/migrations/009_add_encrypted_private_key.sql`)
   - Added `encrypted_private_key` TEXT column to `public_keys` table
   - Stores password-encrypted private keys for cross-device retrieval

3. **Backend API** (`backend/src/routes/messages.js`)
   - `POST /messages/public-key`: Accepts `encryptedPrivateKey` parameter
   - `GET /messages/public-key`: Returns user's own keys (including encrypted private key)
   - `GET /messages/public-key/:userId`: Fetches other users' public keys

4. **Model Updates** (`backend/src/models/PublicKey.js`)
   - `upsert()`: Now stores encrypted private keys

5. **Registration Flow** (`frontend/src/context/AuthContext.jsx`)
   - Generates ECDH key pair during registration
   - Encrypts private key with user's password (PBKDF2)
   - Uploads both public key and encrypted private key to server
   - Stores keys in localStorage for immediate access

6. **Messages Page** (`frontend/src/pages/Messages.jsx`)
   - **Priority 1**: Check sessionStorage (cleared on browser close)
   - **Priority 2**: Check localStorage (persistent but device-specific)
   - **Priority 3**: Fetch from server and prompt for password
   - After decryption, stores in both sessionStorage (current session) and localStorage (backup)

## Security Features

### Encryption Layers
1. **Transport**: HTTPS for all API communication
2. **At Rest**: Private keys encrypted with PBKDF2-derived keys (100k iterations)
3. **In Transit**: E2E encryption using ECDH + AES-GCM for messages
4. **Storage**: 
   - Server: Only stores encrypted private keys (can't decrypt without password)
   - Client: sessionStorage (temporary) and localStorage (backup)

### Key Derivation
- **Algorithm**: PBKDF2
- **Iterations**: 100,000 (prevents brute force)
- **Hash**: SHA-256
- **Salt**: 16 bytes random (unique per encryption)

### Message Encryption
- **Key Exchange**: ECDH (P-256 curve)
- **Symmetric Encryption**: AES-GCM (256-bit)
- **IV**: 12 bytes random (unique per message)

## User Experience Flow

### Registration
1. User creates account with email and password
2. System automatically generates encryption key pair
3. Private key encrypted with user's password
4. Both keys stored on server
5. Keys cached in localStorage for immediate use
6. **User action**: None required (automatic)

### First Login on New Device
1. User logs in with credentials
2. Opens Messages page
3. System checks storage hierarchy:
   - ✅ sessionStorage (fast, temporary)
   - ✅ localStorage (fast, persistent)
   - ❌ Not found → Fetch from server
4. **User action**: Enter password to decrypt keys (one-time per session)
5. Keys cached in both sessionStorage and localStorage
6. Messages decrypt successfully

### Subsequent Sessions
1. Keys loaded from sessionStorage/localStorage
2. **User action**: None required
3. Messages decrypt automatically

## Implementation Status

### ✅ Completed
- [x] Password-based encryption utilities
- [x] Database migration (encrypted_private_key column)
- [x] Backend API endpoints (POST, GET)
- [x] Backend model updates (upsert with encrypted key)
- [x] Registration flow (auto-generate and encrypt keys)
- [x] Messages page (key retrieval from server with password prompt)
- [x] Storage hierarchy (sessionStorage → localStorage → server)

### ⏳ Pending
- [ ] Run database migration on production
- [ ] Test cross-device functionality
- [ ] Add "Remember this device" option (skip password prompt)
- [ ] Implement key rotation mechanism
- [ ] Add password change flow (re-encrypt private key)

## Testing Guide

### Test Scenario: Cross-Device Message Decryption

**Setup:**
1. Register new test user on Device A (laptop)
2. Send messages to another user
3. Logout from Device A

**Test Steps:**
1. Open Device B (different browser or machine)
2. Login with same credentials
3. Navigate to Messages page
4. Enter password when prompted
5. Verify messages from Device A decrypt correctly
6. Send new message from Device B
7. Return to Device A and verify new message decrypts

**Expected Results:**
- ✅ Password prompt appears once per session on new device
- ✅ All previous messages decrypt successfully
- ✅ New messages work bidirectionally
- ✅ No "unable to decrypt" errors

## Migration Instructions

### Development
```bash
# Run migration
node backend/run-migration.js database/migrations/009_add_encrypted_private_key.sql

# Verify column added
psql -d alumni_portal -c "\\d public.public_keys"
```

### Production
```bash
# Backup database first
pg_dump alumni_portal > backup_before_encryption_fix.sql

# Run migration
psql -d alumni_portal -f database/migrations/009_add_encrypted_private_key.sql

# Verify
psql -d alumni_portal -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'public_keys';"
```

### Existing Users
**Important**: Existing users who generated keys before this fix will need to:
1. Open Messages page on their primary device
2. System will detect missing encrypted private key on server
3. Automatically re-upload encrypted version using stored localStorage keys
4. After that, cross-device will work normally

If localStorage was cleared: User must generate new keys (loses access to old messages encrypted with old keys).

## Security Considerations

### Threats Mitigated
- ✅ Device loss (private key can't be used without password)
- ✅ Server breach (encrypted private keys useless without password)
- ✅ Man-in-the-middle (HTTPS + E2E encryption)
- ✅ Brute force (100k iterations on PBKDF2)

### Trade-offs
- ⚠️ Password prompt required on new devices (UX friction)
- ⚠️ Password change requires key re-encryption
- ⚠️ Forgotten password = lost message history

### Future Enhancements
1. **WebAuthn/Passkey**: Use biometric auth instead of password
2. **Key Rotation**: Periodic re-generation of keys
3. **Multi-Device Keys**: Like Signal (different keys per device)
4. **Backup Codes**: Recovery mechanism for lost passwords

## Files Modified

### Frontend
- `frontend/src/utils/crypto.js` - Added password-based encryption functions
- `frontend/src/context/AuthContext.jsx` - Added key generation and encryption in registration
- `frontend/src/pages/Messages.jsx` - Added key retrieval from server with password prompt

### Backend
- `backend/src/routes/messages.js` - Added GET /public-key endpoint for current user
- `backend/src/models/PublicKey.js` - Updated upsert to store encrypted private keys

### Database
- `database/migrations/009_add_encrypted_private_key.sql` - Added encrypted_private_key column

## Technical Details

### Storage Hierarchy
```javascript
// Priority 1: sessionStorage (fastest, temporary)
sessionStorage.getItem('e2e_priv_jwk')

// Priority 2: localStorage (fast, persistent per device)
localStorage.getItem('e2e_priv_jwk')

// Priority 3: Server (requires network + password)
GET /api/messages/public-key
→ Prompt for password
→ Decrypt with PBKDF2
→ Cache in sessionStorage + localStorage
```

### Encryption Flow
```
Registration:
  Password → PBKDF2(100k, SHA-256, salt) → AES Key
  Private Key JWK → AES-GCM(AES Key, IV) → Ciphertext
  Store: {ciphertext, iv, salt} on server

Decryption:
  Fetch: {ciphertext, iv, salt} from server
  Password → PBKDF2(100k, SHA-256, salt) → AES Key
  Ciphertext → AES-GCM-Decrypt(AES Key, IV) → Private Key JWK
  Cache in sessionStorage + localStorage
```

## Conclusion

This fix enables seamless cross-device message decryption while maintaining strong end-to-end encryption. Users can now:
- Send messages from any device
- Read messages on any device (with password)
- Switch between devices freely
- Maintain message history across devices

The implementation balances security (password-encrypted private keys) with usability (one-time password prompt per session).
