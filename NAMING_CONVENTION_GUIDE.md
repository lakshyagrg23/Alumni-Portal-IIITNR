# Naming Convention Guide - CamelCase vs Snake_Case Issue

## The Problem: Why Is This Happening?

The Alumni Portal codebase has a **mixed naming convention** that causes bugs:

### Database Layer (PostgreSQL)

- **Uses**: `snake_case` (PostgreSQL standard)
- **Examples**: `graduation_year`, `current_company`, `student_id`
- **Reason**: PostgreSQL convention, case-insensitive column names

### Backend Layer (Node.js/Express)

- **Uses**: **camelCase** (JavaScript standard)
- **Examples**: `graduationYear`, `currentCompany`, `studentId`
- **Reason**: JavaScript/Node.js naming conventions
- **Conversion**: Backend converts snake_case from DB to camelCase for API responses

### Frontend Layer (React)

- **Should Use**: **camelCase** (JavaScript/React standard)
- **Examples**: `graduationYear`, `currentCompany`, `studentId`
- **Problem**: Some old code still uses snake_case HTML attributes

## Why This Causes Bugs

### Example Bug Scenario:

```jsx
// State (camelCase) ✅
const [profileData, setProfileData] = useState({
  graduationYear: '2020',
  currentCompany: 'Google'
})

// Form Field (snake_case) ❌
<input
  name="graduation_year"  // Wrong!
  value={profileData.graduation_year}  // undefined!
  onChange={handleInputChange}
/>

// What happens:
// 1. User types "2021"
// 2. handleInputChange tries to update profileData.graduation_year
// 3. But state has profileData.graduationYear (camelCase)
// 4. React creates NEW property: graduation_year: "2021"
// 5. Original graduationYear: "2020" is untouched
// 6. Form submits both values (confusing backend)
// 7. Data doesn't save properly
```

## The Standard: JavaScript/React Uses CamelCase

**✅ ALWAYS use camelCase in JavaScript/React code:**

```jsx
// State
const [data, setData] = useState({
  firstName: '',
  lastName: '',
  graduationYear: '',
  currentCompany: ''
})

// Form fields
<input name="firstName" value={data.firstName} />
<input name="graduationYear" value={data.graduationYear} />

// Object properties
const user = {
  firstName: 'John',
  lastName: 'Doe',
  graduationYear: 2020
}

// Function names
const handleInputChange = () => {}
const fetchUserData = () => {}
```

## Project-Wide Naming Standards

### ✅ Frontend (React/JavaScript)

- **Variables**: `camelCase`
- **Constants**: `UPPER_SNAKE_CASE`
- **Components**: `PascalCase`
- **Files**: `PascalCase.jsx` for components, `camelCase.js` for utilities
- **CSS Classes**: `kebab-case` or `camelCase` (via CSS Modules)
- **Form Fields**: `camelCase` (matches state)
- **API Calls**: `camelCase` (JavaScript convention)

```jsx
// ✅ Good
const userName = 'John'
const MAX_USERS = 100
const UserProfile = () => {}
<input name="firstName" />

// ❌ Bad
const user_name = 'John'  // Don't use snake_case
const max_users = 100      // Use UPPER_SNAKE_CASE for constants
<input name="first_name" /> // Don't use snake_case in HTML
```

### ✅ Backend (Node.js/Express)

- **Variables**: `camelCase`
- **Constants**: `UPPER_SNAKE_CASE`
- **Functions**: `camelCase`
- **Database Fields**: Convert snake_case → camelCase
- **API Responses**: `camelCase` JSON
- **File Names**: `camelCase.js`

```javascript
// ✅ Good
const userData = await User.findById(id);
const API_VERSION = "v1";

// API Response (camelCase)
res.json({
  success: true,
  data: {
    firstName: "John",
    graduationYear: 2020,
    currentCompany: "Google",
  },
});

// ❌ Bad - Don't send snake_case to frontend
res.json({
  first_name: "John",
  graduation_year: 2020,
});
```

### ✅ Database (PostgreSQL)

- **Tables**: `snake_case` plural (e.g., `alumni_profiles`, `work_experiences`)
- **Columns**: `snake_case` (e.g., `graduation_year`, `current_company`)
- **Primary Keys**: `id`
- **Foreign Keys**: `table_name_id` (e.g., `user_id`, `alumni_profile_id`)

```sql
-- ✅ Good
CREATE TABLE alumni_profiles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  first_name VARCHAR(100),
  graduation_year INTEGER,
  current_company VARCHAR(255)
);

-- ❌ Bad
CREATE TABLE AlumniProfiles (  -- Don't use PascalCase
  Id SERIAL PRIMARY KEY,        -- Don't capitalize
  firstName VARCHAR(100)        -- Don't use camelCase
);
```

## How Data Flows Through Layers

```
[DATABASE]           [BACKEND]              [FRONTEND]
snake_case    →   snake_case to      →     camelCase
                   camelCase

graduation_year  →  graduationYear     →    graduationYear
current_company  →  currentCompany     →    currentCompany
student_id       →  studentId          →    studentId
```

