# Environment Variables Configuration Guide

This document explains how to properly configure environment variables for both local development and production deployment.

## 📁 Environment Files Structure

```
Alumni Portal/
├── backend/
│   ├── .env                      # Your local backend config (git-ignored)
│   ├── .env.example              # Basic template
│   ├── .env.local.example        # ✨ NEW: Detailed local development template
│   └── .env.production.example   # ✨ NEW: Production deployment template
└── frontend/
    ├── .env                      # Your local frontend config (git-ignored)
    ├── .env.example              # Basic template
    ├── .env.local.example        # ✨ NEW: Detailed local development template
    └── .env.production.example   # ✨ NEW: Production deployment template
```

## 🚀 Quick Start

### For Local Development

1. **Backend Setup:**

   ```bash
   cd backend
   cp .env.local.example .env
   # Edit .env with your local values
   ```

2. **Frontend Setup:**
   ```bash
   cd frontend
   cp .env.local.example .env
   # Edit .env with your local values
   ```

### For Production Deployment

1. **Backend Setup:**

   ```bash
   cd backend
   cp .env.production.example .env
   # Edit .env with your production values
   ```

2. **Frontend Setup:**
   ```bash
   cd frontend
   cp .env.production.example .env.production
   # Edit .env.production with your production values
   ```

## 🔧 Configuration Details

### Backend Environment Variables

#### Critical Variables (Must Configure)

| Variable       | Local Example                                 | Production Example                    | Description           |
| -------------- | --------------------------------------------- | ------------------------------------- | --------------------- |
| `NODE_ENV`     | `development`                                 | `production`                          | Environment mode      |
| `PORT`         | `5000`                                        | `5000`                                | Server port           |
| `DATABASE_URL` | `postgresql://...@localhost:5432/...`         | `postgresql://...@prod-host:5432/...` | PostgreSQL connection |
| `JWT_SECRET`   | Random string                                 | Strong random string                  | JWT signing secret    |
| `FRONTEND_URL` | `http://localhost:3000`                       | `https://alumni.iiitnr.ac.in`         | Frontend URL          |
| `CORS_ORIGINS` | `http://localhost:3000,http://127.0.0.1:3000` | `https://alumni.iiitnr.ac.in`         | Allowed CORS origins  |

#### OAuth Configuration

| Variable                 | Description                        |
| ------------------------ | ---------------------------------- |
| `GOOGLE_CLIENT_ID`       | Google OAuth client ID             |
| `GOOGLE_CLIENT_SECRET`   | Google OAuth client secret         |
| `GOOGLE_CALLBACK_URL`    | Backend callback URL for Google    |
| `LINKEDIN_CLIENT_ID`     | LinkedIn OAuth client ID           |
| `LINKEDIN_CLIENT_SECRET` | LinkedIn OAuth client secret       |
| `LINKEDIN_REDIRECT_URI`  | Frontend redirect URI for LinkedIn |

#### Email Configuration

| Variable         | Description                                    |
| ---------------- | ---------------------------------------------- |
| `EMAIL_SERVICE`  | Email service provider (gmail, sendgrid, etc.) |
| `EMAIL_USER`     | Email username                                 |
| `EMAIL_PASSWORD` | Email password or app password                 |
| `EMAIL_FROM`     | From address with display name                 |

### Frontend Environment Variables

#### Critical Variables (Must Configure)

| Variable                     | Local Example                    | Production Example                     | Description       |
| ---------------------------- | -------------------------------- | -------------------------------------- | ----------------- |
| `VITE_API_URL`               | `http://localhost:5000/api`      | `https://api.alumni.iiitnr.ac.in/api`  | Backend API URL   |
| `VITE_API_WS_URL`            | `http://localhost:5000`          | `https://api.alumni.iiitnr.ac.in`      | WebSocket URL     |
| `VITE_APP_URL`               | `http://localhost:3000`          | `https://alumni.iiitnr.ac.in`          | Frontend URL      |
| `VITE_GOOGLE_CLIENT_ID`      | Google client ID                 | Production Google client ID            | Google OAuth      |
| `VITE_LINKEDIN_CLIENT_ID`    | LinkedIn client ID               | Production LinkedIn client ID          | LinkedIn OAuth    |
| `VITE_LINKEDIN_REDIRECT_URI` | `http://localhost:3000/linkedin` | `https://alumni.iiitnr.ac.in/linkedin` | LinkedIn callback |

