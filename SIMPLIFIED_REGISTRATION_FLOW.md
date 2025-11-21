# Simplified Registration & Onboarding Flow

## Implementation Summary

This document outlines the simplified user registration and onboarding flow implemented for the IIIT Naya Raipur Alumni Portal.

---

## 🎯 Design Goals

1. **Simplicity**: Reduce friction during registration and onboarding
2. **Security**: Maintain email verification + admin approval for quality control
3. **Flexibility**: Support both email/password and OAuth registration
4. **Minimal Data Collection**: Ask only essential information during onboarding

---

## 📋 Registration Flow

### **Option 1: Email & Password Registration**

```
User Action: Register with email + password
  ↓
Backend: Create user account
  - is_approved = FALSE (awaits admin approval)
  - email_verified = FALSE (awaits email verification)
  ↓
Email: Verification link sent to user
  ↓
User Action: Click verification link
  ↓
Backend: Update user
  - email_verified = TRUE
  - is_approved = FALSE (still awaits admin approval)
  ↓
User: Cannot login yet (shows message: "Account pending admin approval")
  ↓
Admin: Reviews and approves user from admin panel
  ↓
Backend: Update user
  - is_approved = TRUE
  ↓
Email: Approval notification sent to user
  ↓
User: Can now login
  ↓
Redirect to: Onboarding form
```

### **Option 2: Google OAuth Registration**

```
User Action: Sign in with Google
  ↓
Backend: Create/login user account
  - is_approved = TRUE (OAuth auto-approved)
  - email_verified = TRUE (Google verifies email)
  ↓
User: Logged in immediately
  ↓
Redirect to: Onboarding form (if first time)
```

---

## 📝 Simplified Onboarding Form

### **Single Page - Essential Fields Only**

#### **1. Basic Information**
- ✅ First Name* (required)
- ✅ Last Name* (required)
- ⚪ Roll Number (optional - user can enter if they remember)

#### **2. Academic Information**
- ✅ Degree* (BTech, MTech, PhD, Integrated MTech)
- ✅ Branch* (CSE, ECE, DSAI, IT)
- ✅ Graduation Year* (2010-2030)

#### **3. Current Status**
- ✅ Employment Status* (dropdown):
  - Employed
  - Higher Studies
  - Entrepreneur
  - Looking for Opportunities
  - Other
- ✅ Currently At* (Company/University name)
- ✅ Current City* (Location)

#### **4. Privacy**
- ⚪ Make profile public (checkbox, default: true)

**Total Required Fields:** 8
**Total Optional Fields:** 2

---

## 🔄 Complete User Journey

### **Path A: Email Registration (Typical Flow)**

```
1. Register Page
   ├─ Email: john.doe@gmail.com
   ├─ Password: ********
   └─ Submit
   
2. Email Sent Confirmation
   └─ "Check your email for verification link"
   
3. Email Verification
   └─ Click link in email
   
4. Verification Success Page
   └─ "Email verified! Your account is pending admin approval."
   
5. Admin Approves (happens in background)
   
6. Approval Email Received
   └─ "Your account has been approved! Please login."
   
7. Login Page
   ├─ Email: john.doe@gmail.com
   ├─ Password: ********
   └─ Submit
   
8. Onboarding Form (First Login)
   ├─ Basic Info
   ├─ Academic Info
   ├─ Current Status
   ├─ Privacy
   └─ Submit
   
9. Dashboard (Welcome!)
```

### **Path B: Google OAuth (Fast Track)**

```
1. Login Page
   └─ Click "Sign in with Google"
   
2. Google OAuth Consent
   └─ Approve
   
3. Onboarding Form (if new user)
   ├─ Basic Info (name pre-filled from Google)
   ├─ Academic Info
   ├─ Current Status
   ├─ Privacy
   └─ Submit
   
4. Dashboard (Welcome!)
```

---

## 🗄️ Database Schema Changes

### **Modified: `users` Table**

