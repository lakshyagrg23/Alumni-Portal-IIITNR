#!/bin/bash

# Admin Profile Fix Verification Script
# Run this after starting the backend server

echo "=========================================="
echo "Admin Profile Fix Verification"
echo "=========================================="
echo ""

# Check if backend is running
if ! curl -s http://localhost:5000/api/auth/me > /dev/null 2>&1; then
    echo "❌ Backend server is not running on http://localhost:5000"
    echo "Please start the backend server first: cd backend && npm run dev"
    exit 1
fi

echo "✅ Backend server is running"
echo ""

# Test with admin credentials (update these as needed)
ADMIN_EMAIL="admin@iiitnr.edu.in"
ADMIN_PASSWORD="admin123"

echo "🔐 Testing Admin Login..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}")

echo "Response: $LOGIN_RESPONSE"
echo ""

# Extract token
TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
    echo "❌ Failed to get admin token. Check admin credentials."
    exit 1
fi

echo "✅ Admin login successful"
echo ""

# Check if response contains onboardingCompleted (should NOT be present for admins)
if echo "$LOGIN_RESPONSE" | grep -q "onboardingCompleted"; then
    echo "⚠️  WARNING: Login response contains 'onboardingCompleted' field for admin"
    echo "    This should NOT be present for admin users!"
else
    echo "✅ Login response correctly excludes onboarding data for admin"
fi
echo ""

# Test /api/auth/me endpoint
echo "🔍 Testing /api/auth/me endpoint..."
ME_RESPONSE=$(curl -s http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer $TOKEN")

echo "Response: $ME_RESPONSE"
echo ""

if echo "$ME_RESPONSE" | grep -q "onboardingCompleted"; then
    echo "⚠️  WARNING: /me response contains 'onboardingCompleted' field for admin"
else
    echo "✅ /me endpoint correctly excludes onboarding data for admin"
fi
echo ""

# Test /api/auth/profile endpoint (should return 403)
echo "🚫 Testing /api/auth/profile endpoint (should be blocked)..."
PROFILE_RESPONSE=$(curl -s -w "\n%{http_code}" http://localhost:5000/api/auth/profile \
  -H "Authorization: Bearer $TOKEN")

HTTP_CODE=$(echo "$PROFILE_RESPONSE" | tail -n1)
PROFILE_BODY=$(echo "$PROFILE_RESPONSE" | head -n-1)

echo "HTTP Status: $HTTP_CODE"
echo "Response: $PROFILE_BODY"
echo ""

if [ "$HTTP_CODE" = "403" ]; then
    echo "✅ /profile endpoint correctly blocks admin access"
else
    echo "⚠️  WARNING: /profile endpoint returned status $HTTP_CODE (expected 403)"
fi
echo ""

# Test /api/auth/onboarding-data endpoint (should return 403)
echo "🚫 Testing /api/auth/onboarding-data endpoint (should be blocked)..."
ONBOARDING_RESPONSE=$(curl -s -w "\n%{http_code}" http://localhost:5000/api/auth/onboarding-data \
  -H "Authorization: Bearer $TOKEN")

HTTP_CODE=$(echo "$ONBOARDING_RESPONSE" | tail -n1)
ONBOARDING_BODY=$(echo "$ONBOARDING_RESPONSE" | head -n-1)

echo "HTTP Status: $HTTP_CODE"
echo "Response: $ONBOARDING_BODY"
echo ""

if [ "$HTTP_CODE" = "403" ]; then
    echo "✅ /onboarding-data endpoint correctly blocks admin access"
else
    echo "⚠️  WARNING: /onboarding-data endpoint returned status $HTTP_CODE (expected 403)"
fi
echo ""

# Test /api/auth/complete-onboarding endpoint (should return 403)
echo "🚫 Testing /api/auth/complete-onboarding endpoint (should be blocked)..."
COMPLETE_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST http://localhost:5000/api/auth/complete-onboarding \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

HTTP_CODE=$(echo "$COMPLETE_RESPONSE" | tail -n1)
COMPLETE_BODY=$(echo "$COMPLETE_RESPONSE" | head -n-1)

echo "HTTP Status: $HTTP_CODE"
echo "Response: $COMPLETE_BODY"
echo ""

if [ "$HTTP_CODE" = "403" ]; then
    echo "✅ /complete-onboarding endpoint correctly blocks admin access"
else
    echo "⚠️  WARNING: /complete-onboarding endpoint returned status $HTTP_CODE (expected 403)"
fi
echo ""

echo "=========================================="
echo "Verification Complete"
echo "=========================================="
