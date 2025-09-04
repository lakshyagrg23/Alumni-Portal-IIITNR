# 👥 Team Onboarding Checklist

## New Team Member Setup Guide

### Prerequisites Checklist ✅

- [ ] **Node.js 18+** installed ([Download](https://nodejs.org/))
- [ ] **PostgreSQL 14+** installed ([Download](https://www.postgresql.org/download/))
- [ ] **Git** installed ([Download](https://git-scm.com/))
- [ ] **VS Code** installed with recommended extensions
- [ ] **GitHub account** created and access granted

### Quick Setup (5 minutes) 🚀

1. **Clone Repository**

   ```bash
   git clone https://github.com/lakshyagrg23/Alumni-Portal-IIITNR.git
   cd Alumni-Portal-IIITNR
   ```

2. **Run Setup Script**

   **Linux/macOS:**

   ```bash
   chmod +x setup.sh
   ./setup.sh
   ```

   **Windows:**

   ```batch
   setup.bat
   ```

3. **Configure Environment**

   - Edit `backend/.env` with your database credentials
   - Edit `frontend/.env` if needed
   - See [SETUP.md](./SETUP.md) for detailed configuration

4. **Setup Database**

   ```bash
   # Create database
   createdb alumni_portal

   # Run migrations
   cd backend
   npm run migrate
   ```

5. **Start Development**

   ```bash
   # Option 1: Both servers at once
   npm run dev

   # Option 2: Separate terminals
   # Terminal 1:
   npm run dev:backend

   # Terminal 2:
   npm run dev:frontend
   ```

6. **Verify Setup**
   - Frontend: http://localhost:3000 ✅
   - Backend API: http://localhost:5000 ✅

### Development Workflow 🔄

#### Branch Strategy

```bash
# Create feature branch
git checkout -b feature/issue-number-description

# Make changes and commit
git add .
git commit -m "feat: description of changes"

# Push and create PR
git push origin feature/issue-number-description
```

#### Daily Workflow

1. Pull latest changes: `git pull origin main`
2. Start development servers: `npm run dev`
3. Work on assigned issues
4. Test changes locally
5. Create pull request for review

### VS Code Extensions 🛠️

Install these recommended extensions:

- ES7+ React/Redux/React-Native snippets
- Prettier - Code formatter
- ESLint
- Thunder Client (API testing)
- GitLens
- Auto Rename Tag
- Bracket Pair Colorizer

### Common Commands 📝

#### Development

```bash
# Start both servers
npm run dev

# Start only backend
npm run dev:backend

# Start only frontend
npm run dev:frontend

# Install all dependencies
npm run install:all
```

#### Database

```bash
cd backend

# Reset database
npm run reset-db

# Run migrations
npm run migrate

# Add seed data
npm run seed

# Complete reset and setup
npm run db:reset
```

#### Code Quality

```bash
# Lint all code
npm run lint

# Fix linting issues
npm run lint:fix

# Format code (frontend)
cd frontend
npm run format
```

### Troubleshooting 🔧

#### Port Issues

```bash
# Kill process on port 3000/5000
# Windows
netstat -ano | findstr :3000
taskkill /PID <process_id> /F

# Linux/macOS
lsof -ti:3000 | xargs kill -9
```

#### Database Issues

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

#### Module Issues

```bash
# Clean install
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

### First Task 🎯

1. Choose an issue from the GitHub Issues board
2. Assign yourself to the issue
3. Create feature branch: `feature/issue-{number}-{description}`
4. Implement the feature
5. Test locally
6. Create pull request
7. Request code review

### Communication 📞

- **Daily Standups**: [Time/Platform]
- **Code Reviews**: Via GitHub Pull Requests
- **Questions**: GitHub Issues or team chat
- **Documentation**: Update as you go

### Resources 📚

- **[README.md](./README.md)** - Project overview
- **[SETUP.md](./SETUP.md)** - Detailed setup guide
- **[Team Issues Guide](./.github/TEAM_ISSUES_GUIDE.md)** - Development strategy
- **[GitHub Issues](https://github.com/lakshyagrg23/Alumni-Portal-IIITNR/issues)** - Task management

### Team Contacts 👨‍💻👩‍💻

- **Project Lead**: [Name] - [Email/Slack]
- **Backend Lead**: [Name] - [Email/Slack]
- **Frontend Lead**: [Name] - [Email/Slack]
- **DevOps**: [Name] - [Email/Slack]

---

**Welcome to the team! 🎉**

Need help? Don't hesitate to ask questions in the team chat or create a GitHub issue.

**Ready to build something amazing? Let's go! 🚀**
