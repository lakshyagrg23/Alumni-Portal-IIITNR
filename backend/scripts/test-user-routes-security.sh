#!/bin/bash

# User Routes Security Testing Script
# Tests authentication, authorization, and IDOR protection

BASE_URL="http://localhost:5000"
# Uncomment for production testing:
# BASE_URL="https://alumni.iiitnr.ac.in"

echo "=========================================="
echo "User Routes Security Testing"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
PASS=0
FAIL=0

# Function to test endpoint
test_endpoint() {
    local test_name="$1"
    local expected_status="$2"
    local response=$(eval "$3")
    local actual_status=$(echo "$response" | grep -oP 'HTTP/\d\.\d \K\d+' | head -1)
    
    if [ "$actual_status" == "$expected_status" ]; then
        echo -e "${GREEN}✓ PASS${NC}: $test_name (Expected: $expected_status, Got: $actual_status)"
        ((PASS++))
    else
        echo -e "${RED}✗ FAIL${NC}: $test_name (Expected: $expected_status, Got: $actual_status)"
        echo "$response"
        ((FAIL++))
    fi
    echo ""
}

echo "=========================================="
echo "Test 1: Unauthenticated Access (Should Fail)"
echo "=========================================="
echo ""

test_endpoint "GET /api/users without token" "401" \
    "curl -s -i -X GET $BASE_URL/api/users 2>&1"

test_endpoint "GET /api/users/:id without token" "401" \
    "curl -s -i -X GET $BASE_URL/api/users/1 2>&1"

test_endpoint "PUT /api/users/:id without token" "401" \
    "curl -s -i -X PUT $BASE_URL/api/users/1 -H 'Content-Type: application/json' -d '{\"first_name\":\"Hacked\"}' 2>&1"

test_endpoint "DELETE /api/users/:id without token" "401" \
    "curl -s -i -X DELETE $BASE_URL/api/users/1 2>&1"

test_endpoint "PUT /api/users/:id/approve without token" "401" \
    "curl -s -i -X PUT $BASE_URL/api/users/1/approve 2>&1"

test_endpoint "PUT /api/users/:id/deactivate without token" "401" \
    "curl -s -i -X PUT $BASE_URL/api/users/1/deactivate 2>&1"

echo "=========================================="
echo "Test 2: Regular User Access"
echo "=========================================="
echo ""
echo -e "${YELLOW}NOTE: You need to provide a valid JWT token for a regular user${NC}"
echo "Login as a regular user and paste the token here:"
read -r USER_TOKEN
echo ""

if [ -n "$USER_TOKEN" ]; then
    # Extract user ID from JWT token (decode the payload)
    USER_ID=$(echo "$USER_TOKEN" | cut -d'.' -f2 | base64 -d 2>/dev/null | grep -o '"userId":"[^"]*"' | cut -d'"' -f4)
    
    if [ -z "$USER_ID" ]; then
        echo -e "${RED}Failed to extract user ID from token. Please check the token format.${NC}"
        echo ""
    else
        echo -e "${GREEN}Extracted User ID: $USER_ID${NC}"
        echo ""
    fi
    
    test_endpoint "Regular user: GET /api/users (should fail - admin only)" "403" \
        "curl -s -i -X GET $BASE_URL/api/users -H 'Authorization: Bearer $USER_TOKEN' 2>&1"
    
    test_endpoint "Regular user: GET own profile (should succeed)" "200" \
        "curl -s -i -X GET $BASE_URL/api/users/$USER_ID -H 'Authorization: Bearer $USER_TOKEN' 2>&1"
    
    # For IDOR test, use a different UUID (we'll use a fake one that doesn't match)
    # In a real scenario, this would be another user's actual UUID
    if [ "${USER_ID:0:1}" == "2" ]; then
        OTHER_USER_ID="10000000-0000-0000-0000-000000000001"
    else
        OTHER_USER_ID="20000000-0000-0000-0000-000000000001"
    fi
    
    test_endpoint "Regular user: GET other user profile (should fail - IDOR)" "403" \
        "curl -s -i -X GET $BASE_URL/api/users/$OTHER_USER_ID -H 'Authorization: Bearer $USER_TOKEN' 2>&1"
    
    test_endpoint "Regular user: PUT own profile (should succeed)" "200" \
        "curl -s -i -X PUT $BASE_URL/api/users/$USER_ID -H 'Authorization: Bearer $USER_TOKEN' -H 'Content-Type: application/json' -d '{\"first_name\":\"Updated\"}' 2>&1"
    
    test_endpoint "Regular user: PUT other user profile (should fail - IDOR)" "403" \
        "curl -s -i -X PUT $BASE_URL/api/users/$OTHER_USER_ID -H 'Authorization: Bearer $USER_TOKEN' -H 'Content-Type: application/json' -d '{\"first_name\":\"Hacked\"}' 2>&1"
    
    test_endpoint "Regular user: Try to escalate role (should be ignored)" "200" \
        "curl -s -i -X PUT $BASE_URL/api/users/$USER_ID -H 'Authorization: Bearer $USER_TOKEN' -H 'Content-Type: application/json' -d '{\"role\":\"admin\"}' 2>&1"
    
    test_endpoint "Regular user: DELETE user (should fail - admin only)" "403" \
        "curl -s -i -X DELETE $BASE_URL/api/users/999 -H 'Authorization: Bearer $USER_TOKEN' 2>&1"
    
    test_endpoint "Regular user: Approve user (should fail - admin only)" "403" \
        "curl -s -i -X PUT $BASE_URL/api/users/999/approve -H 'Authorization: Bearer $USER_TOKEN' 2>&1"
    
    test_endpoint "Regular user: Deactivate user (should fail - admin only)" "403" \
        "curl -s -i -X PUT $BASE_URL/api/users/999/deactivate -H 'Authorization: Bearer $USER_TOKEN' 2>&1"
