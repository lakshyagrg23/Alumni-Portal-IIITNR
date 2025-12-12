# New Onboarding Flow Implementation

## Overview

Implemented a streamlined 2-page onboarding flow that collects structured profile data from new users after registration.

## Components Created

### 1. OnboardingNew.jsx (Page 1 - Required Fields)

**Path:** `frontend/src/pages/OnboardingNew.jsx` (820 lines)

**Features:**

- Welcome card with prefilled institute data (read-only)
- Profile picture upload (required, with webcam support)
- Professional interests selection (chip-based, 3-7 required)
- LinkedIn URL (required with validation)
- Career goals (checkbox selection, at least 1)
- **Alumni-only sections:**
  - Current location (city, state, country)
  - Employment status with conditional fields:
    - Full-time: Company + Position
    - Self-employed: Company/Venture + Role
    - Freelancing: Service area
    - Looking for opportunities: Target role
    - Higher education: Institution + Program
  - Industry selection

**Validation:**

- Dynamic validation based on `isCurrentStudent` flag (graduation year > current year)
- Students: 5 required fields (picture, 3-7 interests, LinkedIn, 1+ career goals)
- Alumni: 10-12 required fields (student fields + location, employment, industry)

### 2. OnboardingOptional.jsx (Page 2 - Optional Fields)

**Path:** `frontend/src/pages/OnboardingOptional.jsx` (200 lines)

**Features:**

- Additional social profiles:
  - GitHub URL
  - Twitter/X URL
  - Portfolio/Personal Website URL
- **Alumni-only:**
  - Community engagement toggles:
    - Interested in mentoring
    - Open to job referrals
    - Available for guest speaking
- Progress indicator showing step 2/2
- Prominent "Skip for Now" button

### 3. CSS Modules

**OnboardingNew.module.css:**

- Modern gradient welcome card with user info display
- Inline profile picture upload with preview
- Chip-based professional interests grid
- Checkbox list for career goals
- Conditional employment fields with smooth transitions
- Error handling with red highlights
- Responsive design for mobile

**OnboardingOptional.module.css:**

- Clean centered header
- Labeled social media inputs with icons
- Toggle switches for community engagement
- Progress indicator with completed/active states
- Minimal, unintimidating design

## Routing Updates

### App.jsx Changes

Added two new protected routes:

```jsx
/onboarding          → OnboardingNew (Page 1)
/onboarding/optional → OnboardingOptional (Page 2)
```

### Registration Flow Updates

Updated all auth flows to redirect to `/onboarding` instead of `/complete-profile`:

- **RegisterInstituteEmail.jsx** ✓
- **RegisterPersonalEmail.jsx** ✓
- **Register.jsx** (old component) ✓
- **Login.jsx** ✓
- **LinkedInCallback.jsx** ✓

## User Experience Flow

### For Students:

1. **Register** → Email verification
2. **Page 1 (Onboarding):**
   - See prefilled data (name, roll, degree, expected year)
   - Upload profile picture ✓ Required
   - Select 3-7 professional interests ✓ Required
   - Enter LinkedIn URL ✓ Required
   - Select career goals ✓ Required
   - Click "Complete Profile →"
3. **Page 2 (Optional):**
   - Add GitHub/Twitter/Portfolio (optional)
   - Click "Complete & Go to Dashboard" or "Skip for Now"
4. **Dashboard** with 100% profile completion

### For Alumni:

1. **Register** → Email verification
2. **Page 1 (Onboarding):**
   - See prefilled data (name, roll, degree, graduation year)
   - Upload profile picture ✓ Required
   - Select 3-7 professional interests ✓ Required
   - Enter LinkedIn URL ✓ Required
   - Select career goals ✓ Required
   - **Additional alumni-only fields:**
     - Enter current location (city, state, country) ✓ Required
     - Select employment status ✓ Required
     - Fill conditional fields based on status ✓ Required
     - Select industry ✓ Required
   - Click "Complete Profile →"
3. **Page 2 (Optional):**
   - Add GitHub/Twitter/Portfolio (optional)
   - **Alumni-only:**
     - Toggle mentoring interest
     - Toggle referral availability
     - Toggle speaking availability
   - Click "Complete & Go to Dashboard" or "Skip for Now"
4. **Dashboard** with 100% profile completion

## Key Technical Details

### Student vs Alumni Detection

```javascript
const gradYear = alumni.graduationYear || 0;
const currentYear = new Date().getFullYear();
const isStudent = gradYear > currentYear;
```

### Conditional Validation

- Students: Skip professional/location fields
- Alumni: Validate all professional fields + location
- Dynamic error messages based on employment status

### Data Submission

- Page 1: Saves all required fields to backend via `authService.updateProfile()`
- Page 2: Saves optional fields to backend via `authService.updateProfile()`
- Both pages can be skipped (Page 2 only) with "Skip for Now"

### Profile Picture Upload

- Inline implementation with axios multipart/form-data
- 2MB limit, JPEG/PNG/WebP only
- Immediate preview after upload
- Required on Page 1, blocking submission

## Benefits Over Old Flow

1. **Single-page focused approach** - No overwhelming multi-step wizard
2. **Clear required vs optional** - Page 1 required, Page 2 optional
3. **Smart conditionals** - Only shows relevant fields per user type
4. **Modern UI** - Gradient cards, chips, toggles, smooth animations
5. **Better UX** - Progress visible, can skip optional page entirely
6. **Structured data** - Replaces free-text bio with actionable fields
7. **Faster completion** - Students: 5 fields, Alumni: 10-12 fields vs old 15+ fields

## Backend Compatibility

Uses existing endpoints:

- `PUT /api/auth/profile` - Updates alumni profile with new structured fields
- `POST /api/alumni/profile/upload-picture` - Handles profile picture upload

No backend changes required - all new fields already exist in database from previous migration.

## Testing Checklist

- [ ] Register as student (expected grad year > 2025)
  - [ ] Verify only 5 required fields shown
  - [ ] Verify no location/employment sections
  - [ ] Verify no community engagement on Page 2
- [ ] Register as alumni (expected grad year ≤ 2025)
  - [ ] Verify all professional fields shown
  - [ ] Verify conditional employment fields work
  - [ ] Verify community engagement on Page 2
- [ ] Upload profile picture
- [ ] Submit Page 1 with valid data
- [ ] Skip Page 2
- [ ] Submit Page 2 with data
- [ ] Verify dashboard shows 100% completion
- [ ] Verify profile page shows all entered data

## File Locations

```
frontend/src/pages/
├── OnboardingNew.jsx (820 lines)
├── OnboardingNew.module.css (587 lines)
├── OnboardingOptional.jsx (200 lines)
└── OnboardingOptional.module.css (310 lines)

frontend/src/App.jsx (updated routes)

frontend/src/pages/auth/
├── RegisterInstituteEmail.jsx (updated redirect)
├── RegisterPersonalEmail.jsx (updated redirect)
├── Register.jsx (updated redirect)
├── Login.jsx (updated redirect)
└── LinkedInCallback.jsx (updated redirect)
```

## Next Steps

1. Test the complete flow with both student and alumni accounts
2. Verify profile completion calculation on dashboard
3. Check that all data saves correctly to database
4. Test mobile responsiveness
5. Add webcam capture option for profile picture (future enhancement)
6. Consider adding tooltips/help text for complex fields