```sql
-- Key changes in logic:
-- 1. No auto-approval for institute emails
-- 2. OAuth users (Google/LinkedIn) get auto-approved
-- 3. Local email users require admin approval after verification

-- Columns remain the same, only logic changes in application code
```

### **No Changes: `alumni_profiles` Table**

All existing fields remain the same. The simplified form only populates essential fields during onboarding:

```sql
-- Fields populated during onboarding:
first_name, last_name, student_id (optional),
degree, branch, graduation_year,
employment_status, current_company OR higher_study_institution,
current_city, is_profile_public

-- Fields left for later profile editing:
bio, skills, linkedin_url, github_url, interests,
phone, date_of_birth, profile_picture_url, etc.
```

---

## 🔧 Implementation Details

### **Backend Changes**

#### 1. **User Model** (`backend/src/models/User.js`)

**Before:**
```javascript
// Auto-approve institute emails
if (email.endsWith('@iiitnr.edu.in')) {
    is_approved = true;
    email_verified = true;
}
```

**After:**
```javascript
// OAuth providers are auto-approved and email-verified
if (provider === 'google' || provider === 'linkedin') {
    is_approved = true;
    email_verified = true;
}
// Local email users require manual admin approval
```

#### 2. **Registration Endpoint** (`backend/src/routes/auth.js`)

**Updated Response:**
```json
{
  "success": true,
  "message": "Registration successful! Please check your email to verify your account. After verification, an admin will review your account.",
  "requiresVerification": true,
  "requiresAdminApproval": true,
  "email": "user@example.com"
}
```

#### 3. **Onboarding Validation**

**Simplified to only check:**
- first_name (required)
- last_name (required)
- graduation_year (required)

### **Frontend Changes**

#### 1. **ProfileCompletion Component**

**Before:** 4-step wizard with 15+ fields

**After:** Single-page form with 10 fields (8 required, 2 optional)

**Key Features:**
- Dynamic label change based on employment status
  - "University Name" for Higher Studies
  - "Company Name" for Employed/Entrepreneur
- Conditional data mapping to appropriate database fields
- Clean, focused UI with clear section separations

#### 2. **Form Data Mapping**

```javascript
// Employment Status Logic
const isEmployed = formData.employment_status === 'Employed'
const isStudying = formData.employment_status === 'Higher Studies'

const profileData = {
  // ... basic fields ...
  
  // Conditional mapping
  ...(isEmployed && {
    currentCompany: formData.currently_at,
  }),
  ...(isStudying && {
    higherStudyInstitution: formData.currently_at,
  }),
}
```

---

## 🎨 User Experience Improvements

### **Before:**
- ✗ Institute emails auto-approved (security risk)
- ✗ 4-step onboarding form (high abandonment)
- ✗ Too many required fields (friction)
- ✗ Bio, LinkedIn, GitHub required (unnecessary)

### **After:**
- ✓ All users verified by admin (quality control)
- ✓ Single-page onboarding (low abandonment)
- ✓ Only 8 essential fields required
- ✓ Profile enrichment happens later (optional)

---

## 🔐 Security & Privacy

### **Email Verification**
- All email/password registrations require email verification
- Token expires in 24 hours
- Token is single-use and deleted after verification

### **Admin Approval**
- Manual approval workflow for quality control
- Admin can approve/reject from admin panel
- Users notified via email when approved

### **OAuth Security**
- Google OAuth handles email verification
- No password stored for OAuth users
- OAuth users auto-approved (trusted provider)

### **Privacy Controls**
- Users can choose profile visibility during onboarding
- Can update privacy settings anytime from profile
- Granular controls: contact info, work info, academic info visibility

---

## 🚀 Future Enhancements (Deferred)

These features are NOT part of the MVP but can be added later:

1. **Institute Email Verification**
   - Roll number + name + DOB verification
   - Integration with institute database
   - Auto-fill academic details

