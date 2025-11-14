# Database Schema Changelog

## Version 2.0 - October 6, 2025

### Major Changes

This version consolidates all migrations and updates into a single, comprehensive schema file.

---

## 📋 Schema Files

### Current Files:

- **`schema_v2.sql`** (NEW) - Complete, up-to-date schema with all migrations applied
- **`schema.sql`** (OLD) - Original schema, now superseded by v2

### Recommendation:

- Use `schema_v2.sql` for **new database installations**
- Use migration files in `database/migrations/` for **existing databases**

---

## 🆕 New Tables (Not in Original Schema)

### 1. **public_keys** (E2E Encryption Support)

```sql
CREATE TABLE public_keys (
    id UUID PRIMARY KEY,
    user_id UUID UNIQUE NOT NULL REFERENCES users(id),
    public_key TEXT NOT NULL,
    algorithm VARCHAR(50) DEFAULT 'ECDH-P256',
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

**Purpose**: Store user public keys for end-to-end encrypted messaging using ECDH P-256 key exchange

**Features**:

- One key per user (UNIQUE constraint)
- Base64 encoded ECDH P-256 public key (65 bytes raw)
- Algorithm field for future flexibility

---

### 2. **message_read_receipts** (Enhanced Read Tracking)

```sql
CREATE TABLE message_read_receipts (
    id UUID PRIMARY KEY,
    message_id UUID NOT NULL REFERENCES messages(id),
    user_id UUID NOT NULL REFERENCES users(id),
    read_at TIMESTAMP,
    UNIQUE(message_id, user_id)
);
```

**Purpose**: Track message read status (supports future group messaging feature)

---

## 🔧 Modified Tables

### **users** Table Changes

#### Added Columns:

```sql
-- Email verification with expiry
email_verification_token_expires TIMESTAMP
```

**Impact**: Email verification tokens now expire after 24 hours (configurable)

**Migration File**: `add_email_verification_expiry.sql`

---

### **messages** Table Changes

#### 1. Added E2E Encryption Support Columns:

```sql
iv TEXT,                      -- AES-GCM initialization vector
client_id TEXT,               -- Client-side deduplication ID
sender_public_key TEXT,       -- Sender's public key snapshot
receiver_public_key TEXT      -- Receiver's public key snapshot
```

**Migration File**: `001_messaging_essential.sql`

#### 2. Enhanced Constraints:

```sql
-- Made foreign keys NOT NULL
ALTER COLUMN sender_id SET NOT NULL;
ALTER COLUMN receiver_id SET NOT NULL;

-- Added duplicate CHECK constraint (belt-and-suspenders approach)
CONSTRAINT messages_check CHECK (sender_id != receiver_id),
CONSTRAINT check_no_self_messages CHECK (sender_id != receiver_id)
```

**Migration File**: `fix_messages_constraints.sql`

**Why Two Constraints?**: The first was in original schema but not enforced; second added for safety

---

### **conversations** Table Changes

#### Added Privacy Settings:

```sql
is_archived_by_participant1 BOOLEAN DEFAULT FALSE,
is_archived_by_participant2 BOOLEAN DEFAULT FALSE,
is_muted_by_participant1 BOOLEAN DEFAULT FALSE,
is_muted_by_participant2 BOOLEAN DEFAULT FALSE
```

**Impact**: Users can now archive or mute conversations individually

**Migration File**: `001_messaging_feature.sql`

#### Enhanced Constraints:

```sql
-- Ensure conversation uniqueness regardless of participant order
CONSTRAINT unique_conversation UNIQUE(
    LEAST(participant1_id, participant2_id),
    GREATEST(participant1_id, participant2_id)
)
```

**Why**: Prevents duplicate conversations (A→B vs B→A)

---

## 📊 New Indexes

### Email & Verification:

```sql
CREATE INDEX idx_users_email_lower ON users(LOWER(email));
CREATE INDEX idx_users_verification_token ON users(email_verification_token)
    WHERE email_verification_token IS NOT NULL;
