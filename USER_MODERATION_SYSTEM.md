# User Blocking and Reporting System

## Overview

A comprehensive moderation system that allows users to block/report each other and enables superadmins to take appropriate actions on reported users.

## Features

### 1. User-Level Features

#### Block User
- **Purpose**: Prevent unwanted communication
- **How it works**: Users can block anyone they're messaging with
- **Effect**: 
  - Blocked user cannot send messages to the blocker
  - Both users are hidden from each other's conversations list
  - Reversible (can unblock anytime)
- **Location**: Chat header → Three dots menu → "Block User"

#### Report User
- **Purpose**: Flag inappropriate behavior for admin review
- **Report Types**:
  - **Harassment**: Bullying, threats, or abusive messages
  - **Spam**: Unsolicited advertising or repetitive messages
  - **Inappropriate Content**: Offensive, explicit, or disturbing content
  - **Impersonation**: Pretending to be someone else
  - **Other**: Any other policy violations
- **Required Info**: Report type + detailed description
- **Location**: Chat header → Three dots menu → "Report User"

### 2. Superadmin Features

#### View Reports Dashboard
- Access all user reports
- Filter by status (pending, under review, resolved, dismissed)
- See reporter and reported user details
- View report history and timestamps

#### Actions Available

##### 1. **Warning** (Least Severe)
- **When to use**: First-time minor violations, accidental rule breaks
- **Effect**: 
  - User receives official warning notice
  - Warning logged in their account history
  - User must acknowledge the warning
- **Example**: "Using inappropriate language in profile description"

##### 2. **Temporary Block** (Moderate)
- **When to use**: Repeated violations, moderate harassment
- **Duration**: Configurable (7 days, 30 days, etc.)
- **Effect**:
  - User cannot send messages during block period
  - Cannot create new posts/events
  - Can still view content but not interact
  - Automatically lifted after duration
- **Example**: "Sending spam messages to multiple users"

##### 3. **Content Removal** (Targeted)
- **When to use**: Specific messages/posts violate guidelines
- **Effect**:
  - Remove offending content only
  - User can continue normal activity
  - Content marked as "removed by moderator"
- **Example**: "Posted inappropriate image in alumni gallery"

##### 4. **Account Suspension** (Severe)
- **When to use**: Serious violations, repeated offenses after warnings
- **Types**:
  - **Temporary**: 30, 60, 90 days, or custom duration
  - **Permanent**: Indefinite suspension
- **Effect**:
  - Complete account access revoked
  - Cannot login or access any features
  - Data preserved for potential appeal
  - Can be lifted by superadmin
- **Example**: "Harassing multiple users, third violation after warnings"

##### 5. **Permanent Block** (Most Severe)
- **When to use**: Extreme violations, legal concerns, safety threats
- **Effect**:
  - Account permanently disabled
  - Email/identity blacklisted
  - Cannot register again with same credentials
  - Irreversible without manual database intervention
- **Example**: "Threatening violence, doxxing personal information"

## Database Schema

### Tables Created

#### 1. `blocked_users`
```sql
- id: Unique identifier
- blocker_user_id: Who initiated the block
- blocked_user_id: Who was blocked
- reason: Optional text explanation
- blocked_at: Timestamp
- UNIQUE constraint: Prevents duplicate blocks
- CHECK constraint: Prevents self-blocking
```

#### 2. `user_reports`
```sql
- id: Report identifier
- reporter_user_id: Who submitted the report
- reported_user_id: User being reported
- report_type: Category (harassment, spam, etc.)
- description: Detailed explanation
- evidence_message_ids: Array of message IDs as proof
- status: pending | under_review | resolved | dismissed
- admin_notes: Internal notes from reviewers
- action_taken: What action was applied
- reviewed_by_user_id: Which admin handled it
- reviewed_at: When it was reviewed
- reported_at: When submitted
```

