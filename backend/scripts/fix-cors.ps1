# Quick Fix Script for CORS Configuration (Windows PowerShell)
# This script helps update the backend CORS configuration to allow local frontend access

Write-Host "======================================"
Write-Host "Alumni Portal - CORS Quick Fix"
Write-Host "======================================"
Write-Host ""
Write-Host "This script will help you configure CORS for hybrid setup:"
Write-Host "- Local Frontend: http://localhost:3000"
Write-Host "- Remote Backend: http://172.16.61.39:5000"
Write-Host ""

# Check if .env file exists
if (-Not (Test-Path ".env")) {
    Write-Host "❌ Error: .env file not found in current directory" -ForegroundColor Red
    Write-Host "Please run this script from the backend directory"
    exit 1
}

Write-Host "✓ Found .env file" -ForegroundColor Green
Write-Host ""

# Backup existing .env
Copy-Item ".env" ".env.backup" -Force
Write-Host "✓ Created backup: .env.backup" -ForegroundColor Green
Write-Host ""

# Read the .env file
$envContent = Get-Content ".env" -Raw

# Check if CORS_ORIGINS exists
if ($envContent -match "CORS_ORIGINS") {
    Write-Host "Found existing CORS_ORIGINS configuration"
    Write-Host "Current value:"
    Select-String -Pattern "CORS_ORIGINS" -Path ".env" | ForEach-Object { Write-Host $_.Line }
    Write-Host ""
    Write-Host "Updating to include localhost..."
    
    # Update CORS_ORIGINS
    $envContent = $envContent -replace "CORS_ORIGINS=.*", "CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000"
    Set-Content ".env" -Value $envContent -NoNewline
} else {
    Write-Host "CORS_ORIGINS not found. Adding it..."
    Add-Content ".env" "`n# CORS Configuration"
    Add-Content ".env" "CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000"
}

Write-Host ""
Write-Host "✓ Updated CORS_ORIGINS in .env" -ForegroundColor Green
Write-Host ""

# Show updated configuration
Write-Host "New configuration:"
Write-Host "----------------"
Select-String -Pattern "CORS_ORIGINS" -Path ".env" | ForEach-Object { Write-Host $_.Line }
Write-Host "----------------"
Write-Host ""

Write-Host "⚠️  IMPORTANT: Restart your backend server for changes to take effect!" -ForegroundColor Yellow
Write-Host ""
Write-Host "If using PM2:"
Write-Host "  pm2 restart alumni-backend"
Write-Host ""
Write-Host "If using npm:"
Write-Host "  npm run dev"
Write-Host ""
Write-Host "✓ Done! Your backend should now accept requests from localhost:3000" -ForegroundColor Green
Write-Host ""
Write-Host "To test the connection:"
Write-Host '  curl -Headers @{"Origin"="http://localhost:3000"} -Method OPTIONS http://172.16.61.39:5000/api/auth/login'
Write-Host ""
