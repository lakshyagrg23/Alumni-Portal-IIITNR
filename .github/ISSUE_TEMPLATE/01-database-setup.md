---
name: Database Setup & Migration
about: Set up PostgreSQL database and run initial schema migration
title: "[BACKEND] Database Setup & Migration"
labels: ["backend", "Priority: High", "infrastructure"]
assignees: []
---

## 🗄️ Database Setup & Migration

### **Description**
Set up the PostgreSQL database locally and create the initial schema migration from our existing SQL schema file.

### **Acceptance Criteria**
- [ ] PostgreSQL database installed and running locally
- [ ] Database `alumni_portal` created
- [ ] All tables from `database/schema.sql` migrated successfully
- [ ] Database connection tested and working
- [ ] Seed data added for development/testing
- [ ] Documentation updated with setup instructions

### **Technical Requirements**
- **Database**: PostgreSQL 14+
- **Schema**: Use existing `/database/schema.sql`
- **Environment**: Development setup documented

### **Tasks Breakdown**
1. **Install PostgreSQL** (if not already installed)
   - Download and install PostgreSQL
   - Start PostgreSQL service
   - Create database user if needed

2. **Create Database**
   ```sql
   CREATE DATABASE alumni_portal;
   CREATE USER alumni_user WITH PASSWORD 'your_password';
   GRANT ALL PRIVILEGES ON DATABASE alumni_portal TO alumni_user;
   ```

3. **Run Schema Migration**
   - Execute `/database/schema.sql`
   - Verify all 11 tables are created:
     - users
     - alumni_profiles
     - news
     - events
     - connections
     - messages
     - admin_logs
     - notifications
     - event_volunteers
     - user_sessions
     - alumni_achievements

4. **Add Seed Data**
   - Create sample users (including admin)
   - Add sample alumni profiles
   - Insert sample news/events
   - Test data relationships

5. **Test Database Connection**
   - Update `.env` with correct DATABASE_URL
   - Test connection from backend server
   - Verify CRUD operations work

### **Files to Modify/Create**
- `/backend/.env` (database connection string)
- `/backend/src/config/database.js` (verify connection)
- `/database/seed.sql` (create seed data file)
- `/docs/SETUP.md` (update setup instructions)

### **Expected Outcome**
- Fully functional PostgreSQL database with all tables
- Sample data for development and testing
- Documented setup process for other team members
- Backend server successfully connecting to database

### **Definition of Done**
- [ ] All acceptance criteria met
- [ ] Database schema matches exactly with existing design
- [ ] Seed data allows testing of all major features
- [ ] Setup documentation is clear and complete
- [ ] Other team members can replicate the setup

### **Priority**: 🔴 High
### **Estimated Time**: 4-6 hours
### **Dependencies**: None