#### 3. `user_warnings`
```sql
- id: Warning identifier
- user_id: Who received the warning
- issued_by_user_id: Which admin issued it
- warning_type: Category of violation
- message: Warning content
- related_report_id: Link to original report
- acknowledged: Whether user has seen it
- acknowledged_at: When they acknowledged
- issued_at: Timestamp
```

#### 4. `user_suspensions`
```sql
- id: Suspension identifier
- user_id: Suspended user
- suspended_by_user_id: Admin who suspended
- reason: Explanation
- suspension_type: temporary | permanent
- starts_at: When suspension begins
- ends_at: When it expires (NULL for permanent)
- related_report_id: Link to triggering report
- is_active: Currently enforced?
- lifted_at: When it was lifted (if applicable)
- lifted_by_user_id: Who lifted it
- lift_reason: Why it was lifted
```

## API Endpoints

### User Endpoints

#### Block User
```http
POST /api/moderation/block
Body: { blockedUserId, reason }
Returns: { success, message, data }
```

#### Unblock User
```http
DELETE /api/moderation/unblock/:userId
Returns: { success, message }
```

#### Check if Blocked
```http
GET /api/moderation/check-blocked/:userId
Returns: { success, isBlocked, data }
```

#### Get Blocked Users List
```http
GET /api/moderation/blocked
Returns: { success, data: [blocked users] }
```

#### Submit Report
```http
POST /api/moderation/report
Body: { 
  reportedUserId, 
  reportType, 
  description, 
  evidenceMessageIds 
}
Returns: { success, message, data }
```

### Superadmin Endpoints

#### Get All Reports
```http
GET /api/moderation/reports?status=pending&page=1&limit=20
Returns: { success, data, pagination }
```

#### Update Report
```http
PUT /api/moderation/reports/:reportId
Body: { status, actionTaken, adminNotes }
Returns: { success, message, data }
```

#### Issue Warning
```http
POST /api/moderation/warn/:userId
Body: { warningType, message, relatedReportId }
Returns: { success, message, data }
```

#### Suspend Account
```http
POST /api/moderation/suspend/:userId
Body: { 
  reason, 
  suspensionType, 
  durationDays, 
  relatedReportId 
}
Returns: { success, message, data }
```

#### Lift Suspension
```http
POST /api/moderation/lift-suspension/:suspensionId
Body: { liftReason }
Returns: { success, message, data }
```

## Admin Workflow

### Handling a Report

1. **Review** (Status: `under_review`)
   - Read report description
   - Check evidence (message IDs if provided)
   - Review user's history (past warnings/suspensions)
   - Verify reporter's credibility

2. **Investigate**
   - View conversation history between users
   - Check if reported user has multiple reports
   - Assess severity and context
   - Consult community guidelines

3. **Decide**
   - Choose appropriate action based on:
     - Severity of violation
     - User's history (first offense vs repeat)
     - Impact on community
     - Clear vs ambiguous violations

4. **Take Action**
   - Issue warning (first offense, minor)
   - Temporary block (moderate, repeated)
   - Remove content (specific violation)
   - Suspend account (serious, repeated)
   - Permanent block (extreme, dangerous)

5. **Document** (Status: `resolved`)
   - Add admin notes explaining decision
   - Link to related report
   - Set action_taken field
   - Notify affected user (if applicable)

6. **Follow-up**
   - Monitor user behavior post-action
   - Respond to appeals (if any)
   - Update guidelines if needed

## Decision Matrix

| Violation Type | First Offense | Second Offense | Third Offense |
|---|---|---|---|
| **Minor Language** | Warning | 7-day temp block | 30-day suspension |
| **Spam Messages** | Warning + content removal | 14-day temp block | Permanent block |
| **Harassment** | Warning | 30-day temp block | Account suspension |
| **Inappropriate Content** | Content removal + warning | 30-day suspension | Permanent block |
| **Threats/Violence** | Immediate suspension | Permanent block | Account + legal action |
| **Impersonation** | 30-day suspension | Permanent block | - |
| **Doxxing/PII Abuse** | Immediate permanent block | - | - |

