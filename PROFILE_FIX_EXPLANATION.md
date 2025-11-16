# Profile Update Issue - Root Cause & Solution

## Problem Summary

Academic and Professional details were not being saved when updating the profile, while Basic Info, Social Links, and Privacy settings were saving correctly.

## Root Cause Analysis

### The Data Flow Issue

The problem was a **naming convention mismatch** between different parts of the code:

1. **Backend API** (auth.js):

   - Expects data in **camelCase** format
   - Fields like: `graduationYear`, `studentId`, `currentCompany`, `currentPosition`, etc.

2. **Frontend State** (Profile.jsx):

   - Initially stored data in **camelCase** format
   - State had: `graduationYear`, `studentId`, `currentCompany`, etc.

3. **Form Input Fields**:
   - **Basic Tab**: Used camelCase names ✅ (`firstName`, `lastName`, `bio`, `profilePicture`)
   - **Academic Tab**: Used snake_case names ❌ (`graduation_year`, `roll_number`)
   - **Professional Tab**: Used snake_case names ❌ (`current_company`, `current_position`, `current_city`, etc.)
   - **Social Tab**: Used camelCase names ✅ (`linkedinUrl`, `githubUrl`, `portfolioUrl`)

### Why This Caused the Bug

When a user typed in the Academic or Professional tabs:

1. The input field with `name="graduation_year"` triggered `handleInputChange`
2. The function tried to update `profileData.graduation_year`
3. But the state only had `profileData.graduationYear` (camelCase)
4. React created a **new property** `graduation_year` instead of updating the existing one
5. When the form submitted:
   - The original `graduationYear: "2020"` was still in state
   - But there was also `graduation_year: "2021"` (the new value)
   - The backend received both and got confused, or only read the camelCase version
6. After reloading, the data came back with the old values because the update never properly happened

### Why Other Tabs Worked

- **Basic Tab**: Fields used `firstName`, `lastName` which matched state ✅
- **Social Tab**: Fields used `linkedinUrl`, `githubUrl` which matched state ✅
- **Privacy Tab**: Field used `isProfilePublic` which matched state ✅

## Solution Implemented

Instead of changing all the form field names (which risks breaking existing functionality), we implemented a **dual-property sync approach**:

### 1. Added Snake_Case Properties to State

```javascript
const [profileData, setProfileData] = useState({
  // Existing camelCase properties
  graduationYear: "",
  studentId: "",
  currentCompany: "",
  // ... etc

  // NEW: Add snake_case versions for form binding
  graduation_year: "",
  roll_number: "",
  current_company: "",
  // ... etc
});
```

### 2. Load Both Versions from Backend

```javascript
const newProfileData = {
  // camelCase versions (for backend submission)
  graduationYear: data.alumniProfile?.graduation_year || "",
  currentCompany: data.alumniProfile?.current_company || "",

  // snake_case versions (for form field binding)
  graduation_year: data.alumniProfile?.graduation_year || "",
  current_company: data.alumniProfile?.current_company || "",
};
```

### 3. Sync on Submit

```javascript
// Before sending to backend, sync snake_case values to camelCase
if (updateData.graduation_year) {
  updateData.graduationYear = updateData.graduation_year;
}
if (updateData.current_company) {
  updateData.currentCompany = updateData.current_company;
}

// Then remove snake_case versions
delete updateData.graduation_year;
delete updateData.current_company;
// ... etc

// Send only camelCase to backend
await authService.updateProfile(updateData);
```

## How It Works Now

1. **On Load**: Both camelCase and snake_case properties are populated with the same values
2. **On Edit**: User types in `graduation_year` field → updates `profileData.graduation_year`
3. **On Submit**:
   - Sync: `graduation_year` value is copied to `graduationYear`
   - Clean: Remove all snake_case properties
   - Send: Only camelCase data goes to backend
4. **Backend**: Receives clean camelCase data and saves it correctly
5. **Reload**: Fresh data comes back and populates both property versions again

## Benefits of This Approach

✅ **No Breaking Changes**: Existing form fields don't need to be renamed  
✅ **Maintains Compatibility**: Works with existing HTML structure  
✅ **Clean Backend API**: Backend only sees camelCase as expected  
✅ **Easy to Maintain**: Clear sync logic in one place  
✅ **Future-Proof**: Can gradually migrate to full camelCase if needed

## Testing Checklist

- [ ] Load profile page - all fields should display current values
- [ ] Edit Basic Info tab - should save correctly
- [ ] Edit Academic tab - should save correctly (this was broken)
- [ ] Edit Professional tab - should save correctly (this was broken)
- [ ] Edit Social Links tab - should save correctly
- [ ] Edit Privacy settings - should save correctly
- [ ] Verify all changes persist after page reload
- [ ] Check browser console for any errors

## Alternative Approach (Not Used)

We could have renamed all form fields to camelCase:

```jsx
// Change from:
<input name="graduation_year" />
// To:
<input name="graduationYear" />
```

**Why we didn't do this:**

- More invasive changes across multiple form sections
- Risk of missing some fields and creating new bugs
- Would need to update all field IDs and labels for consistency
- The dual-property approach is safer and easier to verify

## Files Modified

- `frontend/src/pages/Profile.jsx`:
  - Updated initial state to include snake_case properties
  - Updated `loadProfileData()` to populate both property versions
  - Updated `handleSubmit()` to sync and clean before sending to backend

## Related Files (No Changes Needed)

- `backend/src/routes/auth.js` - Already handles camelCase correctly
- `frontend/src/services/authService.js` - No changes needed
- `frontend/src/pages/Profile.module.css` - No styling changes needed
