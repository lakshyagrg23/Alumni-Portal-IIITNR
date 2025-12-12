# Accreditation Dashboard V2 - Testing Guide

## ✅ Completed Steps

1. **Database Migration Applied** ✓

   - 7 SQL functions created successfully
   - Functions: get_batch_coverage, get_employment_outcomes, get_employment_summary, get_top_industries, get_top_companies, get_geographic_distribution, get_profile_quality_metrics

2. **Backend Updated** ✓

   - New reportQueries.js with 8 export functions
   - 8 new API endpoints in admin.js under `/api/admin/accreditation/`
   - No syntax errors detected

3. **Frontend Rebuilt** ✓
   - Complete new AccreditationDashboard.jsx (650 lines)
   - New AccreditationDashboard.module.css (350 lines)
   - 3 tabs: Coverage & Registration, Employment Outcomes, Career Insights
   - No syntax errors detected

## 🧪 Testing Steps

### Step 1: Restart Backend Server

```bash
cd backend
npm run dev
```

**Expected**: Server starts without errors on port 5000

### Step 2: Test API Endpoints (Optional - Using Postman/curl)

Get your admin token first, then test:

```bash
# Test overview endpoint
curl -H "x-auth-token: YOUR_TOKEN" "http://localhost:5000/api/admin/accreditation/overview?startYear=2015&endYear=2024"

# Test batch coverage endpoint
curl -H "x-auth-token: YOUR_TOKEN" "http://localhost:5000/api/admin/accreditation/batch-coverage?startYear=2015&endYear=2025"
```

**Expected**: JSON response with data

### Step 3: Access Frontend Dashboard

1. Start frontend (if not already running):

   ```bash
   cd frontend
   npm run dev
   ```

2. Login as admin

3. Navigate to: **Admin Dashboard → Accreditation** (or directly to `/admin/accreditation`)

### Step 4: Verify Dashboard Features

#### Coverage & Registration Tab:

- [ ] Batch-wise bar chart loads (Total Alumni vs Registered vs With Profile)
- [ ] Registration rate line chart loads
- [ ] Batch details table displays correctly
- [ ] Profile quality metrics cards show data
- [ ] Check a specific batch: does the data match your database?

#### Employment Outcomes Tab:

- [ ] Employment status pie chart loads
- [ ] Batch-wise stacked bar chart loads
- [ ] Positive outcome rate line chart loads
- [ ] Detailed employment table by batch displays
- [ ] Check employment numbers against database

#### Career Insights Tab:

- [ ] Top industries bar chart loads
- [ ] Top companies list displays
- [ ] Geographic distribution list displays
- [ ] Industry distribution table shows percentages

#### General Features:

- [ ] 4 KPI cards at top show correct totals
- [ ] Year range filter works (try changing years and clicking away from input)
- [ ] Export to CSV button downloads file
- [ ] CSV file contains correct data
- [ ] Dashboard is responsive (try resizing browser)
- [ ] No console errors in browser DevTools

### Step 5: Verify Data Accuracy

Pick one batch (e.g., 2023) and manually verify:

1. **Total Alumni** - Check institute_records:

   ```sql
   SELECT COUNT(*) FROM institute_records WHERE graduation_year = 2023;
   ```

2. **Registered Alumni** - Check users:

   ```sql
   SELECT COUNT(*)
   FROM users u
   JOIN institute_records ir ON u.institute_record_id = ir.id
   WHERE ir.graduation_year = 2023
     AND u.role = 'alumni'
     AND u.is_approved = true;
   ```

3. **With Profiles** - Check alumni_profiles:
   ```sql
   SELECT COUNT(*)
   FROM alumni_profiles ap
   JOIN users u ON ap.user_id = u.id
   WHERE u.role = 'alumni'
     AND u.is_approved = true
     AND ap.graduation_year = 2023;
   ```

**Expected**: Dashboard numbers match database queries

### Step 6: Test Edge Cases

1. **No data for recent years**: Set year range to 2025-2026

   - Expected: Empty charts but no errors

2. **Single year**: Set startYear = endYear = 2023

   - Expected: Shows only 2023 data

3. **Wide range**: Set startYear = 2000, endYear = 2030
   - Expected: Shows all available data

## 🐛 Common Issues & Solutions

### Issue: "Failed to load accreditation data"

**Solution**:

- Check backend is running
- Check browser console for actual error
- Verify token is valid (try logging out and back in)

### Issue: Charts are empty but no error

**Solution**:

- Check if you have data in alumni_profiles table
- Verify graduation_year values are reasonable (2015-2024)
- Check if users have role='alumni' and is_approved=true

### Issue: Coverage percentages are very low

**Solution**:

- This is expected! It shows real data
- It means many alumni from institute_records haven't registered yet
- This is actionable data for admins to improve alumni engagement

### Issue: SQL function errors in backend logs

**Solution**:

- Re-run migration: `psql -U postgres -d alumni_portal -f database/migrations/008_accreditation_v2_functions.sql`
- Check PostgreSQL version (needs 9.6+)

### Issue: Import errors in reportQueries.js

**Solution**:

- Check if your backend uses ES6 modules (import/export)
- If using CommonJS, change:

  ```javascript
  // Change this:
  import { query } from '../config/database.js';
  export async function getBatchCoverage() { }

  // To this:
  const { query } = require('../config/database');
  async function getBatchCoverage() { }
  module.exports = { getBatchCoverage, ... };
  ```

## 📊 Expected Data Patterns

### If You Have Good Data:

- Registration rate: 30-60% (this is actually good!)
- Profile completion: 60-80% of registered
- Positive outcome rate: 70-90% of registered alumni
- Recent batches have lower coverage (expected - they just graduated)

### If You Have Limited Data:

- Low registration rates are NORMAL and EXPECTED
- This dashboard makes it visible so you can take action
- Use the insights to drive alumni engagement campaigns

## 🎯 What Success Looks Like

1. ✅ Dashboard loads without errors
2. ✅ All charts display real data (even if small amounts)
3. ✅ Tables show batch-wise breakdowns
4. ✅ Coverage metrics clearly show registered vs total alumni
5. ✅ CSV export works and contains accurate data
6. ✅ Numbers match manual database queries

## 🚀 Next Actions After Testing

### If Everything Works:

1. **Document for your team** - Show them the new dashboard
2. **Export first report** - Generate CSV for leadership
3. **Identify gaps** - Which batches have low coverage?
4. **Plan outreach** - Use data to drive alumni engagement
5. **Monitor over time** - Watch coverage improve

### If Issues Found:

1. **Document the issue** - Screenshot and error message
2. **Check logs** - Backend console and browser console
3. **Verify data** - Run SQL queries manually
4. **Report back** - Share findings for debugging

---

## 📝 Test Results Template

Copy this and fill out as you test:

```
=== ACCREDITATION DASHBOARD V2 TEST RESULTS ===
Date: ___________
Tester: ___________

BACKEND:
[ ] Server starts successfully
[ ] No errors in console
[ ] API endpoints respond

FRONTEND:
[ ] Dashboard loads
[ ] Coverage tab works
[ ] Employment tab works
[ ] Insights tab works
[ ] KPI cards show data
[ ] Year filter works
[ ] CSV export works
[ ] Mobile responsive

DATA ACCURACY:
[ ] Batch coverage numbers verified
[ ] Employment outcomes verified
[ ] Industry data verified

ISSUES FOUND:
1. ___________
2. ___________
3. ___________

OVERALL STATUS: [PASS / FAIL / PARTIAL]

NOTES:
___________________________________________
___________________________________________
```

---

**Ready to test!** Follow the steps above and report back with results. 🎉
