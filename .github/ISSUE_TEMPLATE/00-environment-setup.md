---
name: Environment Configuration & Documentation
about: Set up development environment and create comprehensive setup documentation
title: "[SETUP] Environment Configuration & Documentation"
labels: ["setup", "Priority: High", "documentation"]
assignees: []
---

## ⚙️ Environment Configuration & Documentation

### **Description**
Create comprehensive environment configuration files and documentation to ensure all team members can set up the project quickly and consistently.

### **Acceptance Criteria**
- [ ] Environment files for all environments (dev/staging/prod)
- [ ] Complete setup documentation
- [ ] Scripts for easy project setup
- [ ] Docker configuration (optional)
- [ ] CI/CD pipeline configuration
- [ ] Team onboarding guide

### **Environment Files to Create**

#### **Frontend Environment** (`.env.example`)
```bash
# Frontend Environment Variables
VITE_API_URL=http://localhost:5000/api
VITE_GOOGLE_CLIENT_ID=your_google_client_id
VITE_APP_NAME=IIIT Naya Raipur Alumni Portal
VITE_APP_URL=http://localhost:3000
VITE_ENVIRONMENT=development

# Google OAuth
VITE_GOOGLE_OAUTH_REDIRECT_URI=http://localhost:3000/auth/google/callback

# File Upload
VITE_MAX_FILE_SIZE=5242880
VITE_ALLOWED_FILE_TYPES=image/jpeg,image/png,image/gif

# Analytics (optional)
VITE_GA_TRACKING_ID=
VITE_HOTJAR_ID=
```

#### **Backend Environment** (`.env.example`)
```bash
# Server Configuration
NODE_ENV=development
PORT=5000
HOST=localhost

# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/alumni_portal
DB_HOST=localhost
DB_PORT=5432
DB_NAME=alumni_portal
DB_USER=alumni_user
DB_PASSWORD=your_secure_password

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_here_make_it_long_and_complex
JWT_EXPIRE=7d
JWT_REFRESH_SECRET=your_refresh_token_secret
JWT_REFRESH_EXPIRE=30d

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback

# Email Configuration
EMAIL_SERVICE=gmail
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
EMAIL_FROM=noreply@iiitnr.edu.in

# File Upload
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=5242880
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/gif,application/pdf

# Security
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX_REQUESTS=100
CORS_ORIGIN=http://localhost:3000

# Redis (for sessions/caching - optional)
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=

# Frontend URL
FRONTEND_URL=http://localhost:3000

# Admin Configuration
ADMIN_EMAIL=admin@iiitnr.edu.in
ADMIN_PASSWORD=Admin@123456
```

### **Setup Documentation**

#### **README.md Enhancement**
```markdown
# IIIT Naya Raipur Alumni Portal

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL 14+
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/lakshyagrg23/Alumni-Portal-IIITNR.git
   cd Alumni-Portal-IIITNR
   ```

2. **Install dependencies**
   ```bash
   # Install backend dependencies
   cd backend
   npm install
   
   # Install frontend dependencies
   cd ../frontend
   npm install
   ```

3. **Set up environment variables**
   ```bash
   # Backend
   cd ../backend
   cp .env.example .env
   # Edit .env with your configuration
   
   # Frontend
   cd ../frontend
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Set up database**
   ```bash
   # Create PostgreSQL database
   createdb alumni_portal
   
   # Run migrations
   cd backend
   npm run migrate
   
   # Seed database (optional)
   npm run seed
   ```

5. **Start development servers**
   ```bash
   # Terminal 1: Backend
   cd backend
   npm run dev
   
   # Terminal 2: Frontend
   cd frontend
   npm run dev
   ```

6. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000
```

#### **SETUP.md (Detailed Setup Guide)**
```markdown
# Detailed Setup Guide

## Table of Contents
1. [System Requirements](#system-requirements)
2. [Database Setup](#database-setup)
3. [Environment Configuration](#environment-configuration)
4. [Google OAuth Setup](#google-oauth-setup)
5. [Email Configuration](#email-configuration)
6. [File Upload Configuration](#file-upload-configuration)
7. [Troubleshooting](#troubleshooting)

## System Requirements

### Required Software
- **Node.js**: Version 18.0 or higher
- **npm**: Version 8.0 or higher
- **PostgreSQL**: Version 14 or higher
- **Git**: Latest version

### Recommended Tools
- **VS Code**: With extensions for React, Node.js
- **Postman**: For API testing
- **pgAdmin**: PostgreSQL management tool

## Database Setup

### PostgreSQL Installation

#### Windows
1. Download PostgreSQL from [official website](https://www.postgresql.org/download/windows/)
2. Run installer and follow setup wizard
3. Remember the password for postgres user
4. Add PostgreSQL bin directory to PATH

#### macOS
```bash
# Using Homebrew
brew install postgresql
brew services start postgresql
```

#### Linux (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### Database Creation
```sql
-- Connect to PostgreSQL as postgres user
psql -U postgres

-- Create database and user
CREATE DATABASE alumni_portal;
CREATE USER alumni_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE alumni_portal TO alumni_user;

-- Exit psql
\q
```

## Environment Configuration

### Backend .env Configuration
```bash
# Copy example file
cp backend/.env.example backend/.env

# Edit the file with your settings
nano backend/.env
```

### Frontend .env Configuration  
```bash
# Copy example file
cp frontend/.env.example frontend/.env

