# Accreditation Dashboard Data Fetching Investigation

## Issue Summary
Graphs under "Employment Outcomes" and "Career Insights" tabs are not being plotted in the accreditation dashboard, indicating that data is not being fetched correctly from the database.

## Root Cause Analysis

### Issue 1: Column Name Mismatch (PRIMARY ISSUE)
**Location**: Database migration `008_accreditation_v2_functions.sql`

The SQL functions `get_top_industries()` and `get_top_companies()` reference a column named `current_company`, but the actual database column is named `current_employer`.

#### Evidence:
- **Migration 007**: Defines column as `ADD COLUMN IF NOT EXISTS current_employer VARCHAR(200)`
- **Migration 008**: Functions query using `ap.current_company` which doesn't exist
  - Line 164-165: `AND ap.current_company IS NOT NULL AND ap.current_company != ''`
  - Line 203: `SELECT ap.current_company`
  - Line 211-212: `AND ap.current_company IS NOT NULL AND ap.current_company != ''`

#### Impact:
When these functions execute, they:
1. Return ZERO rows because the column reference is invalid
2. This causes empty data arrays to be sent to the frontend
3. Charts fail to render because there's no data to display

### Affected Functions:
1. **get_top_industries()** - Returns top industries where alumni work
2. **get_top_companies()** - Returns top companies where alumni are employed

### Affected Frontend Components:
- **Career Insights Tab**: 
  - "Top Industries" chart (bar chart)
  - "Top Companies" list
  - "Industry Distribution" table

The "Employment Outcomes" tab graphs might also have issues if they depend on employment status data being correctly populated in user profiles.

## Related Columns That Should Exist:
Based on migration 007, the following employment-related columns should exist:
- ✅ `employment_status` - Employment status (Employed, Self-employed, etc.)
- ✅ `current_employer` - Current company/employer name
- ✅ `current_job_title` - Job title
- ✅ `industry_sector` - Industry sector
- ✅ `job_location` - Job location
- ✅ `job_start_year` - Year started current job
- ✅ `annual_salary_range` - Salary range
- ✅ `job_type` - Job type (Full-time, Part-time, etc.)

## Solution Applied

### 1. Fixed Migration File
Updated `database/migrations/008_accreditation_v2_functions.sql`:
- Changed `ap.current_company` → `ap.current_employer` in `get_top_industries()` function
- Changed `ap.current_company` → `ap.current_employer` in `get_top_companies()` function

### 2. Created Migration Script
Created `database/migrations/fix_accreditation_column_references.sql` to:
- Drop and recreate the affected functions with correct column names
- Properly reference `current_employer` instead of `current_company`

## Next Steps to Verify Fix:

1. **Apply the migration**:
   ```bash
   cd backend
   psql -f ../database/migrations/fix_accreditation_column_references.sql
   ```

2. **Test the API endpoints**:
   ```bash
   curl "http://localhost:5000/api/admin/accreditation/top-industries?startYear=2015&endYear=2024"
   curl "http://localhost:5000/api/admin/accreditation/top-companies?startYear=2015&endYear=2024"
   ```

3. **Verify frontend**:
   - Navigate to Admin Dashboard → Accreditation Dashboard
   - Click on "Career Insights" tab
   - Check if "Top Industries" chart and "Top Companies" list now display data

## Additional Recommendations

1. **Data Population**: Ensure alumni profiles are being updated with employment information:
   - Run a check to see how many profiles have `employment_status` populated
   - Run a check to see how many profiles have `current_employer` populated

2. **Query Validation**: After applying the fix, run test queries:
   ```sql
   SELECT * FROM get_top_industries(2015, 2024, 10);
   SELECT * FROM get_top_companies(2015, 2024, 15);
   ```

3. **Frontend Console**: Check browser console for any API errors while the dashboard loads
   - Look for 404 or 500 errors on the accreditation endpoints
   - Check the Network tab to see actual API responses

## Data Flow Verification

### Frontend Requests (AccreditationDashboard.jsx lines 55-64):
The dashboard makes 8 parallel API calls:
1. `/admin/accreditation/overview` - Dashboard KPI cards
2. `/admin/accreditation/batch-coverage` - Coverage tab charts
3. `/admin/accreditation/employment-outcomes` - Employment tab charts (LINE CHARTS)
4. `/admin/accreditation/employment-summary` - Employment tab pie chart
5. `/admin/accreditation/top-industries` - Career insights bar chart ❌ AFFECTED
6. `/admin/accreditation/top-companies` - Career insights list ❌ AFFECTED  
7. `/admin/accreditation/geographic-distribution` - Career insights list
8. `/admin/accreditation/profile-quality` - Coverage tab cards

### Backend Routes (admin.js):
- Lines 1057-1061: GET `/accreditation/employment-outcomes` → calls `getEmploymentOutcomes()`
- Lines 1094-1100: GET `/accreditation/top-industries` → calls `getTopIndustries()` ❌ BROKEN
- Lines 1115-1121: GET `/accreditation/top-companies` → calls `getTopCompanies()` ❌ BROKEN

### Database Functions (008_accreditation_v2_functions.sql):
- `get_employment_outcomes()` - Works correctly (uses graduation_year and employment_status)
- `get_top_industries()` - **BROKEN** - References non-existent `current_company` column
- `get_top_companies()` - **BROKEN** - References non-existent `current_company` column
- `get_geographic_distribution()` - Uses `current_city` and `current_country` ✅ (These exist)

## Files Modified
- `database/migrations/008_accreditation_v2_functions.sql` - Fixed column references
- `database/migrations/fix_accreditation_column_references.sql` - NEW migration script

## Testing Checklist

After applying the migration:

- [ ] Apply migration: `psql -d alumni_portal -f fix_accreditation_column_references.sql`
- [ ] Test SQL function directly: 
  ```sql
  SELECT * FROM get_top_industries(2015, 2024, 10);
  SELECT * FROM get_top_companies(2015, 2024, 15);
  ```
- [ ] Check if API returns data:
  ```bash
  curl -H "Authorization: Bearer <token>" \
    "http://localhost:5000/api/admin/accreditation/top-industries?startYear=2015&endYear=2024"
  ```
- [ ] Navigate to Admin Dashboard → Accreditation Dashboard
- [ ] Check "Career Insights" tab:
  - [ ] "Top Industries" bar chart should display data
  - [ ] "Top Companies" list should display data
  - [ ] "Industry Distribution" table should show percentages
- [ ] Check browser console for any network errors
- [ ] Check network tab (DevTools) for 500 errors on API calls

## Secondary Issues to Investigate

1. **Data Population Issue**: Even after fixing the queries, if alumni profiles don't have employment data filled in:
   - Check how many profiles have `employment_status` populated
   - Check how many profiles have `current_employer` populated
   - Check alumni onboarding flow to ensure data is being saved

2. **Alternative Column Names**: Verify if any profiles are using different field names:
   - Check if some profiles use `current_company` instead of `current_employer`
   - Check if there are legacy fields that need mapping
