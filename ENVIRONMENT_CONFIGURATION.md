# Environment Configuration Guide

## Overview

This guide explains how to configure the Alumni Portal to work with different deployment scenarios:
- **Local Development**: Both frontend and backend running locally
- **Hybrid Setup**: Local frontend connecting to remote backend (Your current scenario)
- **Full Production**: Both frontend and backend deployed remotely

---

## Current Setup (Hybrid - Local Frontend + Remote Backend)

### Backend (Already Deployed on Server: 172.16.61.39:5000)

Update your backend `.env` file on the server:

```env
# CORS Configuration - CRITICAL for local frontend to connect
# Add your local machine's IP or localhost
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

# Frontend URL - for email verification links
# Keep this as localhost if testing locally
FRONTEND_URL=http://localhost:3000

# OAuth Callback URLs
GOOGLE_CALLBACK_URL=http://172.16.61.39:5000/api/auth/google/callback
LINKEDIN_REDIRECT_URI=http://localhost:3000/linkedin
```

**Important**: After updating the backend `.env`, restart your backend server:
```bash
# On your remote server
pm2 restart alumni-backend
# OR
npm run dev
```

### Frontend (Running Locally)

Your `frontend/.env` should already have:

```env
# API Configuration - Points to remote backend
VITE_API_URL=http://172.16.61.39:5000
VITE_API_WS_URL=http://172.16.61.39:5000

# Frontend URL - Your local machine
VITE_APP_URL=http://localhost:3000

# LinkedIn OAuth - Must match backend configuration
VITE_LINKEDIN_REDIRECT_URI=http://localhost:3000/linkedin
```

**Start your frontend**:
```bash
cd frontend
npm run dev
```

---

## Configuration Scenarios

### Scenario 1: Local Development (Both Local)

**Backend `.env`:**
```env
PORT=5000
DATABASE_URL=postgresql://user:pass@localhost:5432/alumni_portal
FRONTEND_URL=http://localhost:3000
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback
LINKEDIN_REDIRECT_URI=http://localhost:3000/linkedin
```

**Frontend `.env`:**
```env
VITE_API_URL=http://localhost:5000
VITE_API_WS_URL=http://localhost:5000
VITE_APP_URL=http://localhost:3000
VITE_LINKEDIN_REDIRECT_URI=http://localhost:3000/linkedin
```

---

### Scenario 2: Hybrid - Local Frontend + Remote Backend (Your Case)

**Backend `.env` (on remote server):**
```env
PORT=5000
DATABASE_URL=postgresql://user:pass@remote-db:5432/alumni_portal
# IMPORTANT: Include localhost for local frontend access
FRONTEND_URL=http://localhost:3000
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
# Backend callback must use server IP/domain
GOOGLE_CALLBACK_URL=http://172.16.61.39:5000/api/auth/google/callback
# LinkedIn redirects to local frontend
LINKEDIN_REDIRECT_URI=http://localhost:3000/linkedin
```

**Frontend `.env` (on local machine):**
```env
# Point to remote backend
VITE_API_URL=http://172.16.61.39:5000
VITE_API_WS_URL=http://172.16.61.39:5000
# Local frontend URL
VITE_APP_URL=http://localhost:3000
VITE_LINKEDIN_REDIRECT_URI=http://localhost:3000/linkedin
```

---

### Scenario 3: Full Production Deployment

**Backend `.env` (on production server):**
```env
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://user:pass@db-server:5432/alumni_portal
FRONTEND_URL=https://alumni.iiitnr.ac.in
CORS_ORIGINS=https://alumni.iiitnr.ac.in,https://www.alumni.iiitnr.ac.in
GOOGLE_CALLBACK_URL=https://api.alumni.iiitnr.ac.in/api/auth/google/callback
LINKEDIN_REDIRECT_URI=https://alumni.iiitnr.ac.in/linkedin
```

**Frontend `.env` (on production):**
```env
VITE_API_URL=https://api.alumni.iiitnr.ac.in
VITE_API_WS_URL=wss://api.alumni.iiitnr.ac.in
VITE_APP_URL=https://alumni.iiitnr.ac.in
VITE_LINKEDIN_REDIRECT_URI=https://alumni.iiitnr.ac.in/linkedin
```

---

## Troubleshooting

### Issue: CORS Errors (Most Common)

**Symptoms:**
- Browser console shows: "Access to XMLHttpRequest at 'http://172.16.61.39:5000/api/...' from origin 'http://localhost:3000' has been blocked by CORS policy"

**Solutions:**

1. **Check Backend CORS Configuration**:
   - Verify `CORS_ORIGINS` in backend `.env` includes your frontend URL
   - Restart backend after changes

2. **Verify Frontend URL**:
   - Make sure `VITE_API_URL` in frontend `.env` is correct
   - Clear browser cache and restart frontend dev server

3. **Network Firewall**:
   - Ensure backend server port (5000) is accessible from your local machine
   - Test with: `curl http://172.16.61.39:5000/health`

### Issue: WebSocket Connection Failed

