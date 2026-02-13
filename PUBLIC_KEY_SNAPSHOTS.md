# Public Key Snapshots for E2E Encryption Integrity

## Overview

**Public Key Snapshots** capture the sender's and receiver's public keys at the exact moment a message is sent. This ensures message integrity and prevents cryptographic attacks when public keys are rotated.

## Problem Solved

### Challenge 1: Key Rotation Attacks
When a user changes their public key, old messages referencing the old key become problematic:
- **Before**: Message stored `sender_id`, not the actual public key
- **Risk**: If sender's key rotates, client can't decrypt old messages
- **After**: Message stores `sender_public_key` snapshot taken at send time

### Challenge 2: Modified Messages with Stale Keys
Without snapshots, edited messages lose integrity proof:
```
Scenario:
1. Alice sends Bob an encrypted message using Key_A
2. Alice deletes Key_A and generates Key_B  
3. Alice's client loads the message but only has Key_B
4. Client can't verify if message was actually encrypted with Key_A originally
```

### Challenge 3: No Verification Chain
There's no way to prove:
- "This message was definitely sent with these specific keys"
- "The decryption succeeded with the correct keys"
- "The message hasn't been tampered with"

## Solution: Public Key Snapshots

### Data Storage

**messages table columns:**
```sql
sender_public_key TEXT      -- Public key of sender at send time
receiver_public_key TEXT    -- Public key of receiver at send time
```

### Capture During Send

**When POST /api/messages/send is called:**

```javascript
// 1. Get current public keys from database
const senderPublicKeyRecord = await PublicKey.findByUserId(senderAlumni.user_id);
const receiverPublicKeyRecord = await PublicKey.findByUserId(receiverAlumni.user_id);

// 2. Extract the actual key values (or null if not generated yet)
const senderPublicKey = senderPublicKeyRecord?.public_key || null;
const receiverPublicKey = receiverPublicKeyRecord?.public_key || null;

// 3. Store these snapshots with the message
const record = await Message.create({ 
  sender_id: senderAlumni.id, 
  receiver_id: receiverAlumni.id, 
  content,           // Encrypted content (done client-side)
  message_type,
  sender_public_key,      // SNAPSHOT at send time
  receiver_public_key     // SNAPSHOT at send time
});
```

## Verification Flow

### Client-Side Decryption with Snapshots

```javascript
// 1. Fetch message from server
const message = await fetchMessage(messageId);
// message contains: 
//   - content (encrypted)
//   - iv (initialization vector)
//   - sender_public_key (snapshot)
//   - receiver_public_key (snapshot)

// 2. Use SNAPSHOT public key for verification
const senderPublicKey = message.sender_public_key;
const isValidEncryption = await verifyWithPublicKey(
  senderPublicKey,  // Use snapshot, not current key!
  message.content,
  message.iv
);

// 3. Only decrypt if verification passes
if (isValidEncryption) {
  const decrypted = decryptMessage(message.content, myPrivateKey, message.iv);
}
```

## Advantages

| Aspect | Before | After |
|--------|--------|-------|
| **Key Rotation** | Messages become unverifiable | Snapshots preserve original encryption keys |
| **Edited Messages** | Can't validate original sender | Can verify against original key snapshot |
| **Attack Surface** | Client must guess old keys | Explicit key proof in database |
| **Audit Trail** | No record of which key was used | Complete history of key usage |
| **Message Integrity** | Implicit trust | Cryptographic proof |

## Use Cases

### Use Case 1: Key Recovery
```
User's device lost, restoring from backup with old private key
→ Can still decrypt messages using stored sender_public_key snapshot
→ Verification succeeds despite key rotation
```

### Use Case 2: Message Editing Audit
```
Alice edits message after Bob's key has rotated
→ original_content + original_sender_public_key = proof of original encryption
→ Edited message uses Bob's new key
→ Both versions verifiable
```

### Use Case 3: Security Investigation
```
Admin investigating if message was tampered with
→ Compare message.sender_public_key against user's current key timeline
→ Identify exactly when key was in use
→ Prove message wasn't modified post-send
```