### Example: Reading Data

```javascript
// 1. Database query (snake_case)
const dbResult = await db.query(
  "SELECT graduation_year, current_company FROM alumni_profiles"
);

// 2. Backend converts to camelCase
const alumni = {
  graduationYear: dbResult.rows[0].graduation_year,
  currentCompany: dbResult.rows[0].current_company,
};

// 3. API sends camelCase
res.json({ data: alumni });

// 4. Frontend receives camelCase
const response = await fetch("/api/alumni");
const data = await response.json();
console.log(data.graduationYear); // ✅ Works
console.log(data.graduation_year); // ❌ undefined
```

### Example: Writing Data

```javascript
// 1. Frontend sends camelCase
const updateData = {
  graduationYear: 2020,
  currentCompany: "Google",
};
await fetch("/api/profile", {
  method: "PUT",
  body: JSON.stringify(updateData),
});

// 2. Backend receives camelCase and converts to snake_case for DB
const { graduationYear, currentCompany } = req.body;
await db.query(
  "UPDATE alumni_profiles SET graduation_year = $1, current_company = $2",
  [graduationYear, currentCompany]
);
```

## Fixing Existing Code

### Step 1: Identify Snake_Case in Frontend

```bash
# Search for snake_case HTML attributes
grep -r 'name="[a-z_]*_[a-z_]*"' frontend/src/
```

### Step 2: Update Form Fields

```jsx
// ❌ Before (snake_case)
<input
  name="graduation_year"
  value={profileData.graduation_year}
/>

// ✅ After (camelCase)
<input
  name="graduationYear"
  value={profileData.graduationYear}
/>
```

### Step 3: Ensure State Matches

```jsx
// ✅ State should use camelCase
const [profileData, setProfileData] = useState({
  graduationYear: "",
  currentCompany: "",
  studentId: "",
});
```

### Step 4: Verify Backend Sends CamelCase

```javascript
// ✅ Backend should send camelCase
router.get("/profile", async (req, res) => {
  const dbData = await getFromDatabase();

  // Convert snake_case to camelCase
  const profileData = {
    firstName: dbData.first_name,
    graduationYear: dbData.graduation_year,
    currentCompany: dbData.current_company,
  };

  res.json({ success: true, data: profileData });
});
```

## Prevention Checklist

When adding new features:

- [ ] Use camelCase for ALL JavaScript variables
- [ ] Use camelCase for ALL React state properties
- [ ] Use camelCase for ALL form field `name` attributes
- [ ] Use snake_case ONLY in SQL queries
- [ ] Convert snake_case to camelCase when reading from DB
- [ ] Convert camelCase to snake_case when writing to DB
- [ ] Never mix both conventions in the same layer

## Tools to Help

### ESLint Rule (Add to .eslintrc.json)

```json
{
  "rules": {
    "camelcase": [
      "error",
      {
        "properties": "always",
        "ignoreDestructuring": false
      }
    ]
  }
}
```

### Utility Function for Conversion

```javascript
// backend/src/utils/caseConverter.js

/**
 * Convert snake_case object keys to camelCase
 */
export function snakeToCamel(obj) {
  if (Array.isArray(obj)) {
    return obj.map(snakeToCamel);
  } else if (obj !== null && typeof obj === "object") {
    return Object.keys(obj).reduce((acc, key) => {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) =>
        letter.toUpperCase()
      );
      acc[camelKey] = snakeToCamel(obj[key]);
      return acc;
    }, {});
  }
  return obj;
}

/**
 * Convert camelCase object keys to snake_case
 */
export function camelToSnake(obj) {
  if (Array.isArray(obj)) {
    return obj.map(camelToSnake);
  } else if (obj !== null && typeof obj === "object") {
    return Object.keys(obj).reduce((acc, key) => {
      const snakeKey = key.replace(
        /[A-Z]/g,
        (letter) => `_${letter.toLowerCase()}`
      );
      acc[snakeKey] = camelToSnake(obj[key]);
      return acc;
    }, {});
  }
  return obj;
}

// Usage:
const dbData = { graduation_year: 2020, current_company: "Google" };
const apiData = snakeToCamel(dbData);
// { graduationYear: 2020, currentCompany: 'Google' }
```

## Summary

**Golden Rule**:

- **Database**: snake_case (PostgreSQL standard)
- **Backend**: camelCase (JavaScript standard)
- **Frontend**: camelCase (JavaScript/React standard)
- **Conversion**: Backend converts between snake_case ↔ camelCase

**Never** mix conventions within the same layer!

## Files Already Fixed

- ✅ `frontend/src/pages/Profile.jsx` - Academic & Professional tabs now use camelCase
- ✅ `backend/src/routes/auth.js` - Already uses camelCase for API

## Files That May Need Checking

- Check other form components for snake_case HTML attributes
- Verify all API responses use camelCase
- Ensure database query results are converted to camelCase before sending to frontend
