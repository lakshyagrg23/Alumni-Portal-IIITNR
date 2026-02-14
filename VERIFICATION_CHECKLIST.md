# Quick Verification Checklist

## After deploying the fix, run these tests:

### ✅ Test 1: Basic Multi-Account (5 minutes)
```bash
1. Log in as Account A
   - Send message to Account B
   - Verify message decrypts (shows content, not error)
   
2. Log out completely
   - Close tab/browser if possible
   
3. Log in as Account C (different user)
   - Open conversation with Account B or D
   - Verify message decrypts
   
4. Log out
5. Log in back to Account A
   - Check old message with Account B still decrypts
   
Expected: ✅ All messages decrypt without errors
```

### ✅ Test 2: Rapid Account Switching (3 minutes)
```bash
1. Log in as User 1
2. Send message to User X → Verify decrypts
3. Log out
4. Log in as User 2
5. Send message to User X → ✅ Should decrypt (was failing)
6. Log out
7. Log in as User 3
8. Send message to User X → ✅ Should decrypt
9. Log out
10. Log in back to User 1
11. Open conversation with User X → ✅ All messages readable

Expected: ✅ No "failed to decrypt" errors during switches
```

### ✅ Test 3: DevTools Verification (2 minutes)
```javascript
// Open browser console (F12)
// In Messages page, run:

// Check cache structure:
console.log(conversationKeysRef.current)

// ✅ Good: Cache keys include both users
// Key format: "user123:user456"

// ❌ Bad: Cache keys are only recipient ID
// Key format: "user456"
```

### ✅ Test 4: Error Logging
```javascript
// Open console, filter for:
"Decrypt failed (realtime)"

// If you see it after logout/login:
// Check debug object:
{
  "usedSnapshot": true,  // Should be TRUE
  "from": "...",
  "err": "..."  // Error message
}

// Expected: This should be RARE after fix
// Before fix: Happened frequently on account switches
```

### ✅ Test 5: Production Scenario
```bash
# Simulate real user behavior:
1. Morning: Log in to Account A (student account)
   - Send homework message
   - Chat works fine
   
2. Afternoon: Log in to Account B (alumni account)
   - See old messages from morning? 
   - ❌ Should NOT see them (different accounts)
   - Send message to alumni contact
   - ✅ Should decrypt properly
   
3. Evening: Switch back to Account A
   - Morning messages still there?
   - ✅ Should still decrypt
   
Expected: ✅ No cross-account leakage, no decryption failures
```

## If You Still See "Encrypted message (failed to decrypt)"

### Quick Diagnostics
```javascript
// In browser console, run:

// 1. Check if refs are cleared
console.log('Refs cleared?', !window.localKeysRef?.current)

// 2. Check cache key format
console.log('Cache keys:', Array.from(conversationKeysRef.current.keys()))
// Should see: ["user123:recipient456", "user789:recipient456"]
// NOT: ["recipient456"]

// 3. Check if keys are in storage
console.log({
  privKey: !!localStorage.getItem('e2e_priv_jwk'),
  pubKey: !!localStorage.getItem('e2e_pub_raw'),
  pw: !!localStorage.getItem('e2e_decrypt_pw')
})
// All three should be true

// 4. Check console for error patterns
// Should NOT see: "Using cached conversation key for user: <id>"
// SHOULD see: "Using cached conversation key for: user123:user456"
```

### If Cache Format Is Wrong
```javascript
// If still seeing old format: "user456"
// Instead of: "user123:user456"

// Means: Frontend changes didn't deploy properly
// Fix: 
// 1. Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
// 2. Clear browser cache
// 3. Redeploy frontend if caching issue persists
```

## Deployment Checklist

- [ ] Frontend code deployed with new cache key format
- [ ] Backend still works (backward compatible)
- [ ] No console errors on login/logout
- [ ] Can send/receive messages
- [ ] Can switch between accounts without decryption errors
- [ ] Old conversations still readable after logout/login

## Expected Log Messages

### Good Signs (After Fix)
```
✅ Message encrypted
✅ Sender public key exported for snapshot
✅ Using cached conversation key for: user123:user456
✅ Message decrypted!
✅ cleanup: cleared all cached encryption keys
```

### Bad Signs (Before Fix)
```
❌ Decrypt failed (realtime). debug=
❌ Failed to derive aes from snapshot public key
❌ Using cached conversation key for user: <id>  // Wrong format
❌ AES key derivation mismatch
```

## Timeline for Testing

| Phase | Duration | Action |
|-------|----------|--------|
| Phase 1 | 5 min | Test 1: Basic multi-account |
| Phase 2 | 3 min | Test 2: Rapid switching |
| Phase 3 | 2 min | Test 3: DevTools verify |
| Phase 4 | 2 min | Test 4: Error logging |
| Phase 5 | 10 min | Test 5: Production scenario |
| **Total** | **~22 min** | Complete verification |

## Success Criteria

✅ **All tests pass if**:
- [ ] No "Encrypted message (failed to decrypt)" errors
- [ ] No cache pollution between accounts
- [ ] Messages decrypt immediately after send
- [ ] Old messages readable after account switch
- [ ] Error logs show new cache key format
- [ ] No console errors on logout/login

## Rollback Trigger

**If issues occur**, revert these changes:
1. Delete `MULTI_ACCOUNT_CACHE_FIX.md` (doc, not critical)
2. Revert frontend code changes (cache key format + cleanup)
3. Backend is backward compatible (no revert needed)

---

**After deployment, run Test 1 and Test 2 to confirm the fix works!**
