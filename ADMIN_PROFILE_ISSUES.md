# Admin Profile Issues - Investigation Report

## Current Problems

Admin accounts are currently being treated as if they are alumni accounts, which is incorrect. Admin accounts should NOT have:

- Profile sections
- Onboarding forms
- Alumni profiles in the database

## Issues Found

### 1. **Backend - Login Returns `onboardingCompleted` for ALL Users**

**Location:** [backend/src/routes/auth.js](backend/src/routes/auth.js#L567)

The login endpoint returns `onboardingCompleted: user.onboarding_completed || false` for **all users**, including admins:

```javascript
res.json({
  success: true,
  message: "Login successful",
  token,
  user: {
    id: user.id,
    email: user.email,
    role: user.role,
    isApproved: user.is_approved,
    isActive: user.is_active,
    onboardingCompleted: user.onboarding_completed || false, // ❌ Sent to admins too
    hasAlumniProfile,
  },
});
```

**Impact:** Admins are being told they need to complete onboarding, which doesn't apply to them.

### 2. **Backend - Profile Endpoint Serves ALL Users**

**Location:** [backend/src/routes/auth.js](backend/src/routes/auth.js#L1382-L1817)

The `/api/auth/profile` and `/api/auth/onboarding-data` endpoints serve alumni profile data to **any authenticated user**, including admins:

```javascript
router.get("/profile", authenticate, async (req, res) => {
  // No role check - serves to everyone including admins
  const userId = req.user.id;
  // ... fetches alumni profile data
});

router.get("/onboarding-data", authenticate, async (req, res) => {
  // No role check - serves to everyone including admins
  const userId = req.user.id;
  // ... fetches onboarding data
});
```

**Impact:** Admins can access and potentially see alumni-specific data structures.

### 3. **Backend - Onboarding Completion Endpoint for ALL Users**

**Location:** [backend/src/routes/auth.js](backend/src/routes/auth.js#L1821)

```javascript
router.post("/complete-onboarding", authenticate, async (req, res) => {
  // No role check - allows any user including admins
  const userId = req.user.id;
  // ... marks onboarding as complete
});
```

**Impact:** Admins could theoretically complete an "onboarding" that shouldn't exist for them.

### 4. **Frontend - OnboardingRoute Has Admin Bypass (PARTIAL FIX)**

**Location:** [frontend/src/components/auth/OnboardingRoute.jsx](frontend/src/components/auth/OnboardingRoute.jsx#L33)

There IS a bypass for admins in OnboardingRoute:

```javascript
// Admin users bypass onboarding requirement
if (user?.role === "admin") {
  return children;
}
```

**Status:** ✅ This is CORRECT and working

### 5. **Frontend - Header Shows Profile Link for Admins**

**Location:** [frontend/src/components/layout/Header.jsx](frontend/src/components/layout/Header.jsx#L181)

The header shows "My Profile" link for ALL authenticated users, including admins:

```jsx
{
  isUserDropdownOpen && (
    <div className={styles.dropdown}>
      <Link
        to="/profile"
        className={styles.dropdownItem}
        onClick={closeAllMenus}
      >
        My Profile {/* ❌ Shows for admins too */}
      </Link>
      <hr className={styles.divider} />
      <button className={styles.dropdownItem} onClick={handleLogout}>
        Logout
      </button>
    </div>
  );
}
```

**Impact:** Admins see a "My Profile" option that they shouldn't have access to.

### 6. **Frontend - Profile Page No Role Check**

**Location:** [frontend/src/pages/ProfileNew.jsx](frontend/src/pages/ProfileNew.jsx#L1-L100)

The Profile page component doesn't check if the user is an admin before rendering:

```javascript
const Profile = () => {
  const { user } = useAuth()
  // ❌ No check for user.role === 'admin'
  // Renders full alumni profile form for everyone
```

**Impact:** If an admin somehow navigates to `/profile`, they'll see an alumni profile form.

### 7. **Frontend - App Routing Inconsistency**

**Location:** [frontend/src/App.jsx](frontend/src/App.jsx#L53-L55)

The app correctly redirects admins on auth routes but uses onboarding logic for alumni:

```javascript
const authRedirectPath =
  user?.role === "admin"
    ? "/admin"
    : user?.onboardingCompleted
    ? "/dashboard"
    : "/complete-profile";
```

**Status:** ✅ This is CORRECT for auth redirect

However, the profile route is accessible to everyone:

```jsx
<Route
  path="/profile"
  element={
    <OnboardingRoute>
      <Profile /> {/* ❌ No admin check in the component itself */}
    </OnboardingRoute>
  }
/>
```

## Root Cause Analysis

The system was designed with the assumption that **all users are alumni** who need profiles and onboarding. Admin accounts were added later but not properly exempted from alumni-specific workflows.

## Required Fixes

### Backend Fixes

1. **Exclude admins from onboarding data in auth responses:**

   - `/api/auth/login` should NOT send `onboardingCompleted` for admins
   - `/api/auth/me` should NOT send `onboardingCompleted` for admins
   - `/api/auth/google` and `/api/auth/linkedin` should NOT send onboarding data for admins

2. **Add role checks to alumni-specific endpoints:**

   - `/api/auth/profile` should return error or minimal data for admins
   - `/api/auth/onboarding-data` should reject admin requests
   - `/api/auth/complete-onboarding` should reject admin requests

3. **Database:** Admins should never have rows in `alumni_profiles` table

### Frontend Fixes

1. **Header Component:**

   - Hide "My Profile" link for admins
   - Show admin-specific menu options instead

2. **Profile Page:**

   - Add role check at the top
   - Redirect admins to `/admin` if they try to access `/profile`

3. **App Routes:**

   - Wrap `/profile` route with an additional check to prevent admin access

4. **Dashboard/Other Components:**
   - Audit any other places that assume all users have profiles

## Testing Checklist

After fixes:

- [ ] Admin login should NOT return `onboardingCompleted` field
- [ ] Admin should NOT see "My Profile" in header dropdown
- [ ] Admin navigating to `/profile` should be redirected
- [ ] Admin should NOT be able to call `/api/auth/profile`
- [ ] Admin should NOT be able to call `/api/auth/onboarding-data`
- [ ] Admin should NOT be able to call `/api/auth/complete-onboarding`
- [ ] Alumni users should continue to work normally with profiles/onboarding
- [ ] Check database: no rows in `alumni_profiles` with admin user_ids

## Recommended Architecture

```
User Types:
├── Admin (role: 'admin' or 'superadmin')
│   ├── No profile
│   ├── No onboarding
│   └── Access to /admin dashboard only
│
└── Alumni (role: 'alumni')
    ├── Has alumni_profile
    ├── Requires onboarding
    └── Access to /dashboard, /profile, /directory, etc.
```
