# Accreditation Dashboard Setup Guide

## Prerequisites

- PostgreSQL 12+ installed and running
- Node.js 16+ and npm installed
- Git (for cloning repository)
- Admin access to Alumni Portal

## Step-by-Step Setup

### Step 1: Database Setup

#### 1.1 Ensure Database Exists
```bash
# Connect to PostgreSQL
psql -U postgres

# Create database if not exists
CREATE DATABASE alumni_portal;

# Exit psql
\q
```

#### 1.2 Run Migrations

**Method A: Using psql (Recommended)**
```bash
# Navigate to migrations directory
cd database/migrations

# Run all migrations
psql -U postgres -d alumni_portal -f run_all_migrations.sql
```

**Method B: Using Node.js Script**
```bash
# From project root
cd backend
node scripts/run-migrations.js
```

#### 1.3 Verify Migration Success
```bash
psql -U postgres -d alumni_portal

# Check migration tracking
SELECT * FROM schema_migrations ORDER BY applied_at;

# Verify new tables exist
\dt

# Check alumni_profiles has new columns
\d alumni_profiles

# Exit
\q
```

Expected output: You should see:
- `alumni_contributions`
- `alumni_achievements`
- `placement_data`
- `higher_education_data`
- New columns in `alumni_profiles`

### Step 2: Seed Test Data (Optional but Recommended)

```bash
# From backend directory
cd backend

# Run seed script
node scripts/seed-accreditation-data.js
```

This will populate:
- ~100 placement records
- ~50 higher education records
- ~60 contributions
- ~60 achievements
- Update existing alumni profiles with accreditation data

**Verify seeding:**
```bash
psql -U postgres -d alumni_portal

SELECT COUNT(*) FROM placement_data;
SELECT COUNT(*) FROM higher_education_data;
SELECT COUNT(*) FROM alumni_contributions;
SELECT COUNT(*) FROM alumni_achievements;

\q
```

### Step 3: Install Backend Dependencies

```bash
cd backend

# Install new dependency for CSV export
npm install json2csv

# Verify installation
npm list json2csv
```

### Step 4: Environment Configuration

Ensure `backend/.env` has correct database configuration:

```env
# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/alumni_portal

# Server
PORT=5000
NODE_ENV=development

# JWT
JWT_SECRET=your_very_secure_secret_key_here

# Other existing variables...
```

### Step 5: Start Backend Server

```bash
cd backend

# Development mode
npm run dev

# Or production mode
npm start
```

**Verify backend is running:**
- Open browser: `http://localhost:5000/health`
- Should see: `{"status":"OK","message":"IIIT NR Alumni Portal API is running"}`

### Step 6: Test Report Endpoints

#### 6.1 Login as Admin
```bash
# Use your API client (Postman/Insomnia) or curl
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@iiitnr.edu.in",
    "password": "your_admin_password"
  }'
```

Save the returned `token`.

#### 6.2 Test Overview Endpoint
```bash
# Replace YOUR_TOKEN with actual token from login
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/admin/reports/overview
```

Expected response:
```json
{
  "success": true,
  "data": {
    "total_alumni": 150,
    "employed_count": 105,
    "higher_studies_count": 30,
    "placement_rate": 70.00,
    "higher_studies_rate": 20.00,
    ...
  },
  ...
}
```

#### 6.3 Test Other Endpoints
```bash
# Placements
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:5000/api/admin/reports/placements?limit=10"

# Higher Studies
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/admin/reports/higher-studies

# Summary (comprehensive)
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/admin/reports/summary
```

### Step 7: Test Export Functionality

#### CSV Export
```bash
# Export placements as CSV
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:5000/api/admin/reports/export/placements?format=csv" \
  --output placements.csv

# Verify file created
cat placements.csv | head -5
```

#### NAAC Report
```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "academicYear": "2024-25",
    "startYear": 2024,
    "endYear": 2024
  }' \
  http://localhost:5000/api/admin/reports/export/naac
```

### Step 8: Frontend Setup

```bash
cd frontend

# No new dependencies needed
# Just ensure existing dependencies are installed
npm install

# Start frontend
npm run dev
```

Frontend should open at: `http://localhost:3000`

### Step 9: Verify Frontend Service

Create a test file to verify the service works:

```javascript
// frontend/src/test-reports-service.js
import reportsService from './services/reportsService';

async function testService() {
  try {
    // Make sure you're logged in first
    const filterOptions = await reportsService.getFilterOptions();
    console.log('Filter options:', filterOptions);
    
    const overview = await reportsService.getOverview();
    console.log('Overview:', overview);
    
    console.log('✅ Reports service working!');
  } catch (error) {
    console.error('❌ Service error:', error.message);
  }
}

testService();
```

## Troubleshooting

### Issue: Migration fails with "relation already exists"

**Solution:** Some tables/columns may already exist. Either:
1. Run rollback first: `psql -U postgres -d alumni_portal -f rollback_migrations.sql`
2. Or manually check and skip existing migrations

