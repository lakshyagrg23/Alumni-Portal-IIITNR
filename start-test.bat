@echo off
REM Quick Start Script for Testing Profile Picture Upload
REM Run this script to start both backend and frontend servers

echo ========================================
echo IIIT NR Alumni Portal - Profile Upload Test
echo ========================================
echo.

REM Check if running from correct directory
if not exist "backend" (
    echo ERROR: Please run this script from the project root directory
    echo Current directory: %CD%
    pause
    exit /b 1
)

echo Starting Backend Server...
echo.
start "Alumni Portal Backend" cmd /k "cd backend && npm run dev:local"

timeout /t 3 /nobreak > nul

echo Starting Frontend Server...
echo.
start "Alumni Portal Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo ========================================
echo Both servers are starting...
echo.
echo Backend:  http://localhost:5000
echo Frontend: http://localhost:3000
echo.
echo To test profile picture upload:
echo 1. Wait for both servers to fully start
echo 2. Login at http://localhost:3000
echo 3. Navigate to Profile page
echo 4. Go to "Basic Info" tab
echo 5. Upload your profile picture
echo ========================================
echo.
echo Press any key to close this window...
pause > nul
