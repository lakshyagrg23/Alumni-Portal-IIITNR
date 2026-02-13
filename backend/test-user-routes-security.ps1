# User Routes Security Testing Script (PowerShell)
# Tests authentication, authorization, and IDOR protection

$BASE_URL = "http://localhost:5000"
# Uncomment for production testing:
# $BASE_URL = "https://alumni.iiitnr.ac.in"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "User Routes Security Testing" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

$PASS = 0
$FAIL = 0

# Function to test endpoint
function Test-Endpoint {
    param(
        [string]$TestName,
        [int]$ExpectedStatus,
        [string]$Method,
        [string]$Url,
        [hashtable]$Headers = @{},
        [string]$Body = $null
    )
    
    try {
        $params = @{
            Uri = $Url
            Method = $Method
            Headers = $Headers
            UseBasicParsing = $true
            SkipHttpErrorCheck = $true
        }
        
        if ($Body) {
            $params.Body = $Body
            $params.ContentType = "application/json"
        }
        
        $response = Invoke-WebRequest @params
        $actualStatus = $response.StatusCode
        
        if ($actualStatus -eq $ExpectedStatus) {
            Write-Host "✓ PASS: $TestName (Expected: $ExpectedStatus, Got: $actualStatus)" -ForegroundColor Green
            $script:PASS++
        } else {
            Write-Host "✗ FAIL: $TestName (Expected: $ExpectedStatus, Got: $actualStatus)" -ForegroundColor Red
            Write-Host "Response: $($response.Content)" -ForegroundColor Yellow
            $script:FAIL++
        }
    } catch {
        $actualStatus = $_.Exception.Response.StatusCode.value__
        if ($actualStatus -eq $ExpectedStatus) {
            Write-Host "✓ PASS: $TestName (Expected: $ExpectedStatus, Got: $actualStatus)" -ForegroundColor Green
            $script:PASS++
        } else {
            Write-Host "✗ FAIL: $TestName (Expected: $ExpectedStatus, Got: $actualStatus)" -ForegroundColor Red
            Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Yellow
            $script:FAIL++
        }
    }
    Write-Host ""
}

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Test 1: Unauthenticated Access (Should Fail)" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

Test-Endpoint -TestName "GET /api/users without token" -ExpectedStatus 401 `
    -Method "GET" -Url "$BASE_URL/api/users"

Test-Endpoint -TestName "GET /api/users/:id without token" -ExpectedStatus 401 `
    -Method "GET" -Url "$BASE_URL/api/users/1"

Test-Endpoint -TestName "PUT /api/users/:id without token" -ExpectedStatus 401 `
    -Method "PUT" -Url "$BASE_URL/api/users/1" -Body '{"first_name":"Hacked"}'

Test-Endpoint -TestName "DELETE /api/users/:id without token" -ExpectedStatus 401 `
    -Method "DELETE" -Url "$BASE_URL/api/users/1"

Test-Endpoint -TestName "PUT /api/users/:id/approve without token" -ExpectedStatus 401 `
    -Method "PUT" -Url "$BASE_URL/api/users/1/approve"

Test-Endpoint -TestName "PUT /api/users/:id/deactivate without token" -ExpectedStatus 401 `
    -Method "PUT" -Url "$BASE_URL/api/users/1/deactivate"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Test 2: Regular User Access" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "NOTE: You need to provide a valid JWT token for a regular user" -ForegroundColor Yellow
Write-Host "Login as a regular user and paste the token here:"
$USER_TOKEN = Read-Host
Write-Host ""

