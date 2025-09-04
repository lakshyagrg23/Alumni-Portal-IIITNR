# 🛠️ IIIT Naya Raipur Alumni Portal - Detailed Setup Guide

## Table of Contents

1. [System Requirements](#system-requirements)
2. [Quick Setup](#quick-setup)
3. [Manual Setup](#manual-setup)
4. [Database Configuration](#database-configuration)
5. [Environment Variables](#environment-variables)
6. [Google OAuth Setup](#google-oauth-setup)
7. [Email Configuration](#email-configuration)
8. [Development Workflow](#development-workflow)
9. [Troubleshooting](#troubleshooting)
10. [Team Onboarding](#team-onboarding)

---

## System Requirements

### Required Software

- **Node.js**: Version 18.0 or higher ([Download](https://nodejs.org/))
- **npm**: Version 8.0 or higher (comes with Node.js)
- **PostgreSQL**: Version 14 or higher ([Download](https://www.postgresql.org/download/))
- **Git**: Latest version ([Download](https://git-scm.com/))

### Recommended Tools

- **VS Code**: With extensions for React, Node.js ([Download](https://code.visualstudio.com/))
- **Postman/Thunder Client**: For API testing
- **pgAdmin**: PostgreSQL management tool
- **Git Bash** (Windows): Better terminal experience

### System Specifications

- **RAM**: Minimum 8GB (16GB recommended)
- **Storage**: At least 2GB free space
- **OS**: Windows 10+, macOS 10.15+, or Linux Ubuntu 18.04+

---

## Quick Setup

### Automated Setup (Recommended)

#### For Linux/macOS:

```bash
# Clone repository
git clone https://github.com/lakshyagrg23/Alumni-Portal-IIITNR.git
cd Alumni-Portal-IIITNR

# Run setup script
chmod +x setup.sh
./setup.sh
```

#### For Windows:

```batch
REM Clone repository
git clone https://github.com/lakshyagrg23/Alumni-Portal-IIITNR.git
cd Alumni-Portal-IIITNR

REM Run setup script
setup.bat
```

The setup script will:

- ✅ Check prerequisites
- ✅ Install all dependencies
- ✅ Create environment files
- ✅ Provide next steps

---

## Manual Setup

### 1. Clone Repository

```bash
git clone https://github.com/lakshyagrg23/Alumni-Portal-IIITNR.git
cd Alumni-Portal-IIITNR
```

### 2. Install Dependencies

#### Backend Dependencies

```bash
cd backend
npm install
```

#### Frontend Dependencies

```bash
cd ../frontend
npm install
```

### 3. Environment Configuration

```bash
# Backend environment
cd backend
cp .env.example .env

# Frontend environment
cd ../frontend
cp .env.example .env
```

---

## Database Configuration

### PostgreSQL Installation

#### Windows

1. Download PostgreSQL from [official website](https://www.postgresql.org/download/windows/)
2. Run installer and follow setup wizard
3. **Important**: Remember the password for postgres user
4. Add PostgreSQL bin directory to PATH environment variable

#### macOS

```bash
# Using Homebrew (recommended)
brew install postgresql@14
brew services start postgresql@14

# Or using official installer
# Download from https://www.postgresql.org/download/macos/
```

#### Linux (Ubuntu/Debian)

```bash
# Update package index
sudo apt update

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib

# Start PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Switch to postgres user
sudo -u postgres psql
```

#### Linux (CentOS/RHEL)

```bash
# Install PostgreSQL
sudo yum install postgresql-server postgresql-contrib
# or for newer versions:
sudo dnf install postgresql-server postgresql-contrib

# Initialize database
sudo postgresql-setup initdb

# Start and enable service
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### Database Creation

#### Method 1: Using psql Command Line

```bash
# Connect to PostgreSQL as postgres user
psql -U postgres

# Create database and user
CREATE DATABASE alumni_portal;
CREATE USER alumni_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE alumni_portal TO alumni_user;

# Grant additional permissions
ALTER USER alumni_user CREATEDB;

# Exit psql
\q
```

#### Method 2: Using pgAdmin (GUI)

1. Open pgAdmin
2. Connect to PostgreSQL server
3. Right-click "Databases" → "Create" → "Database"
4. Name: `alumni_portal`
5. Owner: Create new user `alumni_user` or use existing

#### Method 3: Using Terminal Commands

```bash
# Create database
createdb -U postgres alumni_portal

# Create user (interactive)
createuser -U postgres -P alumni_user
```

### Database Schema Setup

```bash
# Navigate to project root
cd /path/to/Alumni-Portal-IIITNR

# Run database migration (after completing backend setup)
cd backend
npm run migrate

# Optional: Add seed data
npm run seed
```

---

## Environment Variables

### Backend Environment (.env)

**Required Configuration:**

```bash
# Basic Configuration
NODE_ENV=development
PORT=5000

# Database (Update with your credentials)
DATABASE_URL=postgresql://alumni_user:your_password@localhost:5432/alumni_portal

# JWT Security (Generate strong secrets)
JWT_SECRET=your_super_secret_jwt_key_here_minimum_32_characters
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# Google OAuth (Get from Google Cloud Console)
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback
```

**Optional Configuration:**

```bash
# Email Service (for notifications)
EMAIL_SERVICE=gmail
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
EMAIL_FROM=noreply@iiitnr.edu.in

# File Upload
MAX_FILE_SIZE=5242880
UPLOAD_PATH=uploads/
ALLOWED_FILE_TYPES=jpg,jpeg,png,pdf,doc,docx

# Cloud Storage (optional)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### Frontend Environment (.env)

```bash
# API Configuration
VITE_API_URL=http://localhost:5000/api
VITE_API_TIMEOUT=10000

# Google OAuth (same as backend)
VITE_GOOGLE_CLIENT_ID=your_google_client_id_here

# App Configuration
VITE_APP_NAME=IIIT NR Alumni Portal
VITE_APP_VERSION=1.0.0

# Feature Flags
VITE_ENABLE_GOOGLE_AUTH=true
VITE_ENABLE_FILE_UPLOAD=true
```

---

## Google OAuth Setup

### 1. Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project or select existing
3. Name: "IIIT NR Alumni Portal"

### 2. Enable APIs

1. Navigate to "APIs & Services" → "Library"
2. Search and enable:
   - Google+ API
   - Google People API

### 3. Configure OAuth Consent Screen

1. Go to "APIs & Services" → "OAuth consent screen"
2. Choose "External" user type
3. Fill required information:
   - App name: IIIT NR Alumni Portal
   - User support email: your_email@iiitnr.edu.in
   - Developer contact: your_email@iiitnr.edu.in

### 4. Create OAuth Credentials

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. Application type: "Web application"
4. Name: "Alumni Portal OAuth"
5. Authorized redirect URIs:
   - `http://localhost:3000/auth/google/callback`
   - `http://localhost:5000/api/auth/google/callback`
   - Add production URLs when ready

### 5. Update Environment Variables

Copy the Client ID and Client Secret to your `.env` files.

---

## Email Configuration

### Gmail Setup (Recommended for Development)

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate App Password**:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate password for "Mail"
3. **Update .env file**:
   ```bash
   EMAIL_USER=your_gmail@gmail.com
   EMAIL_PASS=your_16_character_app_password
   ```

### Other Email Providers

- **Outlook**: Update EMAIL_HOST to `smtp-mail.outlook.com`
- **Yahoo**: Update EMAIL_HOST to `smtp.mail.yahoo.com`
- **Custom SMTP**: Update host, port, and credentials accordingly

---

## Development Workflow

### Starting Development Servers

#### Option 1: Manual Start

```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend (new terminal)
cd frontend
npm run dev
```

#### Option 2: Using Concurrently (from root)

```bash
# Install concurrently globally
npm install -g concurrently

# Start both servers
npm run dev
```

### Accessing the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **API Documentation**: http://localhost:5000/api-docs (if Swagger is implemented)

### Development Tools

#### Code Quality

```bash
# Run linting
npm run lint

# Fix linting issues
npm run lint:fix

# Format code (if Prettier is configured)
npm run format
```

#### Testing

```bash
# Run backend tests
cd backend
npm test

# Run frontend tests
cd frontend
npm test

# Run tests in watch mode
npm run test:watch
```

#### Database Management

```bash
# Reset database
cd backend
npm run reset-db

# Run migrations
npm run migrate

# Add seed data
npm run seed

# Create backup
npm run backup-db
```

---

## Troubleshooting

### Common Issues

#### 1. Port Already in Use

```bash
# Error: EADDRINUSE :::5000 or :::3000

# Solution: Find and kill process
# Windows
netstat -ano | findstr :5000
taskkill /PID <process_id> /F

# Linux/macOS
lsof -ti:5000 | xargs kill -9
```

#### 2. Database Connection Issues

```bash
# Error: password authentication failed

# Solutions:
# 1. Check PostgreSQL is running
sudo systemctl status postgresql  # Linux
brew services list | grep postgresql  # macOS

# 2. Verify credentials in .env file
# 3. Test connection manually
psql -U alumni_user -d alumni_portal -h localhost
```

#### 3. Node Modules Issues

```bash
# Error: Module not found

# Solution: Clean install
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

#### 4. Google OAuth Errors

```bash
# Error: redirect_uri_mismatch

# Solution: Check OAuth configuration
# 1. Verify redirect URIs in Google Cloud Console
# 2. Ensure URLs match exactly (including http/https)
# 3. Check environment variables
```

#### 5. CORS Issues

```bash
# Error: Access to fetch blocked by CORS policy

# Solution: Check backend CORS configuration
# 1. Verify CORS_ORIGIN in backend .env
# 2. Ensure frontend URL is whitelisted
# 3. Check if both servers are running
```

#### 6. Environment Variables Not Loading

```bash
# Error: process.env.VARIABLE_NAME is undefined

# Solutions:
# 1. Check .env file exists
# 2. Restart development server
# 3. Verify variable names (no spaces)
# 4. Check .env file encoding (UTF-8)
```

### Database Troubleshooting

#### Connection Issues

```bash
# Test database connection
cd backend
node -e "
const { sequelize } = require('./src/config/database');
sequelize.authenticate()
  .then(() => console.log('✅ Database connected'))
  .catch(err => console.error('❌ Database error:', err));
"
```

#### Reset Database

```bash
# Complete database reset
cd backend
npm run reset-db
npm run migrate
npm run seed
```

### Getting Help

#### Log Analysis

```bash
# Backend logs
cd backend
npm run dev 2>&1 | tee debug.log

# Frontend logs
cd frontend
npm run dev 2>&1 | tee debug.log
```

#### Debug Mode

```bash
# Enable debug logging
export DEBUG=alumni-portal:*  # Linux/macOS
set DEBUG=alumni-portal:*     # Windows

# Start with debug
npm run dev
```

---

## Team Onboarding

### New Team Member Checklist

#### Prerequisites

- [ ] Install Node.js 18+
- [ ] Install PostgreSQL 14+
- [ ] Install Git
- [ ] Install VS Code with recommended extensions
- [ ] Create GitHub account (if not exists)

#### Setup Process

- [ ] Clone repository
- [ ] Run setup script (`./setup.sh` or `setup.bat`)
- [ ] Configure environment variables
- [ ] Set up local database
- [ ] Start development servers
- [ ] Verify application runs successfully
- [ ] Join team communication channels (Slack/Discord)

#### Development Environment

- [ ] Configure IDE/editor settings
- [ ] Install browser extensions (React DevTools)
- [ ] Set up Git workflow
- [ ] Understand project structure
- [ ] Review coding standards
- [ ] Complete first test task

#### Access & Permissions

- [ ] GitHub repository access
- [ ] Development database access
- [ ] Shared resources access (Google Cloud, etc.)
- [ ] Documentation access
- [ ] Team communication channels

### Recommended VS Code Extensions

```json
{
  "recommendations": [
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-eslint",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-thunder-client",
    "formulahendry.auto-rename-tag",
    "ms-vscode.vscode-json",
    "ms-vscode.vscode-postgres",
    "ms-vscode.vscode-git-extension-pack"
  ]
}
```

### First Contribution

1. Create feature branch: `git checkout -b feature/your-first-task`
2. Make small change and test
3. Commit: `git commit -m "feat: your first contribution"`
4. Push: `git push origin feature/your-first-task`
5. Create Pull Request
6. Wait for code review

---

## Additional Resources

### Documentation

- [Node.js Documentation](https://nodejs.org/docs/)
- [React Documentation](https://reactjs.org/docs/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Express.js Documentation](https://expressjs.com/)

### Learning Resources

- [Full-Stack Development](https://fullstackopen.com/)
- [PostgreSQL Tutorial](https://www.postgresqltutorial.com/)
- [React Tutorial](https://react.dev/learn)

### Project-Specific

- [API Documentation](./API.md) (when created)
- [Contributing Guidelines](./CONTRIBUTING.md) (when created)
- [Deployment Guide](./DEPLOYMENT.md) (when created)

---

**Need help?** Create an issue in the GitHub repository or contact the team lead.

**Happy coding! 🚀**
