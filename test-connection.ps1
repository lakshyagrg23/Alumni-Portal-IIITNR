# Test Connection Script
# This script helps verify that your local frontend can connect to the remote backend

Write-Host "======================================"
Write-Host "Alumni Portal - Connection Test"
Write-Host "======================================"
Write-Host ""

$backendUrl = "http://172.16.61.39:5000"
$frontendOrigin = "http://localhost:3000"

Write-Host "Testing connection from local frontend to remote backend..."
Write-Host "Backend URL: $backendUrl"
Write-Host "Frontend Origin: $frontendOrigin"
Write-Host ""

# Test 1: Backend Health Check
Write-Host "[Test 1/4] Testing backend health endpoint..." -ForegroundColor Cyan
try {
    $healthResponse = Invoke-RestMethod -Uri "$backendUrl/health" -Method Get -ErrorAction Stop
    Write-Host "✓ Backend is running!" -ForegroundColor Green
    Write-Host "  Status: $($healthResponse.status)" -ForegroundColor Gray
    Write-Host "  Message: $($healthResponse.message)" -ForegroundColor Gray
} catch {
    Write-Host "✗ Backend health check failed!" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Possible issues:" -ForegroundColor Yellow
    Write-Host "  - Backend server is not running on $backendUrl"
    Write-Host "  - Firewall is blocking port 5000"
    Write-Host "  - Backend crashed or has errors"
    Write-Host ""
    Write-Host "Exiting tests..."
    exit 1
}

Write-Host ""

# Test 2: CORS Preflight
Write-Host "[Test 2/4] Testing CORS configuration..." -ForegroundColor Cyan
try {
    $headers = @{
        "Origin" = $frontendOrigin
        "Access-Control-Request-Method" = "POST"
        "Access-Control-Request-Headers" = "content-type,authorization"
    }
    
    $corsResponse = Invoke-WebRequest -Uri "$backendUrl/api/auth/login" -Method Options -Headers $headers -ErrorAction Stop
    
    $allowOrigin = $corsResponse.Headers["Access-Control-Allow-Origin"]
    $allowCredentials = $corsResponse.Headers["Access-Control-Allow-Credentials"]
    
    if ($allowOrigin -eq $frontendOrigin -or $allowOrigin -eq "*") {
        Write-Host "✓ CORS is configured correctly!" -ForegroundColor Green
        Write-Host "  Allow-Origin: $allowOrigin" -ForegroundColor Gray
        Write-Host "  Allow-Credentials: $allowCredentials" -ForegroundColor Gray
    } 
    else {
        Write-Host "✗ CORS configuration issue!" -ForegroundColor Red
        Write-Host "  Expected Origin: $frontendOrigin" -ForegroundColor Red
        Write-Host "  Allowed Origin: $allowOrigin" -ForegroundColor Red
        Write-Host ""
        Write-Host "Fix: Update CORS_ORIGINS in backend/.env" -ForegroundColor Yellow
        Write-Host "  CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000"
    }
} 
catch {
    Write-Host "⚠ CORS test inconclusive (this might be OK)" -ForegroundColor Yellow
    Write-Host "  Some servers don't respond to OPTIONS requests" -ForegroundColor Gray
}

Write-Host ""

# Test 3: API Endpoint Accessibility
Write-Host "[Test 3/4] Testing API endpoint accessibility..." -ForegroundColor Cyan
try {
    # Try to access a public API endpoint (should return 401 or error but not connection refused)
    $response = Invoke-WebRequest -Uri "$backendUrl/api/users/profile/me" -Method Get -ErrorAction Stop
    Write-Host "✓ API endpoints are accessible!" -ForegroundColor Green
} 
catch {
    if ($_.Exception.Response.StatusCode -eq 401) {
        Write-Host "✓ API endpoints are accessible (got expected 401 Unauthorized)!" -ForegroundColor Green
    } 
    elseif ($_.Exception.Response.StatusCode -eq 404) {
        Write-Host "✓ API endpoints are accessible (got 404, endpoint might have different path)!" -ForegroundColor Green
    } 
    else {
        Write-Host "⚠ Unexpected response from API" -ForegroundColor Yellow
        Write-Host "  Status: $($_.Exception.Response.StatusCode)" -ForegroundColor Gray
    }
}

Write-Host ""

# Test 4: Frontend .env Configuration
Write-Host "[Test 4/4] Checking frontend .env configuration..." -ForegroundColor Cyan

$frontendEnvPath = "frontend\.env"
if (Test-Path $frontendEnvPath) {
    $envContent = Get-Content $frontendEnvPath -Raw
    
    if ($envContent -match "VITE_API_URL=http://172\.16\.61\.39:5000") {
        Write-Host "✓ Frontend .env is configured correctly!" -ForegroundColor Green
        Write-Host "  VITE_API_URL points to remote backend" -ForegroundColor Gray
    } 
    else {
        Write-Host "⚠ Frontend .env might need updating" -ForegroundColor Yellow
        Write-Host "  Expected: VITE_API_URL=http://172.16.61.39:5000" -ForegroundColor Gray
        
        if ($envContent -match "VITE_API_URL=(.*)") {
            Write-Host "  Current: $($matches[1])" -ForegroundColor Gray
        }
    }
    
    # Check for WebSocket URL
    if ($envContent -match "VITE_API_WS_URL") {
        Write-Host "✓ WebSocket URL is configured" -ForegroundColor Green
    } 
    else {
        Write-Host "⚠ WebSocket URL not found in .env" -ForegroundColor Yellow
        Write-Host "  Add: VITE_API_WS_URL=http://172.16.61.39:5000" -ForegroundColor Gray
    }
} 
else {
    Write-Host "✗ Frontend .env file not found!" -ForegroundColor Red
    Write-Host "  Expected location: $frontendEnvPath" -ForegroundColor Red
    Write-Host "  Copy from: frontend\.env.example" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "======================================"
Write-Host "Test Summary"
Write-Host "======================================"
Write-Host ""
Write-Host "If all tests passed, your local frontend should be able to connect to the remote backend."
Write-Host ""
Write-Host "To start testing:"
Write-Host "  1. cd frontend"
Write-Host "  2. npm run dev"
Write-Host "  3. Open http://localhost:3000 in your browser"
Write-Host "  4. Check browser console (F12) for any errors"
Write-Host ""
Write-Host "If you see CORS errors:" -ForegroundColor Yellow
Write-Host "  1. SSH into your backend server (172.16.61.39)"
Write-Host "  2. Run: cd /path/to/backend ; .\fix-cors.ps1"
Write-Host "  3. Restart backend: pm2 restart alumni-backend"
Write-Host ""
