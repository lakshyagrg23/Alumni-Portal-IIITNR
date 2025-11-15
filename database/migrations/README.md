# Database Migrations for Accreditation Dashboard

This directory contains SQL migration scripts to enhance the Alumni Portal database for accreditation reporting (NAAC/NIRF/NBA).

## Migration Files

### Core Migrations
1. **001_add_accreditation_fields.sql** - Adds employment, education, verification, and consent fields to `alumni_profiles`
2. **002_create_alumni_contributions.sql** - Creates table for tracking donations, lectures, mentorships, etc.
3. **003_create_alumni_achievements.sql** - Creates table for awards, promotions, startups, publications, etc.
4. **004_enhance_event_registrations.sql** - Enhances event tracking with attendance verification and certificates
5. **005_create_placement_data.sql** - Dedicated table for detailed placement records
6. **006_create_higher_education_data.sql** - Tracks alumni pursuing Masters, PhD, etc.

### Utility Scripts
- **run_all_migrations.sql** - Master script to run all migrations in order
- **rollback_migrations.sql** - Reverses all migrations (CAUTION: deletes data!)

## How to Run Migrations

### Option 1: Using psql (Recommended)
```bash
# Navigate to migrations directory
cd database/migrations

# Run all migrations
psql -U postgres -d alumni_portal -f run_all_migrations.sql

# Or run individual migrations
psql -U postgres -d alumni_portal -f 001_add_accreditation_fields.sql
```

### Option 2: Using Node.js Script
```bash
# From backend directory
node src/config/migrate-node.js
```

### Option 3: Manual Execution
Copy and paste the contents of each migration file into your PostgreSQL client in order.

## Verification

After running migrations, verify with:

```sql
-- Check applied migrations
SELECT * FROM schema_migrations ORDER BY applied_at;

-- Check new tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'alumni_contributions', 
    'alumni_achievements', 
    'placement_data', 
    'higher_education_data'
);

-- Check new columns in alumni_profiles
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'alumni_profiles' 
AND column_name IN (
    'current_employer', 
    'higher_study_institution', 
    'consent_for_accreditation'
);
```

## Rollback (CAUTION)

**WARNING**: This will delete all accreditation data!

```bash
psql -U postgres -d alumni_portal -f rollback_migrations.sql
```

## New Tables Overview

### alumni_contributions
Tracks alumni giving back to the institute:
- Donations (monetary contributions)
- Guest lectures and workshops
- Mentorship programs
- Internship opportunities offered
- Industry collaborations

### alumni_achievements
Records notable accomplishments:
- Career promotions and awards
- Startup founding and funding
- Research publications and patents
- Conference presentations
- Competition wins

### placement_data
Detailed placement records:
- Company, role, salary details
- Placement type (campus/off-campus)
- Industry classification
- Verification status

### higher_education_data
Tracks further studies:
- Institution and program details
- Admission process and funding
- Current status and timeline
- Research areas and publications

## Data Privacy & Consent

All new tables respect privacy settings:
- `consent_for_accreditation` flag in alumni_profiles
- `is_anonymous` options in placement_data
- `is_public` flags for visibility control
- Verification workflows for data accuracy

## Indexes Created

Optimized indexes for common accreditation queries:
- Placement rates by year/program
- Higher studies by country/institution
- Contributions by type and date
- Achievements by recognition level

## Support

For issues or questions:
1. Check migration logs for errors
2. Verify PostgreSQL version compatibility (>= 12.0)
3. Ensure user has CREATE TABLE privileges
4. Contact database administrator if needed
