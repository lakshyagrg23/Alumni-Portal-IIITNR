# Duplicate Account Creation Bug - Investigation Report

## Problem Statement
When a user registers using their institute email (e.g., `19115001@iiitnr.edu.in`), then attempts to create another account using the same person's institute records (same roll number), both accounts get created, causing duplicate entries in the directory.

## Root Cause Analysis

### 1. Institute Email Registration Flow (OAuth - Google)
**File**: [backend/src/routes/auth.js](backend/src/routes/auth.js#L800-L820)

**Current Flow**:
```javascript
if (isInstituteEmail) {
    registrationPath = "institute_email";
}

// Register new user
const userData = {
    email: emailLower,
    provider: "google",
    ...
    registration_path: registrationPath,
    institute_record_id: null,  // ❌ NOT SET FOR INSTITUTE EMAIL!
};
user = await User.create(userData);
```

**Issue**: When user registers with institute email (e.g., `19115001@iiitnr.edu.in`):
- The `registrationPath` is set to `"institute_email"`
- But `institute_record_id` remains `null` because there's no automatic lookup
- The system doesn't link the institute email to the institute record

---

### 2. Personal Email Registration Flow
**File**: [backend/src/routes/auth.js](backend/src/routes/auth.js#L390-L410)

**Current Flow** (works correctly):
```javascript
// Personal email registration with verification
const existingRecord = await query(
    "SELECT id FROM users WHERE institute_record_id = $1",
    [tokenData.instituteRecordId]
);

if (existingRecord.rows.length > 0) {
    return res.status(400).json({
        success: false,
        message: "An account has already been registered with this roll number.",
    });
}
```

**Status**: ✅ Has duplicate prevention check for verified institute records

---

### 3. Database Schema Issue
**File**: [database/migrations/003_add_institute_records_and_registration_paths.sql](database/migrations/003_add_institute_records_and_registration_paths.sql#L58-L60)

**Current Schema**:
```sql
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS institute_record_id UUID REFERENCES institute_records(id),
ADD COLUMN IF NOT EXISTS registration_path VARCHAR(20) DEFAULT 'institute_email';
```

**Issue**: 
- ❌ NO UNIQUE CONSTRAINT on `institute_record_id`
- Multiple users can have `institute_record_id = null`
- No constraint prevents multiple users linking to the same institute record

---

## Affected Registration Paths

| Path | Current Status | Issue |
|------|---|---|
| **Personal Email** (OAuth) | ✅ Protected | Has duplicate check when `verificationToken` provided |
| **Institute Email** (OAuth) | ❌ **VULNERABLE** | No `institute_record_id` lookup or duplicate check |
| **Email/Password** (Local) | ❌ **VULNERABLE** | No institute record linking at all |
| **LinkedIn OAuth** | ❌ **VULNERABLE** | Same issue as Google OAuth |

---

## Why Duplicates Happen

### Scenario: Same Person Registers Twice

**First Registration (Institute Email via OAuth)**:
```
User: 19115001@iiitnr.edu.in
Google OAuth (Google)
registrationPath: "institute_email"
institute_record_id: NULL  ❌ (not set)
Created: Account 1 ✓
```

**Second Registration (Personal Email Verification)**:
```
User: enters rollNumber=19115001, verifyIdentity
System finds institute_record_id for 19115001
Checks: SELECT * FROM users WHERE institute_record_id = ?
Result: 0 rows ✓ (because first account has NULL!)
Created: Account 2 ✓ **DUPLICATE**
```

Both accounts now exist but only Account 2 has `institute_record_id` set!

---

## Required Fixes

### Fix 1: Add Unique Constraint on institute_record_id
**Type**: Database Migration
```sql
ALTER TABLE users 
ADD CONSTRAINT unique_institute_record_id UNIQUE (institute_record_id) 
WHERE institute_record_id IS NOT NULL;
```

**Why**: PostgreSQL allows multiple NULLs, so this only prevents duplicates for linked records

---

### Fix 2: For Institute Email OAuth - Lookup and Link Institute Record
**File**: [backend/src/routes/auth.js](backend/src/routes/auth.js#L800-L820)
**Location**: Google & LinkedIn OAuth endpoints, when `isInstituteEmail === true`

**Current Code**:
```javascript
} else if (isInstituteEmail) {
    registrationPath = "institute_email";
}
```

**Required Change**:
```javascript
} else if (isInstituteEmail) {
    registrationPath = "institute_email";
    
    // NEW: Lookup and link institute record by email
    try {
        const instituteResult = await query(
            "SELECT id FROM institute_records WHERE LOWER(institute_email) = LOWER($1)",
            [emailLower]
        );
        
        if (instituteResult.rows.length > 0) {
            instituteRecordId = instituteResult.rows[0].id;
            
            // Check if account already exists for this record
            const existingAccount = await query(
                "SELECT id FROM users WHERE institute_record_id = $1",
                [instituteRecordId]
            );
            
            if (existingAccount.rows.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: "An account has already been registered with this institute email.",
                });
            }
        }
    } catch (err) {
        console.error("Error looking up institute record:", err);
    }
}
```

---

### Fix 3: For Email/Password Registration - Check Institute Email
**File**: [backend/src/routes/auth.js](backend/src/routes/auth.js#L20-L80)
**Location**: POST /api/auth/register endpoint

**Issue**: Email/password registration doesn't check for institute email duplicates

**Required Change**:
```javascript
// Check if email is institute email
const emailLower = email.toLowerCase();
const isInstituteEmail = 
    emailLower.endsWith("@iiitnr.edu.in") || 
    emailLower.endsWith("@iiitnr.ac.in");

if (isInstituteEmail) {
    // Lookup institute record
    const instituteResult = await query(
        "SELECT id FROM institute_records WHERE LOWER(institute_email) = LOWER($1)",
        [emailLower]
    );
    
    if (instituteResult.rows.length > 0) {
        const instituteRecordId = instituteResult.rows[0].id;
        
        // Check if account exists for this record
        const existingAccount = await query(
            "SELECT id FROM users WHERE institute_record_id = $1",
            [instituteRecordId]
        );
        
        if (existingAccount.rows.length > 0) {
            return res.status(400).json({
                success: false,
                message: "An account has already been registered with this institute email.",
            });
        }
    }
}

// Continue with normal registration...
```

---

### Fix 4: For LinkedIn OAuth - Same as Fix 2
**File**: [backend/src/routes/auth.js](backend/src/routes/auth.js#L950-L1000)
**Location**: POST /api/auth/linkedin endpoint

Apply the same institute email lookup logic as Fix 2

---

## Implementation Priority

| Fix | Priority | Complexity | Impact |
|-----|----------|-----------|--------|
| Fix 1: Unique constraint | **CRITICAL** | Low | Prevents future duplicates at DB level |
| Fix 2: Institute email OAuth | **CRITICAL** | Medium | Blocks duplicates for Google/LinkedIn |
| Fix 3: Email/password | **HIGH** | Medium | Blocks duplicates for local auth |
| Fix 4: LinkedIn OAuth | **CRITICAL** | Medium | Applies to LinkedIn users |

---

## Testing Strategy

### Test Case 1: Institute Email Duplicate Detection
```
1. Register with OAuth: 19115001@iiitnr.edu.in (Google)
   → Account 1 created, institute_record_id = {id}, registrationPath = "institute_email"
   
2. Try register with OAuth: 19115001@iiitnr.edu.in (LinkedIn)
   → Should return error: "Account already exists with this institute email"
   
3. Try register with verification: rollNumber=19115001
   → Should return error: "Account already exists with this roll number"
```

### Test Case 2: Email/Password Duplicate Detection
```
1. Register with email/password: 19115001@iiitnr.edu.in
   → Account 1 created, institute_record_id = {id}, registrationPath = "institute_email"
   
2. Try register again: 19115001@iiitnr.edu.in
   → Should return error: "Account already exists with this institute email"
```

### Test Case 3: Personal Email Still Works
```
1. Register with verification: rollNumber=19115001 (personal email account)
   → Account created, institute_record_id = {id}
   
2. Try register with verification again: rollNumber=19115001
   → Should return error: "Account already exists with this roll number"
```

---

## Files Requiring Changes

1. **database/migrations/012_add_unique_institute_record_constraint.sql** (NEW)
   - Add UNIQUE constraint on institute_record_id

2. **backend/src/routes/auth.js**
   - Line ~815: Google OAuth - Add institute email lookup
   - Line ~880: Email/Password registration - Add institute email check  
   - Line ~970: LinkedIn OAuth - Add institute email lookup

3. **NO CHANGES NEEDED**:
   - Personal email path already has duplicate prevention
   - Frontend registration flows unchanged
   - OAuth callback handlers unchanged

---

## Summary

**Root Cause**: Institute email registrations don't lookup and link to `institute_record_id`, so the duplicate prevention check (which relies on `institute_record_id`) fails.

**Solution**: 
1. Add database unique constraint as safety net
2. Lookup institute records during institute email OAuth
3. Add institute email duplicate check to email/password registration
4. Apply same logic to LinkedIn OAuth