### Issue: "Authentication failed" on API calls

**Checklist:**
- ✅ Token is valid (not expired)
- ✅ Token included in Authorization header
- ✅ User has admin role
- ✅ Backend server is running

**Fix:**
```javascript
// Check token in browser console
localStorage.getItem('token')

// Check user role
const payload = JSON.parse(atob(token.split('.')[1]));
console.log(payload.role); // Should be 'admin'
```

### Issue: CORS errors in browser

**Solution:** Update `backend/src/server.js`:
```javascript
const corsOptions = {
  origin: ["http://localhost:3000", "http://127.0.0.1:3000"],
  credentials: true,
  optionsSuccessStatus: 200,
};
```

### Issue: CSV export downloads empty/corrupted file

**Check:**
1. Token is valid
2. Data exists in database
3. Content-Type headers are correct
4. Browser allows downloads

**Debug:**
```javascript
// In browser console
const response = await fetch('http://localhost:5000/api/admin/reports/export/placements?format=csv', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  }
});
const text = await response.text();
console.log(text);
```

### Issue: No data returned from reports

**Cause:** Database is empty or filters are too restrictive.

**Solution:**
1. Run seed script: `node backend/scripts/seed-accreditation-data.js`
2. Remove filters and try again
3. Check database directly:
   ```sql
   SELECT COUNT(*) FROM alumni_profiles WHERE consent_for_accreditation = true;
   SELECT COUNT(*) FROM placement_data WHERE verification_status = 'verified';
   ```

### Issue: json2csv module not found

**Solution:**
```bash
cd backend
npm install json2csv
npm list json2csv  # Verify installation
```

## Verification Checklist

Before proceeding to UI development, verify:

- [ ] All 6 migration files applied successfully
- [ ] 4 new tables exist in database
- [ ] alumni_profiles has new columns
- [ ] Test data seeded (optional)
- [ ] Backend starts without errors
- [ ] `/health` endpoint responds
- [ ] Admin login works
- [ ] `/api/admin/reports/overview` returns data
- [ ] CSV export downloads successfully
- [ ] NAAC/NIRF/NBA exports return JSON
- [ ] Frontend starts without errors
- [ ] reportsService can be imported

## Next Steps

Once all verifications pass:

1. **Create UI Components** (Phase 3 continuation)
   - AccreditationDashboard.jsx
   - MetricCard, PlacementPanel, etc.
   - Filter panel with year/program selectors
   - Chart visualizations

2. **Integrate with Admin Panel**
   - Add "Accreditation" link to sidebar
   - Set up routing
   - Add permission checks

3. **Test End-to-End**
   - Login as admin
   - Navigate to Accreditation dashboard
   - Apply filters
   - View reports
   - Export data

## Support

For issues or questions:

1. Check `ACCREDITATION_PROGRESS.md` for current status
2. Review `database/migrations/README.md` for migration help
3. Check backend logs: `backend/logs/` (if logging configured)
4. Test individual components:
   - Database: Run SQL queries directly
   - Backend: Use Postman/curl
   - Frontend: Check browser console

## Useful Commands

```bash
# Database
psql -U postgres -d alumni_portal -c "SELECT * FROM schema_migrations"

# Backend
cd backend
npm run dev
npm test  # If tests configured

# Frontend
cd frontend
npm run dev
npm run build  # For production

# Full restart
# Terminal 1: Backend
cd backend && npm run dev

# Terminal 2: Frontend
cd frontend && npm run dev

# View logs
tail -f backend/logs/combined.log  # If logging configured
```

## Production Deployment Notes

When deploying to production:

1. **Database:**
   - Run migrations on production DB
   - DO NOT run seed script in production
   - Backup database before migrations

2. **Environment:**
   - Update `NODE_ENV=production`
   - Use strong `JWT_SECRET`
   - Configure proper CORS origins
   - Enable HTTPS

3. **Performance:**
   - Enable database indexes (already in migrations)
   - Configure Redis for caching
   - Set up CDN for static assets
   - Monitor API response times

4. **Security:**
   - Rate limiting (already configured)
   - Input validation
   - SQL injection protection (using parameterized queries)
   - Regular security audits

---

## Quick Reference

### Key Files
- Migrations: `database/migrations/*.sql`
- Backend Routes: `backend/src/routes/reports.js`, `export.js`
- Query Utils: `backend/src/utils/reportQueries.js`
- Export Utils: `backend/src/utils/exportHelpers.js`
- Frontend Service: `frontend/src/services/reportsService.js`

### Key Endpoints
- Overview: `GET /api/admin/reports/overview`
- Placements: `GET /api/admin/reports/placements`
- Exports: `GET /api/admin/reports/export/{type}`
- NAAC: `POST /api/admin/reports/export/naac`

### Database Tables
- `alumni_contributions`
- `alumni_achievements`
- `placement_data`
- `higher_education_data`
- Enhanced: `alumni_profiles`, `event_registrations`

---

**Ready to proceed? Start with Step 1!** 🚀