## ✅ Changes Made to Fix Hardcoded Values

### Backend Changes

1. **server.js**

   - ✅ CORS origins now use `process.env.CORS_ORIGINS` or `process.env.FRONTEND_URL`
   - ✅ Socket.io CORS now uses environment variables
   - ✅ Console logs use dynamic URLs based on environment

2. **routes/auth.js**

   - ✅ LinkedIn redirect URI uses `process.env.LINKEDIN_REDIRECT_URI`

3. **config/database.js**
   - ✅ Already using environment variables properly

### Frontend Changes

1. **services/linked_in.jsx**

   - ✅ Redirect URI now uses `VITE_LINKEDIN_REDIRECT_URI`

2. **pages/auth/LinkedInCallback.jsx**

   - ✅ Uses `VITE_LINKEDIN_REDIRECT_URI` from environment

3. **vite.config.js**

   - ✅ Proxy target now uses `process.env.VITE_API_URL`

4. **API Service Files**
   - ✅ All already have proper fallbacks: `import.meta.env.VITE_API_URL || 'http://localhost:5000/api'`
   - ✅ This pattern is correct and allows development without .env file

## 🔐 Security Best Practices

### Local Development

- ✅ Use `.env` file (git-ignored)
- ✅ Never commit actual credentials
- ✅ Use localhost URLs
- ✅ Enable debug mode for troubleshooting

### Production

- ✅ Use strong, randomly generated secrets
- ✅ Always use HTTPS for production URLs
- ✅ Disable debug mode
- ✅ Use environment variables from hosting platform (not .env file)
- ✅ Restrict CORS to production domains only
- ✅ Use managed database with SSL
- ✅ Use professional email service (not Gmail)

## 🎯 Environment Variable Priority

### Backend (Node.js)

1. System environment variables (highest priority)
2. `.env` file
3. Hardcoded fallbacks in code (lowest priority)

### Frontend (Vite)

1. `.env.production` (for production builds)
2. `.env.local` (for local overrides)
3. `.env` (default)
4. Hardcoded fallbacks in code

## 🧪 Testing Your Configuration

### Backend

```bash
cd backend
node -e "require('dotenv').config(); console.log('FRONTEND_URL:', process.env.FRONTEND_URL)"
```

### Frontend

```bash
cd frontend
npm run dev
# Check browser console: console.log(import.meta.env)
```

## 📝 Common Issues & Solutions

### Issue: CORS errors in production

**Solution:** Ensure `CORS_ORIGINS` includes your production frontend URL

### Issue: OAuth callback mismatch

**Solution:** Ensure callback URLs in code match exactly with OAuth provider settings

### Issue: Database connection fails

**Solution:** Check `DATABASE_URL` format and credentials

### Issue: Environment variables not loading

**Solution:**

- Backend: Ensure `dotenv/config` is imported at the top
- Frontend: Ensure variables start with `VITE_` prefix
- Restart dev server after changing .env files

## 🚢 Deployment Checklist

- [ ] Copy `.env.production.example` to `.env`
- [ ] Update all `localhost` URLs to production domains
- [ ] Generate new strong JWT_SECRET
- [ ] Configure production database URL
- [ ] Set up production email service
- [ ] Update OAuth redirect URIs in provider dashboards
- [ ] Test all OAuth flows in production
- [ ] Verify CORS settings
- [ ] Enable SSL/TLS for database
- [ ] Disable debug mode
- [ ] Set up monitoring and logging

## 📚 Additional Resources

- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)
- [Node.js dotenv](https://github.com/motdotla/dotenv)
- [PostgreSQL Connection Strings](https://www.postgresql.org/docs/current/libpq-connect.html#LIBPQ-CONNSTRING)
- [OAuth 2.0 Best Practices](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-security-topics)