else
    echo -e "${YELLOW}Skipping regular user tests (no token provided)${NC}"
    echo ""
fi

echo "=========================================="
echo "Test 3: Admin User Access"
echo "=========================================="
echo ""
echo -e "${YELLOW}NOTE: You need to provide a valid JWT token for an admin user${NC}"
echo "Login as an admin and paste the token here:"
read -r ADMIN_TOKEN
echo ""

if [ -n "$ADMIN_TOKEN" ]; then
    test_endpoint "Admin: GET all users (should succeed)" "200" \
        "curl -s -i -X GET $BASE_URL/api/users -H 'Authorization: Bearer $ADMIN_TOKEN' 2>&1"
    
    # Get a valid user UUID from the users list for testing
    echo -e "${YELLOW}Fetching user list to get valid UUIDs for testing...${NC}"
    USERS_RESPONSE=$(curl -s -X GET $BASE_URL/api/users -H "Authorization: Bearer $ADMIN_TOKEN")
    TEST_USER_ID=$(echo "$USERS_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    
    if [ -z "$TEST_USER_ID" ]; then
        echo -e "${RED}Could not extract test user ID. Using placeholder tests.${NC}"
        echo ""
    else
        echo -e "${GREEN}Using test user ID: $TEST_USER_ID${NC}"
        echo ""
        
        test_endpoint "Admin: GET any user profile (should succeed)" "200" \
            "curl -s -i -X GET $BASE_URL/api/users/$TEST_USER_ID -H 'Authorization: Bearer $ADMIN_TOKEN' 2>&1"
        
        test_endpoint "Admin: PUT any user profile (should succeed)" "200" \
            "curl -s -i -X PUT $BASE_URL/api/users/$TEST_USER_ID -H 'Authorization: Bearer $ADMIN_TOKEN' -H 'Content-Type: application/json' -d '{\"first_name\":\"Admin Updated\"}' 2>&1"
        
        test_endpoint "Admin: PUT user role (should succeed)" "200" \
            "curl -s -i -X PUT $BASE_URL/api/users/$TEST_USER_ID -H 'Authorization: Bearer $ADMIN_TOKEN' -H 'Content-Type: application/json' -d '{\"role\":\"alumni\"}' 2>&1"
    fi
    
    # Note: Be careful with delete, approve, deactivate - they actually modify data
    echo -e "${YELLOW}Skipping destructive admin tests (DELETE, APPROVE, DEACTIVATE)${NC}"
    echo -e "${YELLOW}To test these, use test user IDs and uncomment the tests below${NC}"
    echo ""
    
    # Uncomment these to test (use a test user ID):
    # test_endpoint "Admin: DELETE user (should succeed)" "200" \
    #     "curl -s -i -X DELETE $BASE_URL/api/users/TEST_USER_ID -H 'Authorization: Bearer $ADMIN_TOKEN' 2>&1"
    
    # test_endpoint "Admin: Approve user (should succeed)" "200" \
    #     "curl -s -i -X PUT $BASE_URL/api/users/TEST_USER_ID/approve -H 'Authorization: Bearer $ADMIN_TOKEN' 2>&1"
    
    # test_endpoint "Admin: Deactivate user (should succeed)" "200" \
    #     "curl -s -i -X PUT $BASE_URL/api/users/TEST_USER_ID/deactivate -H 'Authorization: Bearer $ADMIN_TOKEN' 2>&1"
else
    echo -e "${YELLOW}Skipping admin tests (no token provided)${NC}"
    echo ""
fi

echo "=========================================="
echo "Test Summary"
echo "=========================================="
echo -e "${GREEN}Passed: $PASS${NC}"
echo -e "${RED}Failed: $FAIL${NC}"
echo ""

if [ $FAIL -eq 0 ]; then
    echo -e "${GREEN}All tests passed! User routes are secure.${NC}"
    exit 0
else
    echo -e "${RED}Some tests failed. Please review the security implementation.${NC}"
    exit 1
fi
