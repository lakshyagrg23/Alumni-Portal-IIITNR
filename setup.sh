#!/bin/bash

echo "🚀 Setting up IIIT Naya Raipur Alumni Portal..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js 18+ first.${NC}"
    echo "Visit: https://nodejs.org/"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt "18" ]; then
    echo -e "${RED}❌ Node.js version 18+ required. Current version: $(node --version)${NC}"
    exit 1
fi

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo -e "${YELLOW}⚠️  PostgreSQL is not installed. Please install PostgreSQL 14+ first.${NC}"
    echo "Visit: https://www.postgresql.org/download/"
    echo "You can continue setup and install PostgreSQL later."
fi

echo -e "${GREEN}✅ Prerequisites check passed${NC}"

# Install backend dependencies
echo -e "${BLUE}📦 Installing backend dependencies...${NC}"
cd backend
if npm install; then
    echo -e "${GREEN}✅ Backend dependencies installed${NC}"
else
    echo -e "${RED}❌ Failed to install backend dependencies${NC}"
    exit 1
fi

# Install frontend dependencies
echo -e "${BLUE}📦 Installing frontend dependencies...${NC}"
cd ../frontend
if npm install; then
    echo -e "${GREEN}✅ Frontend dependencies installed${NC}"
else
    echo -e "${RED}❌ Failed to install frontend dependencies${NC}"
    exit 1
fi

# Create environment files
echo -e "${BLUE}⚙️ Setting up environment files...${NC}"
cd ../backend
if [ ! -f .env ]; then
    cp .env.example .env
    echo -e "${YELLOW}📝 Created backend/.env - Please configure it with your settings${NC}"
else
    echo -e "${GREEN}✅ Backend .env already exists${NC}"
fi

cd ../frontend
if [ ! -f .env ]; then
    cp .env.example .env
    echo -e "${YELLOW}📝 Created frontend/.env - Please configure it with your settings${NC}"
else
    echo -e "${GREEN}✅ Frontend .env already exists${NC}"
fi

cd ..

echo ""
echo -e "${GREEN}🎉 Setup completed successfully!${NC}"
echo ""
echo -e "${BLUE}📋 Next steps:${NC}"
echo "1. Configure your .env files (backend/.env and frontend/.env)"
echo "2. Set up PostgreSQL database (see SETUP.md for details)"
echo "3. Start development servers:"
echo "   - Backend: cd backend && npm run dev"
echo "   - Frontend: cd frontend && npm run dev"
echo ""
echo -e "${BLUE}📚 For detailed setup instructions, see:${NC}"
echo "   - SETUP.md - Comprehensive setup guide"
echo "   - README.md - Project overview and quick start"
echo ""
echo -e "${GREEN}Happy coding! 🚀${NC}"