# Edit the file with your settings
nano frontend/.env
```

## Google OAuth Setup

1. **Go to Google Cloud Console**
   - Visit [Google Cloud Console](https://console.cloud.google.com/)
   - Create new project or select existing one

2. **Enable Google+ API**
   - Go to "APIs & Services" > "Library"
   - Search for "Google+ API" and enable it

3. **Create OAuth Credentials**
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Choose "Web application"
   - Add authorized redirect URIs:
     - http://localhost:3000/auth/google/callback
     - http://localhost:5000/api/auth/google/callback

4. **Update Environment Variables**
   ```bash
   GOOGLE_CLIENT_ID=your_client_id_here
   GOOGLE_CLIENT_SECRET=your_client_secret_here
   ```

## Troubleshooting

### Common Issues

#### Database Connection Issues
```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# Check if database exists
psql -U postgres -l

# Test connection
psql -U alumni_user -d alumni_portal -h localhost
```

#### Port Already in Use
```bash
# Find process using port 3000 or 5000
netstat -tulpn | grep :3000
netstat -tulpn | grep :5000

# Kill process
kill -9 <process_id>
```

#### Node Modules Issues
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```
```

### **Setup Scripts**

#### **setup.sh** (Linux/macOS)
```bash
#!/bin/bash

echo "🚀 Setting up IIIT Naya Raipur Alumni Portal..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL is not installed. Please install PostgreSQL 14+ first."
    exit 1
fi

echo "✅ Prerequisites check passed"

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
npm install

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd ../frontend
npm install

# Create environment files
echo "⚙️ Setting up environment files..."
cd ../backend
if [ ! -f .env ]; then
    cp .env.example .env
    echo "📝 Created backend/.env - Please configure it with your settings"
fi

cd ../frontend
if [ ! -f .env ]; then
    cp .env.example .env
    echo "📝 Created frontend/.env - Please configure it with your settings"
fi

echo "✅ Setup completed! Next steps:"
echo "1. Configure your .env files"
echo "2. Set up PostgreSQL database"
echo "3. Run 'npm run dev' in both backend and frontend directories"
```

#### **setup.bat** (Windows)
```batch
@echo off
echo 🚀 Setting up IIIT Naya Raipur Alumni Portal...

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js 18+ first.
    pause
    exit /b 1
)

echo ✅ Prerequisites check passed

REM Install backend dependencies
echo 📦 Installing backend dependencies...
cd backend
npm install

REM Install frontend dependencies
echo 📦 Installing frontend dependencies...
cd ..\frontend
npm install

REM Create environment files
echo ⚙️ Setting up environment files...
cd ..\backend
if not exist .env (
    copy .env.example .env
    echo 📝 Created backend\.env - Please configure it with your settings
)

cd ..\frontend
if not exist .env (
    copy .env.example .env
    echo 📝 Created frontend\.env - Please configure it with your settings
)

echo ✅ Setup completed! Next steps:
echo 1. Configure your .env files
echo 2. Set up PostgreSQL database
echo 3. Run 'npm run dev' in both backend and frontend directories
pause
```

### **Package.json Scripts Enhancement**

#### **Backend package.json** scripts addition:
```json
{
  "scripts": {
    "setup": "npm install && npm run migrate && npm run seed",
    "migrate": "node src/config/migrate.js",
    "seed": "node src/config/seed.js",
    "reset-db": "node src/config/reset.js",
    "backup-db": "node src/scripts/backup.js",
    "test:setup": "NODE_ENV=test npm run migrate",
    "docker:build": "docker build -t alumni-portal-backend .",
    "docker:run": "docker run -p 5000:5000 alumni-portal-backend"
  }
}
```

#### **Frontend package.json** scripts addition:
```json
{
  "scripts": {
    "setup": "npm install",
    "build:staging": "vite build --mode staging",
    "build:production": "vite build --mode production",
    "preview:staging": "vite preview --mode staging",
    "docker:build": "docker build -t alumni-portal-frontend .",
    "docker:run": "docker run -p 3000:3000 alumni-portal-frontend"
  }
}
```

### **Files to Create**
- `/backend/.env.example`
- `/frontend/.env.example`
- `/SETUP.md`
- `/setup.sh`
- `/setup.bat`
- `/docker-compose.yml` (optional)
- `/docs/DEPLOYMENT.md`
- `/docs/API.md`
- `/docs/CONTRIBUTING.md`

### **Team Onboarding Checklist**
```markdown
# New Team Member Onboarding

## Getting Started Checklist
- [ ] Clone the repository
- [ ] Install prerequisites (Node.js, PostgreSQL)
- [ ] Run setup script (`./setup.sh` or `setup.bat`)
- [ ] Configure environment variables
- [ ] Set up database
- [ ] Start development servers
- [ ] Access the application
- [ ] Join team communication channels
- [ ] Read project documentation

## Development Guidelines
- [ ] Code style guidelines reviewed
- [ ] Git workflow understood
- [ ] Testing procedures learned
- [ ] Deployment process understood
```

### **Definition of Done**
- [ ] All environment files created
- [ ] Setup scripts working on all platforms
- [ ] Documentation complete and tested
- [ ] Team members can set up project in < 30 minutes
- [ ] Troubleshooting guide covers common issues
- [ ] Environment variables documented
- [ ] Security best practices documented

### **Priority**: 🔴 High
### **Estimated Time**: 6-8 hours
### **Dependencies**: None (should be done first)
