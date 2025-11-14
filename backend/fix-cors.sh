#!/bin/bash

# Quick Fix Script for CORS Configuration
# This script helps update the backend CORS configuration to allow local frontend access

echo "======================================"
echo "Alumni Portal - CORS Quick Fix"
echo "======================================"
echo ""
echo "This script will help you configure CORS for hybrid setup:"
echo "- Local Frontend: http://localhost:3000"
echo "- Remote Backend: http://172.16.61.39:5000"
echo ""

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "❌ Error: .env file not found in current directory"
    echo "Please run this script from the backend directory"
    exit 1
fi

echo "✓ Found .env file"
echo ""

# Backup existing .env
cp .env .env.backup
echo "✓ Created backup: .env.backup"
echo ""

# Check if CORS_ORIGINS exists
if grep -q "CORS_ORIGINS" .env; then
    echo "Found existing CORS_ORIGINS configuration"
    echo "Current value:"
    grep "CORS_ORIGINS" .env
    echo ""
    echo "Updating to include localhost..."
    
    # Update CORS_ORIGINS
    sed -i 's|CORS_ORIGINS=.*|CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000|g' .env
else
    echo "CORS_ORIGINS not found. Adding it..."
    echo "" >> .env
    echo "# CORS Configuration" >> .env
    echo "CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000" >> .env
fi

echo ""
echo "✓ Updated CORS_ORIGINS in .env"
echo ""

# Show updated configuration
echo "New configuration:"
echo "----------------"
grep "CORS_ORIGINS" .env
echo "----------------"
echo ""

echo "⚠️  IMPORTANT: Restart your backend server for changes to take effect!"
echo ""
echo "If using PM2:"
echo "  pm2 restart alumni-backend"
echo ""
echo "If using npm:"
echo "  npm run dev"
echo ""
echo "✓ Done! Your backend should now accept requests from localhost:3000"
echo ""
echo "To test the connection:"
echo "  curl -H \"Origin: http://localhost:3000\" -X OPTIONS http://172.16.61.39:5000/api/auth/login"
echo ""