2. **Batch Upload**
   - Admin can upload CSV of verified alumni
   - Bulk account creation
   - Pre-approved accounts

3. **Alumni Referral**
   - Existing alumni can vouch for new registrations
   - Faster approval process
   - Community-driven verification

4. **Profile Enrichment**
   - Skills, bio, social links
   - Work experience timeline
   - Education history
   - Achievements & contributions

---

## 📊 Workflow Diagrams

### **Registration State Machine**

```
[NEW USER]
    │
    ├─→ Email/Password Registration
    │   └─→ [REGISTERED] (email_verified: false, is_approved: false)
    │       └─→ Email Verification Link Sent
    │           └─→ Click Link
    │               └─→ [VERIFIED] (email_verified: true, is_approved: false)
    │                   └─→ Admin Reviews
    │                       └─→ [APPROVED] (email_verified: true, is_approved: true)
    │                           └─→ Can Login
    │
    └─→ Google OAuth
        └─→ [APPROVED] (email_verified: true, is_approved: true)
            └─→ Can Login Immediately
```

### **Onboarding State Machine**

```
[FIRST LOGIN]
    │
    └─→ Check onboarding_completed
        │
        ├─→ FALSE: Redirect to /complete-profile
        │   └─→ Fill Onboarding Form
        │       └─→ Submit
        │           └─→ Create alumni_profile record
        │               └─→ Set onboarding_completed = TRUE
        │                   └─→ Redirect to /dashboard
        │
        └─→ TRUE: Redirect to /dashboard
```

---

## ✅ Testing Checklist

### **Email Registration Flow**
- [ ] User can register with valid email
- [ ] Duplicate email shows error
- [ ] Verification email is sent
- [ ] Verification link works correctly
- [ ] Cannot login before verification
- [ ] Cannot login before admin approval
- [ ] Can login after both verification + approval

### **OAuth Flow**
- [ ] Google login creates new user
- [ ] Google login returns existing user
- [ ] OAuth users can login immediately
- [ ] OAuth users redirected to onboarding if new

### **Onboarding Flow**
- [ ] Form validation works correctly
- [ ] All required fields enforced
- [ ] Optional fields can be skipped
- [ ] Employment status changes label dynamically
- [ ] Profile data saved to database
- [ ] onboarding_completed flag set correctly
- [ ] User redirected to dashboard after completion

### **Admin Approval Flow**
- [ ] Admin can see pending users
- [ ] Admin can approve users
- [ ] Admin can reject users
- [ ] Email notification sent on approval
- [ ] Approved users can login

---

## 📝 Environment Variables Required

```env
# Email Configuration (for verification emails)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Google OAuth (if using)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d
```

---

## 🐛 Known Limitations

1. **Roll Number Not Verified**
   - Users self-enter roll number
   - No validation against institute records
   - Can be left blank

2. **Manual Admin Approval**
   - Requires admin intervention
   - May cause delays for legitimate users
   - No automated verification

3. **Single Employment Status**
   - Users can only select one status
   - Doesn't handle dual situations (e.g., working + studying)

4. **No Document Upload**
   - Cannot verify identity with documents
   - Trust-based system

---

## 📞 Support & Contact

For implementation questions or issues:
1. Check admin panel for pending approvals
2. Verify email service is configured correctly
3. Check database constraints (email uniqueness, etc.)
4. Review server logs for errors

---

## 📅 Implementation Timeline

- ✅ Backend user model updated
- ✅ Registration endpoint modified
- ✅ Onboarding form simplified
- ✅ Frontend components updated
- ⏳ Testing in progress
- ⏳ Documentation review
- ⏳ Production deployment

---

## 🎯 Success Metrics

**Target KPIs:**
- Registration completion rate: >80%
- Onboarding completion rate: >90%
- Time to complete onboarding: <3 minutes
- Admin approval time: <24 hours

---

**Last Updated:** November 21, 2025
**Version:** 2.0 (Simplified Flow)
**Status:** Ready for Testing
