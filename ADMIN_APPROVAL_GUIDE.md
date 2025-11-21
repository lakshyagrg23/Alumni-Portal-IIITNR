# Admin Guide: New Registration & Approval System

## 🎯 What Changed?

The registration system has been simplified for better security and user experience.

---

## 🔄 New Registration Flow

### **Before:**
- Institute email (@iiitnr.edu.in) → Auto-approved ✅
- Personal email → Auto-approved ✅
- OAuth (Google) → Auto-approved ✅

### **After:**
- Institute email (@iiitnr.edu.in) → **Requires admin approval** ⏳
- Personal email → **Requires admin approval** ⏳
- OAuth (Google) → Auto-approved ✅ (unchanged)

---

## 👨‍💼 Admin Responsibilities

As an admin, you now need to:

### **1. Review Pending Users**

Navigate to: **Admin Panel → User Management**

You'll see users with status:
- 🟡 **Pending Approval** - Email verified, awaiting your review
- 🔴 **Not Verified** - Registered but haven't verified email yet
- 🟢 **Approved** - Active users

### **2. Approve/Reject Users**

**When to Approve:**
- Email looks legitimate
- Name seems genuine
- User has completed onboarding
- No suspicious activity

**When to Reject:**
- Obviously fake email/name
- Spam account
- Duplicate registration
- Non-IIIT NR alumni

### **3. Notification Timeline**

When you approve a user:
1. System updates `is_approved = TRUE` in database
2. User receives approval email notification
3. User can now login and access the portal

---

## 📊 Current User States

### **State 1: Registered, Not Verified**
```
email_verified: FALSE
is_approved: FALSE
```
**Status:** Waiting for user to click verification link
**Action:** None needed, automatic

### **State 2: Verified, Pending Approval**
```
email_verified: TRUE
is_approved: FALSE
```
**Status:** ⚠️ **Requires your action!**
**Action:** Review and approve/reject from admin panel

### **State 3: Approved & Active**
```
email_verified: TRUE
is_approved: TRUE
onboarding_completed: TRUE
```
**Status:** ✅ Full access granted
**Action:** None needed

---

## 🔍 How to Approve Users

### **Option 1: From Admin Panel**

1. Login as admin
2. Navigate to **Admin Panel → User Management**
3. Filter by **Pending Approval**
4. Click on user to view details
5. Click **Approve** button
6. User will receive email notification

### **Option 2: Bulk Approval (Coming Soon)**

- Select multiple users
- Click **Bulk Approve**
- Confirm action

---

## 🚨 Important Notes

### **OAuth Users (Google Sign-In)**

These users are **auto-approved** because:
- Google verifies their email
- Trusted authentication provider
- Lower risk of spam

You don't need to approve OAuth users manually.

### **Email Verification Required First**

You cannot approve a user who hasn't verified their email yet.

The system will show:
- ✅ Email Verified → Can be approved
- ❌ Email Not Verified → Cannot approve yet

### **Onboarding Not Required for Approval**

You can approve users even if they haven't completed onboarding.

However, they won't be able to access protected features until onboarding is complete.

---

## 📧 Email Notifications

### **User Receives:**

1. **Registration Email** (automatic)
   - "Verify your email address"
   - Contains verification link

2. **Approval Email** (when you approve)
   - "Your account has been approved!"
   - Invitation to login

### **Admin Receives:**

- Email notification when new user registers (optional, can be enabled)
- Daily digest of pending approvals (optional)

---

## 🔐 Security Best Practices

### **Red Flags to Watch:**

1. **Email Patterns:**
   - Random characters (e.g., xj29dks@gmail.com)
   - Disposable email services (tempmail, guerrillamail)
   - Pattern matching existing spam

2. **Name Patterns:**
   - Single letter names
   - Numbers in names
   - Obvious fake names

3. **Suspicious Timing:**
   - Multiple registrations from same IP
   - Rapid-fire registrations
   - Off-hours registrations

### **When in Doubt:**

1. Check if email domain is legitimate
2. Google search the name + IIIT Naya Raipur
3. Check LinkedIn if available
4. Reach out to user for verification
5. Ask for roll number or batch details

---

## 📊 Admin Dashboard Metrics

You can track:
- Total pending approvals
- Approval rate (approved vs rejected)
- Average approval time
- User growth over time

**Target SLA:** Approve within 24 hours of email verification

---

## 🛠️ Troubleshooting

### **Issue: User says they can't login**

**Check:**
1. Is email verified? (Check `email_verified` column)
2. Is user approved? (Check `is_approved` column)
3. Is account active? (Check `is_active` column)

**Solution:**
- If not verified → Ask user to check email/resend verification
- If not approved → Approve from admin panel
- If not active → Activate from admin panel

### **Issue: User didn't receive approval email**

**Check:**
1. Verify email service is configured correctly
2. Check spam folder
3. Resend notification manually

**Solution:**
```sql
-- Check user email status
SELECT email, email_verified, is_approved 
FROM users 
WHERE email = 'user@example.com';
```

### **Issue: Too many pending approvals**

**Solution:**
1. Set aside dedicated time daily for approvals
2. Enable bulk approval feature
3. Consider auto-approval for @iiitnr.edu.in (code change needed)

---

## 📝 FAQ

### **Q: Why remove auto-approval for institute emails?**

**A:** For better quality control. Even institute email holders should be verified manually to prevent:
- Fake accounts using old/inactive emails
- Students who aren't actually alumni yet
- Accounts created for testing/spam

### **Q: Can I auto-approve certain email domains?**

**A:** Yes, but requires code change. Contact developer to whitelist specific domains.

### **Q: What if I accidentally reject a legitimate user?**

**A:** You can re-approve them from the admin panel. User won't be notified of the rejection.

### **Q: How long does email verification link last?**

**A:** 24 hours. After that, user needs to request a new verification email.

### **Q: Can users complete onboarding before approval?**

**A:** No. Users must be approved before they can login and complete onboarding.

---

## 🔄 Workflow Summary

```
User Registers
    ↓
Email Verification Link Sent
    ↓
User Clicks Link
    ↓
Email Verified ✅
    ↓
[ADMIN ACTION REQUIRED] ← You are here!
    ↓
Review User Details
    ↓
Approve/Reject Decision
    ↓
If Approved:
    ↓
User Receives Notification
    ↓
User Logs In
    ↓
User Completes Onboarding
    ↓
User Accesses Portal ✅
```

---

## 📞 Need Help?

**Technical Issues:**
- Check server logs: `/var/log/alumni-portal/`
- Database issues: Contact database admin
- Email service issues: Check SMTP configuration

**Policy Questions:**
- Who qualifies as alumni?
- Approval criteria?
- Rejection policy?

**Contact Developer:**
- For feature requests
- Bug reports
- System modifications

---

## ✅ Quick Reference

| User State | Email Verified | Approved | Can Login? | Action Needed |
|-----------|----------------|----------|------------|---------------|
| Registered | ❌ | ❌ | ❌ | Wait for user |
| Verified | ✅ | ❌ | ❌ | **Approve user** |
| Approved | ✅ | ✅ | ✅ | None |
| OAuth User | ✅ | ✅ | ✅ | None |

---

**Last Updated:** November 21, 2025
**Version:** 2.0
**For Questions:** Contact system administrator
