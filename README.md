# IIIT Naya Raipur Alumni Portal

A comprehensive alumni portal for Dr. Shyama Prasad Mukherjee International Institute of Information Technology, Naya Raipur.

## 🚀 Features

### Core Features

- **Alumni Directory**: Advanced search and filtering by batch, department, location, industry
- **Connect with Alumni**: Direct messaging, connection requests, professional networking
- **News & Achievements**: Latest updates, alumni achievements, institute news
- **Volunteer Opportunities**: Event registration, workshop participation, webinar hosting
- **Profile Management**: Comprehensive alumni profiles with career progression
- **About Section**: Institute information and alumni success stories

### Authentication

- **Dual Login System**: Admin and Alumni access levels
- **Institute Email Login**: Automatic approval for @iiitnr.edu.in emails
- **Personal Email**: Admin approval required for external email addresses
- **Google OAuth**: Integration with Google authentication
- **JWT Security**: Secure token-based authentication

## � Quick Start

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+
- Git

### Automated Setup (Recommended)

#### Linux/macOS:

```bash
git clone https://github.com/lakshyagrg23/Alumni-Portal-IIITNR.git
cd Alumni-Portal-IIITNR
chmod +x setup.sh
./setup.sh
```

#### Windows:

```batch
git clone https://github.com/lakshyagrg23/Alumni-Portal-IIITNR.git
cd Alumni-Portal-IIITNR
setup.bat
```

### Manual Setup

1. **Clone the repository**

   ```bash
   git clone https://github.com/lakshyagrg23/Alumni-Portal-IIITNR.git
   cd Alumni-Portal-IIITNR
   ```

2. **Install dependencies**

   ```bash
   # Backend
   cd backend && npm install

   # Frontend
   cd ../frontend && npm install
   ```

3. **Environment setup**

   ```bash
   # Backend
   cd backend && cp .env.example .env

   # Frontend
   cd ../frontend && cp .env.example .env
   ```

4. **Configure database**

   ```bash
   # Create PostgreSQL database
   createdb alumni_portal

   # Run migrations (after configuring .env)
   cd backend && npm run migrate
   ```

5. **Start development servers**

   ```bash
   # Terminal 1: Backend
   cd backend && npm run dev

   # Terminal 2: Frontend
   cd frontend && npm run dev
   ```

6. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000

### 📚 Documentation

- **[SETUP.md](./SETUP.md)** - Comprehensive setup guide
- **[Team Issues Guide](./.github/TEAM_ISSUES_GUIDE.md)** - Development workflow

### Frontend

- **React.js** - Modern UI library with hooks
- **CSS Modules** - Scoped styling with IIIT NR color scheme
- **Context API** - State management
- **Axios** - HTTP client for API calls

### Backend

- **Node.js** - Runtime environment
- **Express.js** - Web application framework
- **JWT** - Authentication tokens
- **Passport.js** - Google OAuth integration
- **Multer** - File upload handling

### Database

- **PostgreSQL** - Primary database
- **Prisma/Sequelize** - ORM for database operations

### DevOps

- **Git** - Version control
- **ESLint** - Code linting
- **Prettier** - Code formatting

## 📁 Project Structure

```
alumni-portal/
├── frontend/                 # React.js application
│   ├── public/
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   ├── pages/           # Page components
│   │   ├── context/         # React context providers
│   │   ├── hooks/           # Custom React hooks
│   │   ├── services/        # API service functions
│   │   ├── styles/          # CSS modules and global styles
│   │   └── utils/           # Utility functions
│   ├── package.json
│   └── README.md
├── backend/                  # Node.js/Express API
│   ├── src/
│   │   ├── controllers/     # Route controllers
│   │   ├── models/          # Database models
│   │   ├── routes/          # API routes
│   │   ├── middleware/      # Custom middleware
│   │   ├── services/        # Business logic
│   │   ├── config/          # Configuration files
│   │   └── utils/           # Utility functions
│   ├── uploads/             # File uploads directory
│   ├── package.json
│   └── README.md
├── database/                 # Database related files
│   ├── migrations/          # Database migrations
│   ├── seeds/               # Database seeders
│   └── schema.sql           # Database schema
└── docs/                     # Documentation
    ├── api/                 # API documentation
    └── deployment/          # Deployment guides
```

## 🎨 Design System

### Colors (Matching IIIT NR Branding)

- **Primary Blue**: `#1e3a8a` - Main brand color
- **Secondary Orange**: `#f97316` - Accent color
- **Success Green**: `#10b981` - Success states
- **Background**: `#ffffff` - Clean white background
- **Text Primary**: `#374151` - Main text color
- **Text Secondary**: `#6b7280` - Secondary text

### Typography

- **Headings**: Inter/Roboto - Clean, professional
- **Body**: System fonts for optimal readability
- **Code**: Fira Code/Monaco for code snippets

## 🔧 Installation & Setup

### Prerequisites

- Node.js (v16 or higher)
- PostgreSQL (v12 or higher)
- Git

### Environment Variables

Create `.env` files in both frontend and backend directories:

#### Backend `.env`

```env
NODE_ENV=development
PORT=5000
DATABASE_URL=postgresql://username:password@localhost:5432/alumni_portal
JWT_SECRET=your_jwt_secret_key
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
EMAIL_SERVICE_API_KEY=your_email_service_key
```

#### Frontend `.env`

```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_GOOGLE_CLIENT_ID=your_google_client_id
```

### Development Setup

1. Clone the repository
2. Install dependencies for both frontend and backend
3. Set up PostgreSQL database
4. Run database migrations
5. Start development servers

## 📊 Database Schema

### Key Tables

- **users** - User authentication and basic info
- **alumni_profiles** - Detailed alumni information
- **news** - News and achievements
- **events** - Volunteer opportunities and events
- **connections** - Alumni networking connections
- **messages** - Direct messaging system

## 🚀 Getting Started

1. **Setup Database**: Create PostgreSQL database and run migrations
2. **Install Dependencies**: Run npm install in both frontend and backend
3. **Configure Environment**: Set up environment variables
4. **Start Development**: Launch both frontend and backend servers
5. **Access Portal**: Visit `http://localhost:3000`

## 👥 Team & Contribution

Built for IIIT Naya Raipur alumni community.

## 📄 License

MIT License - See LICENSE file for details

---

**Contact**: [abir@iiitnr.edu.in](mailto:abir@iiitnr.edu.in)  
**Institute**: Dr. Shyama Prasad Mukherjee International Institute of Information Technology, Naya Raipur
