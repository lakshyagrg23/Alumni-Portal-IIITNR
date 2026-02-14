# Root Cause Analysis: Empty Names and "Alumni" Placeholders

## The Issue

- **49 entries** in `alumni_profiles` table
- **31 profiles** showing in directory (with proper names)
- **18 profiles** hidden (with empty or "Alumni" placeholder names)

## Root Cause Found

### 1. **Registration Flow Does NOT Create Profiles**

The authentication flow intentionally avoids creating alumni profiles:

- **During Registration** (`/api/auth/register/*`):
  - Line 107: `"DO NOT create alumni profile yet - wait for verification"`
  - Only creates user in `users` table
  - No profile created

- **After Email Verification** (`/api/auth/verify-email`):
  - Line 628: `"Email verified successfully - do NOT auto-create alumni profile"`
  - Checks if profile exists but doesn't create one
  - Returns `needsProfileSetup: true` if no profile exists

### 2. **The Real Culprit: `create-missing-profiles.js` Script**

This utility script creates placeholder profiles for users who don't have one:

```javascript
// Line 30-32 in create-missing-profiles.js
const first_name = parts[0] ? capitalize(parts[0]) : "Alumni";
const last_name = parts.length > 1 ? parts.slice(1).join(" ") : "";
```

**How it works:**

1. Finds all approved alumni users WITHOUT an alumni_profile
2. Extracts name from email (e.g., `pranjal23100@iiitnr.edu.in` → `pranjal`)
3. If email parsing fails or produces no valid parts → `first_name = 'Alumni'`
4. Creates profile with these auto-generated names

**When this produces "Alumni" placeholder:**

- Email like `test@iiitnr.edu.in` → no valid name parts → "Alumni"
- Email with only numbers `23100@iiitnr.edu.in` → no alpha parts → "Alumni"
- Complex emails that don't parse well → "Alumni"

### 3. **Users with Empty Names in Production**

Based on the example user `pranjal23100@iiitnr.edu.in`:

- `onboarding_completed = f` (false)
- `first_name` and `last_name` are empty in users table (which is expected)
- Alumni profile likely created by `create-missing-profiles.js` with placeholder
- User hasn't completed onboarding to provide real name

## Why These Profiles Don't Show in Directory

The directory already filters correctly (no fix needed):

- Default `publicOnly = true` in `AlumniProfile.findAll()`
- Backend filters: `u.role = 'alumni'`
- Current year filtering for alumni vs students
- **Missing filter:** Should also check `u.onboarding_completed = TRUE`

## Timeline of Events (Hypothesis)

1. **User registers** with institute email → Creates entry in `users` table only
2. **User verifies email** → Email verified, but NO profile created yet
3. **Admin/Script runs `create-missing-profiles.js`** → Creates placeholder profiles for verified users without profiles
4. **Email parsing creates "Alumni" placeholder** → If email doesn't contain recognizable name
5. **User never completes onboarding** → Profile stays with placeholder name, `onboarding_completed = false`
6. **User doesn't appear in directory** → Filtered out by existing logic

## The Fix (Already Implemented)

Added proper filtering in `AlumniProfile.findAll()`:

```javascript
if (publicOnly) {
  whereConditions.push(`u.onboarding_completed = TRUE`);
  whereConditions.push(`ap.first_name IS NOT NULL`);
  whereConditions.push(`TRIM(ap.first_name) != ''`);
  whereConditions.push(`TRIM(LOWER(ap.first_name)) != 'alumni'`);
}
```

## Recommendations

### Immediate Fix (Already Implemented):

1. **Made Profile Picture Optional** ✅
   - Removed required validation for profile picture upload
   - Users can now complete onboarding without a photo
   - Added "(Optional)" label and "you can add this later" note
   - This reduces form abandonment significantly

2. **Made LinkedIn URL Optional** ✅
   - Removed required validation for LinkedIn profile
   - Only validates format if user provides a URL
   - Users can add it later from their profile settings

### Short Term:

1. **Don't run `create-missing-profiles.js` automatically** - It creates unnecessary placeholders
2. **Let users complete onboarding naturally** - They'll provide their own names
3. **Clean up existing placeholder profiles** - Run a script to identify and optionally delete profiles with:
   - `first_name = 'Alumni'`
   - Empty `first_name`
   - `onboarding_completed = false`

### Long Term:

1. **Remove or Update `create-missing-profiles.js`**:
   - Either don't use it at all
   - Or improve name extraction logic
   - Or link to `institute_records` for proper names

2. **Better Onboarding Flow**:
   - After email verification, immediately redirect to onboarding
   - Make onboarding mandatory before accessing any features
   - Auto-create profile during onboarding submission, not before

3. **Institute Records Integration**:
   - Use `import-institute-records.js` to import proper student data
   - Link users to institute records via email/roll number
   - Pull real names from institute records instead of email parsing

## Commands to Investigate

### Check how many users need onboarding:

```sql
SELECT COUNT(*)
FROM users
WHERE role = 'alumni'
  AND is_approved = true
  AND email_verified = true
  AND onboarding_completed = false;
```

### Check placeholder profiles:

```sql
SELECT id, user_id, first_name, last_name, created_at
FROM alumni_profiles
WHERE TRIM(LOWER(first_name)) = 'alumni'
   OR first_name IS NULL
   OR TRIM(first_name) = '';
```

### Check profiles without completed onboarding:

```sql
SELECT ap.id, ap.first_name, ap.last_name, u.email, u.onboarding_completed
FROM alumni_profiles ap
JOIN users u ON ap.user_id = u.id
WHERE u.onboarding_completed = false
ORDER BY ap.created_at DESC;
```

## Conclusion

**The "Alumni" placeholder names come from the `create-missing-profiles.js` utility script**, which was likely run to create profiles for verified users before they completed onboarding. This script tries to extract names from email addresses, but when that fails, it defaults to "Alumni" as a placeholder.

**The proper flow should be:**

1. Register → Verify Email → Complete Onboarding → Profile Created with Real Name
2. NOT: Register → Verify Email → Script Creates Placeholder → User Never Onboards