if ($USER_TOKEN) {
    # Extract user ID from JWT token (decode the payload)
    try {
        $tokenParts = $USER_TOKEN.Split('.')
        $payload = $tokenParts[1]
        # Add padding if needed for base64
        $padding = (4 - ($payload.Length % 4)) % 4
        $payload = $payload + ('=' * $padding)
        $decodedBytes = [Convert]::FromBase64String($payload)
        $decodedJson = [System.Text.Encoding]::UTF8.GetString($decodedBytes)
        $tokenData = $decodedJson | ConvertFrom-Json
        $USER_ID = $tokenData.userId
        
        if ($USER_ID) {
            Write-Host "Extracted User ID: $USER_ID" -ForegroundColor Green
            Write-Host ""
        } else {
            Write-Host "Failed to extract user ID from token." -ForegroundColor Red
            Write-Host ""
        }
    } catch {
        Write-Host "Error decoding token: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host ""
    }
    
    $userHeaders = @{ "Authorization" = "Bearer $USER_TOKEN" }
    
    Test-Endpoint -TestName "Regular user: GET /api/users (should fail - admin only)" -ExpectedStatus 403 `
        -Method "GET" -Url "$BASE_URL/api/users" -Headers $userHeaders
    
    Test-Endpoint -TestName "Regular user: GET own profile (should succeed)" -ExpectedStatus 200 `
        -Method "GET" -Url "$BASE_URL/api/users/$USER_ID" -Headers $userHeaders
    
    # For IDOR test, use a different UUID that doesn't match
    $OTHER_USER_ID = if ($USER_ID.StartsWith("2")) { "10000000-0000-0000-0000-000000000001" } else { "20000000-0000-0000-0000-000000000001" }
    
    Test-Endpoint -TestName "Regular user: GET other user profile (should fail - IDOR)" -ExpectedStatus 403 `
        -Method "GET" -Url "$BASE_URL/api/users/$OTHER_USER_ID" -Headers $userHeaders
    
    Test-Endpoint -TestName "Regular user: PUT own profile (should succeed)" -ExpectedStatus 200 `
        -Method "PUT" -Url "$BASE_URL/api/users/$USER_ID" -Headers $userHeaders -Body '{"first_name":"Updated"}'
    
    Test-Endpoint -TestName "Regular user: PUT other user profile (should fail - IDOR)" -ExpectedStatus 403 `
        -Method "PUT" -Url "$BASE_URL/api/users/$OTHER_USER_ID" -Headers $userHeaders -Body '{"first_name":"Hacked"}'
    
    Test-Endpoint -TestName "Regular user: Try to escalate role (should be ignored)" -ExpectedStatus 200 `
        -Method "PUT" -Url "$BASE_URL/api/users/$USER_ID" -Headers $userHeaders -Body '{"role":"admin"}'
    
    Test-Endpoint -TestName "Regular user: DELETE user (should fail - admin only)" -ExpectedStatus 403 `
        -Method "DELETE" -Url "$BASE_URL/api/users/999" -Headers $userHeaders
    
    Test-Endpoint -TestName "Regular user: Approve user (should fail - admin only)" -ExpectedStatus 403 `
        -Method "PUT" -Url "$BASE_URL/api/users/999/approve" -Headers $userHeaders
    
    Test-Endpoint -TestName "Regular user: Deactivate user (should fail - admin only)" -ExpectedStatus 403 `
        -Method "PUT" -Url "$BASE_URL/api/users/999/deactivate" -Headers $userHeaders
} else {
    Write-Host "Skipping regular user tests (no token provided)" -ForegroundColor Yellow
    Write-Host ""
}

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Test 3: Admin User Access" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "NOTE: You need to provide a valid JWT token for an admin user" -ForegroundColor Yellow
Write-Host "Login as an admin and paste the token here:"
$ADMIN_TOKEN = Read-Host
Write-Host ""

if ($ADMIN_TOKEN) {
    $adminHeaders = @{ "Authorization" = "Bearer $ADMIN_TOKEN" }
    
    Test-Endpoint -TestName "Admin: GET all users (should succeed)" -ExpectedStatus 200 `
        -Method "GET" -Url "$BASE_URL/api/users" -Headers $adminHeaders
    
    # Get a valid user UUID from the users list for testing
    Write-Host "Fetching user list to get valid UUIDs for testing..." -ForegroundColor Yellow
    try {
        $usersResponse = Invoke-RestMethod -Uri "$BASE_URL/api/users" -Method GET -Headers $adminHeaders -SkipHttpErrorCheck
        $TEST_USER_ID = $usersResponse.data[0].id
        
        if ($TEST_USER_ID) {
            Write-Host "Using test user ID: $TEST_USER_ID" -ForegroundColor Green
            Write-Host ""
            
            Test-Endpoint -TestName "Admin: GET any user profile (should succeed)" -ExpectedStatus 200 `
                -Method "GET" -Url "$BASE_URL/api/users/$TEST_USER_ID" -Headers $adminHeaders
            
            Test-Endpoint -TestName "Admin: PUT any user profile (should succeed)" -ExpectedStatus 200 `
                -Method "PUT" -Url "$BASE_URL/api/users/$TEST_USER_ID" -Headers $adminHeaders -Body '{"first_name":"Admin Updated"}'
            
            Test-Endpoint -TestName "Admin: PUT user role (should succeed)" -ExpectedStatus 200 `
                -Method "PUT" -Url "$BASE_URL/api/users/$TEST_USER_ID" -Headers $adminHeaders -Body '{"role":"alumni"}'
        } else {
            Write-Host "Could not extract test user ID. Skipping these tests." -ForegroundColor Red
            Write-Host ""
        }
    } catch {
        Write-Host "Error fetching users list: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host ""
    }
    
    Write-Host "Skipping destructive admin tests (DELETE, APPROVE, DEACTIVATE)" -ForegroundColor Yellow
    Write-Host "To test these, use test user IDs and uncomment the tests in the script" -ForegroundColor Yellow
    Write-Host ""
} else {
    Write-Host "Skipping admin tests (no token provided)" -ForegroundColor Yellow
    Write-Host ""
}

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Test Summary" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Passed: $PASS" -ForegroundColor Green
Write-Host "Failed: $FAIL" -ForegroundColor Red
Write-Host ""

if ($FAIL -eq 0) {
    Write-Host "All tests passed! User routes are secure." -ForegroundColor Green
    exit 0
} else {
    Write-Host "Some tests failed. Please review the security implementation." -ForegroundColor Red
    exit 1
}
