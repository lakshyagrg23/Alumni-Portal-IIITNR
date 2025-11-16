# Database Schema Quick Reference

## 📁 Schema Files

| File              | Purpose                          | Use When                   |
| ----------------- | -------------------------------- | -------------------------- |
| **schema_v2.sql** | Complete schema with all updates | Setting up NEW database    |
| **schema.sql**    | Original schema (v1)             | Reference only (outdated)  |
| **migrations/**   | Incremental updates              | Updating EXISTING database |

---

## 🗂️ Tables Overview

### Authentication & User Management (2 tables)

| Table             | Description                    | Key Features                                  |
| ----------------- | ------------------------------ | --------------------------------------------- |
| `users`           | Authentication & authorization | Email verification with expiry, OAuth support |
| `alumni_profiles` | Detailed user profiles         | Skills array, privacy settings                |

### Professional & Academic (2 tables)

| Table              | Description        | Key Features          |
| ------------------ | ------------------ | --------------------- |
| `work_experiences` | Work history       | Current position flag |
| `education`        | Additional degrees | Beyond primary degree |

### Content Management (2 tables)

| Table    | Description         | Key Features               |
| -------- | ------------------- | -------------------------- |
| `news`   | News & achievements | Featured posts, tags       |
| `events` | Events & workshops  | Registration, requirements |

### Social & Networking (3 tables)

| Table                 | Description        | Key Features                  |
| --------------------- | ------------------ | ----------------------------- |
| `connections`         | Alumni networking  | Pending/accepted status       |
| `event_registrations` | Event sign-ups     | Feedback, attendance tracking |
| `notifications`       | User notifications | Type-based, read status       |

### Messaging System (4 tables)

| Table                   | Description             | Key Features                   |
| ----------------------- | ----------------------- | ------------------------------ |
| `messages`              | **Encrypted messages**  | E2E encryption (AES-GCM)       |
| `conversations`         | Conversation metadata   | Archive, mute settings         |
| `public_keys`           | **E2E encryption keys** | ECDH P-256 public keys         |
| `message_read_receipts` | Read tracking           | Future group messaging support |

### System & Logging (3 tables)

| Table           | Description      | Key Features            |
| --------------- | ---------------- | ----------------------- |
| `activity_logs` | Admin monitoring | IP tracking, user agent |
| `file_uploads`  | File management  | MIME type, upload type  |

**Total: 17 tables**

---

## 🔐 Encryption Architecture

### Key Components:

```
┌─────────────┐
│  Frontend   │ Generates ECDH P-256 keypair
└──────┬──────┘
       │ Uploads public key
       ▼
┌─────────────┐
│ public_keys │ Stores base64 public key
└──────┬──────┘
       │ Used for encryption
       ▼
┌─────────────┐
│  messages   │ Stores encrypted content + IV
└─────────────┘
```

### Encryption Flow:

1. **Alice sends to Bob**:

   - Fetch Bob's public key
   - Derive shared secret: `ECDH(alice_private, bob_public)`
   - Derive AES key: `HKDF(shared_secret)`
   - Encrypt: `AES-GCM-256(plaintext, random_iv)`
   - Store: `{ciphertext, iv, bob_public_key}`

2. **Bob decrypts**:
   - Fetch Alice's public key
   - Derive same shared secret: `ECDH(bob_private, alice_public)`
   - Derive same AES key: `HKDF(shared_secret)`
   - Decrypt: `plaintext = AES-GCM-256(ciphertext, iv)`

### Security Properties:

- ✅ Forward secrecy (ephemeral keys)
- ✅ Server never sees plaintext
- ✅ End-to-end encrypted
- ✅ Client-side key management

---

## 📊 Key Relationships

### User Hierarchy:

```
users (id)
  ├── alumni_profiles (user_id) - 1:1
  │   ├── work_experiences (alumni_id) - 1:N
  │   ├── education (alumni_id) - 1:N
  │   ├── connections (requester_id/addressee_id) - N:N
  │   ├── messages (sender_id/receiver_id) - N:N
  │   └── conversations (participant1_id/participant2_id) - N:N
  ├── public_keys (user_id) - 1:1 (UNIQUE)
  ├── notifications (user_id) - 1:N
  └── activity_logs (user_id) - 1:N
```

### Messaging Relationships:

```
alumni_profiles
  ├── messages (sender_id) → E2E encrypted content
  └── messages (receiver_id) → E2E encrypted content
        ├── conversations → Auto-updated via trigger
        └── message_read_receipts → Read tracking

users
  └── public_keys (user_id) → ECDH P-256 public key
```

---

## 🔍 Critical Constraints

### messages Table:

```sql
-- Prevent self-messaging (dual constraints for safety)
CHECK (sender_id != receiver_id)

-- Ensure both participants exist
sender_id UUID NOT NULL REFERENCES alumni_profiles(id)
receiver_id UUID NOT NULL REFERENCES alumni_profiles(id)
```

### public_keys Table:

```sql
-- One key per user
CONSTRAINT unique_user_public_key UNIQUE(user_id)
```

### conversations Table:

```sql
-- Prevent duplicate conversations (A→B same as B→A)
CONSTRAINT unique_conversation UNIQUE(
    LEAST(participant1_id, participant2_id),
    GREATEST(participant1_id, participant2_id)
)
```

---

## 🚀 Performance Indexes

### Most Important:

```sql
-- Message queries (highly accessed)
idx_messages_conversation ON messages(sender_id, receiver_id)
idx_messages_sent_at ON messages(sent_at DESC)
idx_messages_unread ON messages(receiver_id, is_read) WHERE is_read = FALSE

-- Public key lookups (every message send/receive)
idx_public_keys_user_id ON public_keys(user_id)

-- Conversation lists
idx_conversations_last_message_at ON conversations(last_message_at DESC)
```

---

## 🔧 Useful Queries

### Check User's Public Key:

```sql
SELECT pk.public_key, pk.algorithm, pk.created_at
FROM public_keys pk
JOIN users u ON pk.user_id = u.id
WHERE u.email = 'user@example.com';
```

### Get Unread Message Count:

```sql
SELECT COUNT(*)
FROM messages
WHERE receiver_id = (
    SELECT id FROM alumni_profiles WHERE user_id = 'USER_UUID'
) AND is_read = FALSE;
```

### List All Conversations:

```sql
SELECT * FROM conversation_list
WHERE participant1_id = 'ALUMNI_PROFILE_UUID'
   OR participant2_id = 'ALUMNI_PROFILE_UUID'
ORDER BY last_message_at DESC;
```

### Find Users Without Public Keys:

```sql
SELECT u.id, u.email
FROM users u
LEFT JOIN public_keys pk ON u.id = pk.user_id
WHERE pk.id IS NULL;
```

---

## ⚡ Triggers in Action

### 1. Auto-Update Conversation on New Message

**Trigger**: `update_conversation_on_new_message`
**Fires**: After INSERT on `messages`
**Action**: Creates or updates conversation with latest message metadata

### 2. Auto-Approve Institute Emails

**Trigger**: `auto_approve_institute_emails_trigger`
**Fires**: Before INSERT on `users`
**Action**: Sets `is_approved = TRUE` and `email_verified = TRUE` for `@iiitnr.edu.in` emails

### 3. Update Timestamps

**Triggers**: Multiple `update_*_updated_at`
**Fires**: Before UPDATE on various tables
**Action**: Sets `updated_at = CURRENT_TIMESTAMP`

---

## 📈 Schema Statistics

```
Tables:              17
Indexes:             ~30
Triggers:            9
Views:               2
Functions:           3
Foreign Keys:        ~25
Check Constraints:   ~8
Unique Constraints:  ~10
```

---

## 🔄 Migration Order (For Existing DBs)

```
1. add_email_verification_expiry.sql      (Adds token expiry)
2. 001_messaging_essential.sql            (Adds public_keys + message columns)
3. 001_messaging_feature.sql              (Complete messaging system)
4. fix_messages_constraints.sql           (Enforces NOT NULL + CHECK)
```

**IMPORTANT**: Do NOT run migrations on a fresh database. Use `schema_v2.sql` instead.

---

## ✅ Health Check Queries

### Verify All Tables Exist:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;
-- Expected: 17 tables
```

### Verify All Triggers:

```sql
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public';
-- Expected: 9 triggers
```

### Verify All Views:

```sql
SELECT table_name
FROM information_schema.views
WHERE table_schema = 'public';
-- Expected: conversation_list, unread_message_counts
```

### Check Constraints:

```sql
SELECT conname, contype
FROM pg_constraint
WHERE conrelid = 'messages'::regclass;
-- Should include: check_no_self_messages
```

---

## 🎯 Quick Setup Commands

### New Database (Recommended):

```bash
# Create database
createdb alumni_portal

# Run complete schema
psql -d alumni_portal -f database/schema_v2.sql
```

### Existing Database (If needed):

```bash
# Run migrations in order
psql -d alumni_portal -f database/migrations/add_email_verification_expiry.sql
psql -d alumni_portal -f database/migrations/001_messaging_essential.sql
psql -d alumni_portal -f database/migrations/001_messaging_feature.sql
psql -d alumni_portal -f database/migrations/fix_messages_constraints.sql
```

---

**Quick Reference Version**: 2.0  
**Last Updated**: October 6, 2025  
**Schema File**: database/schema_v2.sql
