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
1. Check the console output from migration scripts
2. Review PostgreSQL logs for detailed error messages
3. Verify all dependencies are installed
4. Test with sample data in development environment

## Version History

- **v1.0.0** - Initial messaging feature implementation
- **v1.1.0** - Added conversation management and read receipts
- **v1.2.0** - Enhanced E2E encryption with key snapshots
- **v1.3.0** - Improved UI/UX and real-time features