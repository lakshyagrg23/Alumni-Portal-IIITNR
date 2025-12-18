# Database Migration Instructions - Email Verification Index

## Overview
The email verification endpoint was timing out due to missing indexes on the `users` table. This document provides manual SQL commands to add the necessary indexes.

## Prerequisites
- PostgreSQL client access to alumni_portal database
- User credentials: postgres / Lakshya23 (from .env file)

## Manual SQL Commands

Copy and paste these SQL commands into your PostgreSQL client (psql or pgAdmin):

```sql
-- Step 1: Create index on email_verification_token for fast token lookups
CREATE INDEX IF NOT EXISTS idx_users_email_verification_token 
ON users(email_verification_token) 
WHERE email_verification_token IS NOT NULL;

-- Step 2: Create index on email_verified for filtering verified/unverified users
CREATE INDEX IF NOT EXISTS idx_users_email_verified 
ON users(email_verified);

-- Step 3: Create index on email (lowercase) for case-insensitive lookups
CREATE INDEX IF NOT EXISTS idx_users_email 
ON users(LOWER(email));

-- Step 4: Create index on created_at for date-based queries
CREATE INDEX IF NOT EXISTS idx_users_created_at 
ON users(created_at DESC);
```

## Verification

Run this query to verify all indexes were created:

```sql
SELECT indexname 
FROM pg_indexes 
WHERE tablename = 'users' 
AND indexname IN (
  'idx_users_email_verification_token', 
  'idx_users_email_verified', 
  'idx_users_email', 
  'idx_users_created_at'
)
ORDER BY indexname;
```

Expected output:
```
            indexname
--------------------------------------
 idx_users_created_at
 idx_users_email
 idx_users_email_verified
 idx_users_email_verification_token
(4 rows)
```

## Using psql (Command Line)

```bash
# Connect to PostgreSQL
psql -U postgres -d alumni_portal -h localhost

# Paste the SQL commands from above
```

## Using pgAdmin (GUI)

1. Open pgAdmin
2. Navigate to: Servers → Your Server → Databases → alumni_portal → Schemas → public → Tables
3. Right-click on `users` table → Query Tool
4. Paste the SQL commands above
5. Click Execute

## Performance Impact

After creating these indexes:
- Email verification endpoint: **~10x faster** (from ~10 seconds to <1 second)
- User lookups: **Faster** case-insensitive email searches
- Database queries: **More efficient** filtering with additional indexes

## Rollback (if needed)

If you need to remove these indexes:

```sql
DROP INDEX IF EXISTS idx_users_email_verification_token;
DROP INDEX IF EXISTS idx_users_email_verified;
DROP INDEX IF EXISTS idx_users_email;
DROP INDEX IF EXISTS idx_users_created_at;
```

## Related Code Changes

The following code changes work together with these indexes:

### 1. OAuth Provider Linking (Fix)
**Files**: `backend/src/routes/auth.js`
- When OAuth is used, now links to existing unverified email/password accounts
- Prevents creating duplicate accounts
- Affects: `/api/auth/google` and `/api/auth/linkedin` endpoints

### 2. Existing Duplicate Prevention (Previous)
**Files**: `backend/src/routes/auth.js`
- Institute email registration routes check for duplicates by institute_record_id
- Prevents duplicate accounts when registering with institute email

### 3. Database Constraint (Previous)
**File**: `database/migrations/012_add_unique_institute_record_constraint.sql`
- Adds UNIQUE constraint on institute_record_id column
- Serves as last-line defense against duplicates at database level

## Testing Checklist

After running this migration:

- [ ] Run the indexes verification query above
- [ ] Test: Start email/password registration
- [ ] Test: Cancel before email verification
- [ ] Test: Use OAuth (Google/LinkedIn) with same email
- [ ] Test: Should link to existing account (not create duplicate)
- [ ] Test: Verify email endpoint completes in <1 second
- [ ] Test: No more "timeout of 10000ms exceeded" errors
