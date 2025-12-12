# Admin Profile Fix Verification Script (PowerShell)
# Run this after starting the backend server

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Admin Profile Fix Verification" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Check if backend is running
try {
    $null = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/me" -Method Get -ErrorAction Stop
    Write-Host "✅ Backend server is running" -ForegroundColor Green
} catch {
    Write-Host "❌ Backend server is not running on http://localhost:5000" -ForegroundColor Red
    Write-Host "Please start the backend server first: cd backend; npm run dev" -ForegroundColor Yellow
    exit 1
}
Write-Host ""

# Test with admin credentials (update these as needed)
$adminEmail = "admin@iiitnr.edu.in"
$adminPassword = "admin123"

Write-Host "🔐 Testing Admin Login..." -ForegroundColor Yellow

$loginBody = @{
    email = $adminEmail
    password = $adminPassword
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" `
        -Method Post `
        -ContentType "application/json" `
        -Body $loginBody

    Write-Host "✅ Admin login successful" -ForegroundColor Green
    $token = $loginResponse.token

    # Check if response contains onboardingCompleted
    if ($loginResponse.user.PSObject.Properties.Name -contains "onboardingCompleted") {
        Write-Host "⚠️  WARNING: Login response contains 'onboardingCompleted' field for admin" -ForegroundColor Red
        Write-Host "    This should NOT be present for admin users!" -ForegroundColor Red
    } else {
        Write-Host "✅ Login response correctly excludes onboarding data for admin" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Failed to login with admin credentials" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}
Write-Host ""

# Test /api/auth/me endpoint
Write-Host "🔍 Testing /api/auth/me endpoint..." -ForegroundColor Yellow

try {
    $meResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/me" `
        -Method Get `
        -Headers @{ Authorization = "Bearer $token" }

    if ($meResponse.data.PSObject.Properties.Name -contains "onboardingCompleted") {
        Write-Host "⚠️  WARNING: /me response contains 'onboardingCompleted' field for admin" -ForegroundColor Red
    } else {
        Write-Host "✅ /me endpoint correctly excludes onboarding data for admin" -ForegroundColor Green
    }
} catch {
    Write-Host "⚠️  Error testing /me endpoint" -ForegroundColor Red
}
Write-Host ""

# Test /api/auth/profile endpoint (should return 403)
Write-Host "🚫 Testing /api/auth/profile endpoint (should be blocked)..." -ForegroundColor Yellow

try {
    $profileResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/profile" `
        -Method Get `
        -Headers @{ Authorization = "Bearer $token" }
    Write-Host "⚠️  WARNING: /profile endpoint did not block admin (expected 403)" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 403) {
        Write-Host "✅ /profile endpoint correctly blocks admin access (403)" -ForegroundColor Green
    } else {
        Write-Host "⚠️  WARNING: /profile endpoint returned status $($_.Exception.Response.StatusCode.value__) (expected 403)" -ForegroundColor Red
    }
}
Write-Host ""

# Test /api/auth/onboarding-data endpoint (should return 403)
Write-Host "🚫 Testing /api/auth/onboarding-data endpoint (should be blocked)..." -ForegroundColor Yellow

try {
    $onboardingResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/onboarding-data" `
        -Method Get `
        -Headers @{ Authorization = "Bearer $token" }
    Write-Host "⚠️  WARNING: /onboarding-data endpoint did not block admin (expected 403)" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 403) {
        Write-Host "✅ /onboarding-data endpoint correctly blocks admin access (403)" -ForegroundColor Green
    } else {
        Write-Host "⚠️  WARNING: /onboarding-data endpoint returned status $($_.Exception.Response.StatusCode.value__) (expected 403)" -ForegroundColor Red
    }
}
Write-Host ""

# Test /api/auth/complete-onboarding endpoint (should return 403)
Write-Host "🚫 Testing /api/auth/complete-onboarding endpoint (should be blocked)..." -ForegroundColor Yellow

try {
    $completeResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/complete-onboarding" `
        -Method Post `
        -Headers @{ 
            Authorization = "Bearer $token"
            "Content-Type" = "application/json"
        }
    Write-Host "⚠️  WARNING: /complete-onboarding endpoint did not block admin (expected 403)" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 403) {
        Write-Host "✅ /complete-onboarding endpoint correctly blocks admin access (403)" -ForegroundColor Green
    } else {
        Write-Host "⚠️  WARNING: /complete-onboarding endpoint returned status $($_.Exception.Response.StatusCode.value__) (expected 403)" -ForegroundColor Red
    }
}
Write-Host ""

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Verification Complete" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