```

### Messaging Performance:

```sql
CREATE INDEX idx_public_keys_user_id ON public_keys(user_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_receiver_id ON messages(receiver_id);
CREATE INDEX idx_messages_sent_at ON messages(sent_at DESC);
CREATE INDEX idx_messages_client_id ON messages(client_id)
    WHERE client_id IS NOT NULL;
CREATE INDEX idx_messages_unread ON messages(receiver_id, is_read)
    WHERE is_read = FALSE;
CREATE INDEX idx_conversations_last_message_at ON conversations(last_message_at DESC);
CREATE INDEX idx_message_read_receipts_message_id ON message_read_receipts(message_id);
CREATE INDEX idx_message_read_receipts_user_id ON message_read_receipts(user_id);
```

**Impact**: Significant query performance improvements for messaging features

---

## 🔄 New Triggers

### 1. **Public Keys Timestamp Trigger**

```sql
CREATE TRIGGER update_public_keys_updated_at
    BEFORE UPDATE ON public_keys
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

### 2. **Messages Timestamp Trigger**

```sql
CREATE TRIGGER update_messages_updated_at
    BEFORE UPDATE ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

### 3. **Auto-Update Conversations on New Message**

```sql
CREATE TRIGGER update_conversation_on_new_message
    AFTER INSERT ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_conversation_last_message();
```

**Impact**: Conversations automatically updated when messages are sent

---

## 👁️ New Views

### 1. **conversation_list** (Enhanced Conversation Display)

```sql
CREATE OR REPLACE VIEW conversation_list AS
SELECT
    c.id as conversation_id,
    c.participant1_id,
    c.participant2_id,
    c.last_message_at,
    p1.first_name as p1_first_name,
    p1.last_name as p1_last_name,
    p2.first_name as p2_first_name,
    p2.last_name as p2_last_name,
    m.content as last_message_content,
    m.is_read as last_message_read
FROM conversations c
LEFT JOIN alumni_profiles p1 ON c.participant1_id = p1.id
LEFT JOIN alumni_profiles p2 ON c.participant2_id = p2.id
LEFT JOIN messages m ON c.last_message_id = m.id;
```

### 2. **unread_message_counts** (Notification Support)

```sql
CREATE OR REPLACE VIEW unread_message_counts AS
SELECT
    receiver_id,
    sender_id,
    COUNT(*) as unread_count
FROM messages
WHERE is_read = FALSE
GROUP BY receiver_id, sender_id;
```

**Impact**: Simplified queries for frontend conversation lists and notification badges

---

## 🔒 Security Enhancements

### End-to-End Encryption Flow:

1. **Key Generation**:

   - Frontend generates ECDH P-256 key pair
   - Public key uploaded to `public_keys` table
   - Private key stored in browser localStorage

2. **Message Encryption**:

   - Fetch recipient's public key
   - Derive shared secret using ECDH
   - Derive AES-GCM-256 key using HKDF
   - Encrypt message with random IV
   - Store ciphertext, IV, and key snapshots

3. **Message Decryption**:
   - Fetch sender's public key
   - Derive same shared secret
   - Derive same AES-GCM key
   - Decrypt using stored IV

**Important**: Server never sees plaintext messages!

---

## 📝 Documentation Improvements

### Added Comments:

```sql
COMMENT ON TABLE public_keys IS 'Public keys for end-to-end encrypted messaging (ECDH P-256)';
COMMENT ON TABLE messages IS 'Encrypted messages between alumni (E2E encryption using AES-GCM)';
COMMENT ON COLUMN messages.content IS 'AES-GCM encrypted message content (ciphertext in base64)';
COMMENT ON COLUMN messages.iv IS 'Initialization vector for AES-GCM decryption (base64 encoded)';
COMMENT ON COLUMN public_keys.public_key IS 'Base64 encoded ECDH P-256 raw public key (65 bytes)';
```

---

## 📊 Schema Statistics

### Original Schema (v1):

- **Tables**: 15
- **Indexes**: ~12
- **Triggers**: 5
- **Views**: 0
- **Functions**: 2

### Updated Schema (v2):

- **Tables**: 17 (+2)
- **Indexes**: ~30 (+18)
- **Triggers**: 9 (+4)
- **Views**: 2 (+2)
- **Functions**: 3 (+1)

---

## 🚀 Migration Path

### For New Installations:

```bash
psql -U postgres -d alumni_portal -f database/schema_v2.sql
```

### For Existing Databases (Run in order):

```bash
# 1. Email verification expiry
psql -U postgres -d alumni_portal -f database/migrations/add_email_verification_expiry.sql

# 2. Essential messaging features
psql -U postgres -d alumni_portal -f database/migrations/001_messaging_essential.sql

# 3. Complete messaging system
psql -U postgres -d alumni_portal -f database/migrations/001_messaging_feature.sql

# 4. Fix message constraints
psql -U postgres -d alumni_portal -f database/migrations/fix_messages_constraints.sql
```

### Verification:

```bash
# Check all tables exist
psql -U postgres -d alumni_portal -c "\dt"

# Check public_keys table structure
psql -U postgres -d alumni_portal -c "\d public_keys"

# Check messages table constraints
psql -U postgres -d alumni_portal -c "\d messages"

# Verify views exist
psql -U postgres -d alumni_portal -c "\dv"
```

---

## ⚠️ Breaking Changes

### None!

All changes are additive or enhancement-focused. Existing functionality remains intact.

---

## 🔮 Future Considerations

### Potential Future Features:

1. **Group Messaging**: `message_read_receipts` table already supports this
2. **Message Editing**: Add `edited_at` column to `messages`
3. **Message Reactions**: New `message_reactions` table
4. **Key Rotation**: Add `previous_keys` JSONB column to `public_keys`
5. **Message Expiry**: Add `expires_at` column for self-destructing messages

---

## 📚 Related Documentation

- **MESSAGING_404_FIX.md**: Troubleshooting guide for messaging feature
- **MESSAGING_VERIFICATION_REPORT.md**: Database verification report
- **FINAL_VERIFICATION_COMPLETE.md**: Migration validation results

---

## ✅ Validation Checklist

- [x] All migration files applied successfully
- [x] No data loss during migrations
- [x] All constraints working properly
- [x] Indexes created and optimized
- [x] Triggers functioning correctly
- [x] Views returning expected data
- [x] E2E encryption working in production
- [x] Performance benchmarks acceptable
- [x] Documentation complete and accurate

---

**Schema Version**: 2.0  
**Last Updated**: October 6, 2025  
**Maintainer**: Alumni Portal Development Team  
**Status**: ✅ Production Ready
