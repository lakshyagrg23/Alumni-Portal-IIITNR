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
7. **007_extend_alumni_profiles.sql** - Adds onboarding/profile fields (employment status, higher studies, verification, consent) and supporting indexes

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
# Messaging Feature Migration

This directory contains all migration files and scripts for implementing the messaging feature with end-to-end encryption support in the IIIT Naya Raipur Alumni Portal.

## Files Overview

### Migration Files
- **`001_messaging_feature.sql`** - Complete SQL migration with all tables, views, triggers, and security policies
- **`001_messaging_essential.sql`** - Essential migration with only required tables and columns
  
### Scripts
- **`run_messaging_migration.js`** - Node.js script to run the full migration with verification
- **`ensure_messages_table.js`** - Updated script to ensure messaging tables exist (backwards compatible)

## What's Included

### 1. Database Schema Changes

#### New Tables
- **`public_keys`** - Stores user public keys for E2E encryption
- **`conversations`** - Tracks conversation metadata (optional, in full migration)
- **`message_read_receipts`** - Read receipts for messages (optional, in full migration)

#### Enhanced Tables
- **`messages`** - Added columns for E2E encryption:
  - `iv` - Initialization vector for AES-GCM encryption
  - `client_id` - Client-generated ID for deduplication
  - `sender_public_key` - Snapshot of sender's public key at send time
  - `receiver_public_key` - Snapshot of receiver's public key at send time

### 2. Features Implemented

#### End-to-End Encryption
- ECDH P-256 key exchange for shared secret derivation
- AES-GCM for message encryption
- Public key snapshots stored with each message for decryption resilience

#### Message Management
- Bidirectional conversation grouping
- Real-time message delivery via Socket.io
- Message deduplication using client IDs
- Read receipts and status tracking

#### Performance Optimizations
- Indexes on frequently queried columns
- Conversation views for efficient querying
- Proper foreign key relationships

#### Security Features
- Row Level Security (RLS) policies
- User isolation for messages and keys
- Proper CASCADE relationships

## How to Run

### Option 1: Quick Setup (Recommended)
```bash
cd backend
node scripts/ensure_messages_table.js
```

### Option 2: Full Migration
```bash
cd backend
node scripts/run_messaging_migration.js
```

### Option 3: Step-by-step Migration
```bash
cd backend
node scripts/run_messaging_migration.js --steps
```

### Option 4: Manual SQL
```bash
# Run the SQL file directly in PostgreSQL
psql -U postgres -d alumni_portal -f database/migrations/001_messaging_essential.sql
```

## Verification

After running the migration, verify the setup:

```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_name IN ('messages', 'public_keys', 'conversations');

-- Check message columns
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'messages' 
ORDER BY ordinal_position;

-- Check indexes
SELECT indexname FROM pg_indexes 
WHERE tablename IN ('messages', 'public_keys');
```

## Backend Code Changes

The migration supports these backend features:

### Socket.io Handler Updates
- Enhanced `secure:send` event handling
- Automatic public key snapshot storage
- Improved message enrichment with sender/receiver details

### API Endpoint Changes
- Conversation listing with proper partner identification
- Message thread loading with decryption metadata
- Public key management endpoints

### Model Enhancements
- Message model supports new encryption columns
- PublicKey model for E2E key management
- AlumniProfile integration for user identification

## Frontend Integration

The frontend messaging system includes:

### E2E Encryption Client
- Key generation and persistence in localStorage
- Public key publication to backend
- Message encryption/decryption using Web Crypto API

### Real-time Messaging
- Socket.io integration for live message delivery
- Automatic conversation updates
- Message status indicators (pending, sent, delivered)

### UI/UX Features
- Modern chat interface with sender/receiver segregation
- Avatar initials and user names instead of IDs
- Responsive design for mobile and desktop
- Auto-scroll to latest messages

## Troubleshooting

### Database Connection Issues
1. Verify PostgreSQL is running
2. Check connection credentials in `.env`
3. Ensure database `alumni_portal` exists
4. Verify user permissions

### Migration Errors
- **"already exists"** errors are safe to ignore
- **"does not exist"** errors may indicate missing base tables
- Check that `users` and `alumni_profiles` tables exist first

### Encryption Issues
- Ensure Web Crypto API is available (requires HTTPS in production)
- Check that public keys are properly generated and stored
- Verify message IV and ciphertext are correctly formatted

### Performance Issues
- Run `ANALYZE` on new tables after migration
- Monitor index usage with `EXPLAIN ANALYZE`
- Consider partitioning messages table for large datasets

## Security Considerations

### End-to-End Encryption
- Private keys never leave the client
- Server only stores encrypted content and public key snapshots
- Message content is unreadable to server administrators

### Access Control
- Row Level Security ensures users only see their own data
- Proper foreign key constraints prevent orphaned records
- Conversation isolation based on participant IDs

### Data Retention
- Include cleanup functions for GDPR compliance
- Consider message retention policies
- Implement secure key rotation mechanisms

## Next Steps

1. **Test the Migration**: Run in development environment first
2. **Backup Production**: Always backup before running in production
3. **Monitor Performance**: Watch for slow queries after migration
4. **User Training**: Help users understand E2E encryption features
5. **Security Audit**: Review encryption implementation

## Support

For issues or questions:
<<<<<<< HEAD
1. Check migration logs for errors
2. Verify PostgreSQL version compatibility (>= 12.0)
3. Ensure user has CREATE TABLE privileges
4. Contact database administrator if needed
=======
1. Check the console output from migration scripts
2. Review PostgreSQL logs for detailed error messages
3. Verify all dependencies are installed
4. Test with sample data in development environment

## Version History

- **v1.0.0** - Initial messaging feature implementation
- **v1.1.0** - Added conversation management and read receipts
- **v1.2.0** - Enhanced E2E encryption with key snapshots
- **v1.3.0** - Improved UI/UX and real-time features
>>>>>>> origin/main