**Symptoms:**
- Real-time messaging doesn't work
- Console shows WebSocket connection errors

**Solutions:**

1. **Add WebSocket URL**:
   ```env
   # In frontend/.env
   VITE_API_WS_URL=http://172.16.61.39:5000
   ```

2. **Check Firewall**: Ensure WebSocket connections aren't blocked

### Issue: OAuth Redirect Mismatch

**Symptoms:**
- "redirect_uri_mismatch" error during Google/LinkedIn login

**Solutions:**

1. **Google OAuth**:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Add authorized redirect URIs:
     - `http://172.16.61.39:5000/api/auth/google/callback` (backend)
     - `http://localhost:3000/auth/google/callback` (frontend)

2. **LinkedIn OAuth**:
   - Go to [LinkedIn Developers](https://www.linkedin.com/developers/apps)
   - Add redirect URL: `http://localhost:3000/linkedin`

### Issue: Database Connection Failed

**Symptoms:**
- Backend crashes with "ECONNREFUSED" or database errors

**Solutions:**

1. **Check Database URL**:
   ```env
   DATABASE_URL=postgresql://user:password@host:5432/database_name
   ```

2. **Test Connection**:
   ```bash
   # On backend server
   cd backend
   node check-db.js
   ```

---

## Environment Variables Reference

### Critical Variables That MUST Match:

| Variable | Frontend | Backend | Must Match |
|----------|----------|---------|------------|
| `VITE_API_URL` | ✓ | - | Backend URL |
| `FRONTEND_URL` | - | ✓ | Frontend URL |
| `CORS_ORIGINS` | - | ✓ | Frontend URL(s) |
| `LINKEDIN_REDIRECT_URI` | ✓ | ✓ | **MUST BE IDENTICAL** |

### OAuth Configuration:

| Platform | Frontend Var | Backend Var | Where to Register |
|----------|--------------|-------------|-------------------|
| Google | `VITE_GOOGLE_CLIENT_ID` | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL` | [Google Cloud Console](https://console.cloud.google.com/) |
| LinkedIn | `VITE_LINKEDIN_CLIENT_ID`, `VITE_LINKEDIN_REDIRECT_URI` | `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`, `LINKEDIN_REDIRECT_URI` | [LinkedIn Developers](https://www.linkedin.com/developers/) |

---

## Quick Setup Checklist

### For Your Current Scenario (Local Frontend + Remote Backend):

- [ ] **Backend (on server 172.16.61.39)**:
  - [ ] Update `CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000`
  - [ ] Verify `FRONTEND_URL=http://localhost:3000`
  - [ ] Restart backend service

- [ ] **Frontend (on local machine)**:
  - [ ] Verify `VITE_API_URL=http://172.16.61.39:5000`
  - [ ] Verify `VITE_API_WS_URL=http://172.16.61.39:5000`
  - [ ] Restart frontend dev server (`npm run dev`)

- [ ] **Test Connection**:
  - [ ] Open browser to `http://localhost:3000`
  - [ ] Check browser console for errors
  - [ ] Test: `curl http://172.16.61.39:5000/health`

- [ ] **OAuth Setup** (if using):
  - [ ] Update Google OAuth redirect URIs in Google Cloud Console
  - [ ] Update LinkedIn redirect URI in LinkedIn Developer Portal

---

## Testing the Configuration

### 1. Test Backend Health
```bash
curl http://172.16.61.39:5000/health
```

Expected response:
```json
{
  "status": "OK",
  "message": "IIIT NR Alumni Portal API is running"
}
```

### 2. Test CORS Configuration
```bash
curl -H "Origin: http://localhost:3000" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: X-Requested-With" \
     -X OPTIONS \
     http://172.16.61.39:5000/api/auth/login
```

Should return CORS headers including:
```
Access-Control-Allow-Origin: http://localhost:3000
```

### 3. Test Frontend Connection

1. Start frontend: `npm run dev`
2. Open browser to `http://localhost:3000`
3. Open browser DevTools (F12) → Network tab
4. Try to login or register
5. Check that API calls go to `http://172.16.61.39:5000/api/...`

---

## Security Notes

### Development:
- ✓ Can use HTTP for local development
- ✓ Can use simple JWT secrets
- ✓ Can expose backend on local network

### Production:
- ✗ **NEVER** use HTTP in production (use HTTPS)
- ✗ **NEVER** commit `.env` files to git
- ✗ **NEVER** expose database credentials
- ✓ Use strong JWT secrets (64+ characters)
- ✓ Use environment-specific secrets
- ✓ Enable SSL/TLS for database connections
- ✓ Restrict CORS to specific domains only

---

## Need Help?

1. Check browser console for error messages
2. Check backend logs: `pm2 logs` or `npm run dev` output
3. Verify all environment variables are set correctly
4. Ensure firewall allows connections to backend port
5. Test with `curl` commands to isolate issues

---

## File Locations

- Frontend config: `frontend/.env`
- Backend config: `backend/.env`
- Example files:
  - `frontend/.env.example`
  - `backend/.env.example`