## Implementation Details

### Migration

Run `006_public_key_snapshots.sql` to add columns:
```sql
ALTER TABLE messages ADD COLUMN sender_public_key TEXT;
ALTER TABLE messages ADD COLUMN receiver_public_key TEXT;
```

These columns are:
- **Nullable**: Yes (for backward compatibility with unencrypted messages)
- **Indexed**: Yes (for recovery/audit queries)
- **Cleartext**: Yes (public keys are not secret)

### Message Creation Points

**1. Standard Message Send (POST /api/messages/send)**
- ✅ Captures both snapshots
- ✅ Works with user public keys

**2. Conversation Start (POST /api/messages/conversation/:userId/start)**
- ✅ Captures both snapshots for initial message
- ✅ Preserves encryption from start

**3. File Upload (POST /api/messages/upload)**
- N/A (uploads are referenced by URL, not encrypted in snapshot)

## Security Considerations

### ✅ What's Secure
- Public keys are intentionally public, no secret exposure
- Snapshots create audit trail of key usage
- Enables offline verification

### ⚠️ What's NOT Secure
- Snapshots don't prevent sender from denying they sent a message
- Snapshots can't verify receiver actually received it
- Server-side key management still needs separate security (not part of E2E)

### 🔒 Mitigations
- For non-repudiation: Add message signatures (future enhancement)
- For delivery proof: Add read receipts (separate system)
- For server security: Use key encryption (HSM/transparent encryption)

## Testing

### Verify Snapshots Are Captured

```bash
# Check message has public key snapshots
SELECT 
  id,
  sender_public_key IS NOT NULL as has_sender_key,
  receiver_public_key IS NOT NULL as has_receiver_key,
  sent_at
FROM messages
LIMIT 5;
```

### Verify Snapshots Used for Decryption

Client-side check:
```javascript
// Before: Using current key (could be different)
const currentKey = getMyCurrentPublicKey();

// After: Using snapshot from message
const messageKey = message.receiver_public_key;

console.assert(currentKey === messageKey, 
  'Key was rotated since message was sent');
```

## Migration Path

### Phase 1: Capture Snapshots ✅ (Current)
- New messages automatically capture snapshots
- Old messages have NULL snapshots (backward compatible)

### Phase 2: Backfill Snapshots (Optional)
```sql
UPDATE messages 
SET sender_public_key = pk_sender.public_key,
    receiver_public_key = pk_receiver.public_key
FROM public_keys pk_sender, public_keys pk_receiver, alumni_profiles ap_s, alumni_profiles ap_r
WHERE messages.sender_id = ap_s.id
  AND ap_s.user_id = pk_sender.user_id
  AND messages.receiver_id = ap_r.id
  AND ap_r.user_id = pk_receiver.user_id
  AND messages.sender_public_key IS NULL;
```

### Phase 3: Client-Side Validation
Update message decryption to validate snapshots before use

## Contributing

When adding new message creation endpoints:
1. Always capture `sender_public_key` and `receiver_public_key`
2. Use `PublicKey.findByUserId()` to get current keys
3. Store both snapshots with the message
4. Document the encryption flow

## FAQ

**Q: Why store public keys? They're public anyway.**
A: Correctness. If user changes their key, we need historical record of which key was used when.

**Q: What if a user's public key is NULL?**
A: Message is stored with NULL snapshot. Client should warn user that encryption wasn't available for this recipient at send time.

**Q: Can we derive old keys from snapshots?**
A: No, snapshots only help with verification. Private keys are separate and encrypted client-side.

**Q: Does this prevent key compromise?**
A: No. If a private key is compromised, past messages can be decrypted regardless of snapshots. Snapshots help with verification, not secrecy.

## Related Documentation

- [E2E Encryption Architecture](../../docs/E2E_ENCRYPTION_ARCHITECTURE.md)
- [Message Security](/docs/MESSAGE_SECURITY.md)
- [Key Management](/docs/KEY_MANAGEMENT.md)
