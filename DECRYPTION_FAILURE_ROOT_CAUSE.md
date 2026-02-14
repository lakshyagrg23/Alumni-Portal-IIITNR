# Root Cause Analysis: "Encrypted message (failed to decrypt)" Issue

## The Problem

When users try to decrypt messages, they see: `Encrypted message (failed to decrypt)`

The public key snapshots we added don't help because **the real issue is that the sender's public key is never being captured properly in the first place**.

## Root Cause: Missing Sender Public Key in Message Payload

### Current Flow (Broken)

**Client sends message:**
```javascript
socket.emit('secure:send', {
  toUserId,
  ciphertext: enc.ciphertext,
  metadata: { iv: enc.iv, ... },
  clientId
})
// ❌ Client NEVER sends its own public key!
```

**Server receives and tries to save:**
```javascript
// socket.js line 96-110
let senderPublicKey = null;
try {
  const pkRec = await PublicKeyModel.findByUserId(socket.user.id); // Lookup in DB
  senderPublicKey = pkRec ? pkRec.public_key : null;
} catch (e) {
  senderPublicKey = null; // ❌ NULL if not in database!
}
```

### Why This Breaks

1. **Race Condition**: Sender encrypts message using their private key + recipient's public key
2. **Missing Upload**: Sender hasn't uploaded their public key to server yet (new device, sync issue)
3. **Database Lookup Fails**: Server can't find sender's public key in `public_keys` table
4. **Snapshot Becomes NULL**: Message saved with `sender_public_key = NULL`
5. **Receiver Can't Decrypt**: 
   - Tries to use NULL snapshot → fails
   - Falls back to fetching current key
   - But if sender is on different device without uploaded key, fetch fails
   - Result: "Encrypted message (failed to decrypt)"

## The Real Issue: Asymmetric Key Exchange

The current design assumes:
- Client A knows their own private key
- Client A fetches Client B's public key from server
- Server mediates the key exchange

But encryption requires **BOTH** keys:
- Server needs to know WHICH keys were used at message send time
- If sender's key isn't uploaded to server, server can't capture the snapshot
- Receiver can't decrypt without the correct sender's public key

## Solution: Client Sends Its Own Public Key

**Change the message payload:**

```javascript
// Before (broken)
socket.emit('secure:send', {
  toUserId,
  ciphertext: enc.ciphertext,
  metadata: { iv: enc.iv, ... },
  clientId
});

// After (fixed)
socket.emit('secure:send', {
  toUserId,
  ciphertext: enc.ciphertext,
  metadata: { iv: enc.iv, ... },
  clientId,
  senderPublicKey: keyPair.publicKeyBase64  // ✅ Include sender's public key!
});
```

**Server stores it:**

```javascript
// socket.js - change line 117
const savedMessage = await MessageModel.create({
  sender_id: senderAlumniId,
  receiver_id: recipient.alumniId,
  content: ciphertext,
  iv: metadata?.iv || null,
  client_id: metadata?.clientId || null,
  message_type: metadata?.messageType || 'text',
  sender_public_key: payload.senderPublicKey || null, // ✅ Use sent key, not DB lookup!
  receiver_public_key: receiverPublicKey || null,
});
```

## Why This Works

1. **No Database Dependency**: Sender's public key travels WITH the encrypted message
2. **No Race Condition**: Public key is captured at encryption time, not lookup time
3. **Cross-Device Support**: Works even if sender hasn't uploaded key to server
4. **Snapshot Accuracy**: Receiver gets EXACT key that was used for encryption
5. **Offline Capable**: Client can decrypt even if sender's key was later rotated/deleted

## Implementation Steps

### 1. Frontend Changes

**File**: `frontend/src/pages/Messages.jsx`

In the `sendMessage` function around line 1250:

```javascript
// Get sender's public key
const senderPubKeyBase64 = await crypto.exportPublicKey(keyPair.publicKey);

const payload = {
  toUserId,
  ciphertext: enc.ciphertext,
  metadata: { iv: enc.iv, ciphertext: enc.ciphertext, messageType: attachmentMeta ? 'file' : 'text', clientId },
  clientId,
  senderPublicKey: senderPubKeyBase64  // ✅ ADD THIS
};

socket.emit('secure:send', payload);
```

Also update conversation start:

```javascript
// Around line 445 - in startConversation initial message
if (initialMessage) {
  const senderPubKeyBase64 = await crypto.exportPublicKey(keyPair.publicKey);
  await axios.post(`${API}/messages/send`, {
    receiverId,
    content: initialMessage,
    messageType: 'text',
    senderPublicKey: senderPubKeyBase64  // ✅ ADD THIS
  }, {
    headers: { Authorization: `Bearer ${token}` }
  });
}
```

### 2. Backend Changes

**File**: `backend/src/socket.js` 

**Line 117-127**, change from database lookup to use sent key:

```javascript
// OLD CODE (database lookup):
let senderPublicKey = null;
try {
  const pkRec = await PublicKeyModel.findByUserId(socket.user.id);
  senderPublicKey = pkRec ? pkRec.public_key : null;
} catch (e) {
  senderPublicKey = null;
}

// NEW CODE (use sent key):
const senderPublicKey = payload.senderPublicKey || null;
```

**File**: `backend/src/routes/messages.js`

For REST API messages (POST /api/messages/send), also accept public key:

```javascript
// Around line 255, in the POST /send handler
const senderPublicKey = req.body.senderPublicKey || null; // From client
const receiverPublicKey = receiverPublicKeyRecord?.public_key || null; // From DB

const record = await Message.create({ 
  sender_id: senderAlumni.id, 
  receiver_id: receiverAlumni.id, 
  content, 
  message_type: messageType,
  sender_public_key: senderPublicKey,  // ✅ Use sent key
  receiver_public_key: receiverPublicKey
});
```

### 3. Test Cases

```javascript
// Test 1: New device without uploaded key
// ✅ Should still decrypt because key comes in payload

// Test 2: Sender rotates key after sending
// ✅ Should still decrypt because snapshot preserves original key

// Test 3: Offline message send/receive
// ✅ Should decrypt because key is embedded in message
```

## Why Snapshots Alone Weren't Enough

Snapshots (the columns we added) are a **good practice for audit trails**, but they don't solve the **capture problem**. 

The snapshots fail if:
- The data to snapshot doesn't exist or exists in the wrong place
- The backend can't reliably fetch the data (race conditions, permissions, database issues)
- The data is in an inconsistent state

By having the **client send the key**, we:
1. **Guarantee accuracy** - use the exact key the client has
2. **Eliminate race conditions** - no database lookup needed
3. **Support offline scenarios** - key is in the message itself

## Related Issues Fixed By This

- Cross-device messaging (new device without uploaded keys)
- Key rotation (old messages stay decryptable)
- Offline message queueing (key available without server)
- Message editing (original key preserved for audit)

## Architecture Notes

This approach follows **zero-knowledge encryption** principles:
- Server never needs to know private keys
- Server stores encrypted data + the keys used (public, non-secret)
- Receiver can decrypt independently using stored public keys
- No key agreement needed between server and client