## Best Practices

### For Users
1. **Block**: Use for personal boundaries, unwanted contact
2. **Report**: Use for policy violations that need admin attention
3. **Provide Evidence**: Include message IDs when reporting
4. **Be Specific**: Detailed descriptions help admins make faster decisions
5. **Don't Abuse**: False reports may result in action against reporter

### For Admins
1. **Be Consistent**: Apply same standards to all users
2. **Document Everything**: Always add admin notes
3. **Escalate Gradually**: Start with warnings unless severe
4. **Consider Context**: One-off mistakes vs patterns of behavior
5. **Communicate Clearly**: Users should understand why action was taken
6. **Review Regularly**: Check for false reports or system abuse
7. **Update Policies**: Learn from cases to improve guidelines

## Security & Privacy

### User Data Protection
- Reports are confidential (only visible to superadmins)
- Reporter identity protected from reported user
- Blocked users don't know who blocked them
- Evidence messages stored securely (encrypted)

### Abuse Prevention
- Cannot self-report or self-block
- Duplicate blocks prevented (database constraint)
- Rate limiting on report submissions
- Admin actions logged with timestamps and IDs

### Appeal Process
- Users can contact admins about suspensions
- Superadmins can lift suspensions with reason
- Permanent blocks require manual database intervention
- All actions reversible except permanent blocks

## Future Enhancements

1. **Automated Moderation**
   - AI-based content filtering
   - Auto-flag suspicious patterns
   - Keyword-based alerts

2. **User Notifications**
   - Email alerts when reported
   - Warning acknowledgment system
   - Suspension expiry reminders

3. **Enhanced Evidence**
   - Screenshot uploads
   - Conversation thread exports
   - Timestamped evidence linking

4. **Analytics Dashboard**
   - Report trends over time
   - Most common violation types
   - Admin response time metrics

5. **Community Guidelines**
   - Public-facing rules document
   - Examples of violations
   - FAQ about moderation

## Migration Instructions

### Development
```bash
# Run the migration
node backend/run-migration.js database/migrations/010_add_blocking_reporting.sql

# Verify tables created
psql -d alumni_portal -c "\d blocked_users"
psql -d alumni_portal -c "\d user_reports"
psql -d alumni_portal -c "\d user_warnings"
psql -d alumni_portal -c "\d user_suspensions"
```

### Production
```bash
# Backup first
pg_dump alumni_portal > backup_before_moderation.sql

# Run migration
psql -d alumni_portal -f database/migrations/010_add_blocking_reporting.sql

# Test endpoints
curl -X GET http://localhost:5000/api/moderation/blocked -H "Authorization: Bearer <token>"
```

## Files Modified/Created

### Database
- `database/migrations/010_add_blocking_reporting.sql` - Schema definitions

### Backend
- `backend/src/routes/moderation.js` - All moderation endpoints
- `backend/src/server.js` - Added moderation route registration

### Frontend
- `frontend/src/pages/Messages.jsx` - Block/report UI, modals, handlers
- `frontend/src/pages/Messages.module.css` - Actions menu styling

## Testing Checklist

- [ ] User can block another user
- [ ] Blocked user cannot send messages
- [ ] User can unblock
- [ ] User can submit report with all types
- [ ] Superadmin can view all reports
- [ ] Superadmin can update report status
- [ ] Superadmin can issue warnings
- [ ] Superadmin can suspend accounts (temporary)
- [ ] Superadmin can suspend accounts (permanent)
- [ ] Superadmin can lift suspensions
- [ ] Check-blocked endpoint works
- [ ] Cannot self-block or self-report
- [ ] Modals display correctly
- [ ] Actions menu responsive on mobile

## Support

For questions or issues with the moderation system:
1. Check logs in backend console for errors
2. Verify database tables exist and have correct permissions
3. Ensure superadmin role is set correctly in users table
4. Test API endpoints directly with Postman/curl
5. Check frontend console for API call errors
