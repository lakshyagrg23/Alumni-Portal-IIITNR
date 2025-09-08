@echo off
setlocal enabledelayedexpansion

echo 🚀 Setting up IIIT Naya Raipur Alumni Portal...
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js 18+ first.
    echo Visit: https://nodejs.org/
    pause
    exit /b 1
)

REM Check Node.js version - simplified approach
echo ✅ Node.js found: 
node --version

REM Check if PostgreSQL is installed
psql --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠️ PostgreSQL is not installed. Please install PostgreSQL 14+ first.
    echo Visit: https://www.postgresql.org/download/windows/
    echo You can continue setup and install PostgreSQL later.
    echo.
)

echo ✅ Prerequisites check passed
echo.

REM Install backend dependencies
echo 📦 Installing backend dependencies...
cd backend
call npm install
if %errorlevel% neq 0 (
    echo ❌ Failed to install backend dependencies
    pause
    exit /b 1
)
echo ✅ Backend dependencies installed
echo.

REM Install frontend dependencies
echo 📦 Installing frontend dependencies...
cd ..\frontend
call npm install
if %errorlevel% neq 0 (
    echo ❌ Failed to install frontend dependencies
    pause
    exit /b 1
)
echo ✅ Frontend dependencies installed
echo.

REM Create environment files
echo ⚙️ Setting up environment files...
cd ..\backend
if not exist .env (
    copy .env.example .env >nul
    echo 📝 Created backend\.env - Please configure it with your settings
) else (
    echo ✅ Backend .env already exists
)

cd ..\frontend
if not exist .env (
    copy .env.example .env >nul
    echo 📝 Created frontend\.env - Please configure it with your settings
) else (
    echo ✅ Frontend .env already exists
)

cd ..

echo.
echo 🎉 Setup completed successfully!
echo.
echo 📋 Next steps:
echo 1. Configure your .env files (backend\.env and frontend\.env)
echo 2. Set up PostgreSQL database (see SETUP.md for details)
echo 3. Start development servers:
echo    - Backend: cd backend ^&^& npm run dev
echo    - Frontend: cd frontend ^&^& npm run dev
echo.
echo 📚 For detailed setup instructions, see:
echo    - SETUP.md - Comprehensive setup guide
echo    - README.md - Project overview and quick start
echo.
echo Happy coding! 🚀
echo.
pause
