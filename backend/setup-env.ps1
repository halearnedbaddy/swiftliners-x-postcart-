# Swiftliners Backend - Environment Setup Script
# This script helps you create a .env file with the required environment variables

Write-Host "🚀 Swiftliners Backend - Environment Setup" -ForegroundColor Cyan
Write-Host ""

# Check if .env already exists
if (Test-Path ".env") {
    Write-Host "⚠️  .env file already exists!" -ForegroundColor Yellow
    $overwrite = Read-Host "Do you want to overwrite it? (y/N)"
    if ($overwrite -ne "y" -and $overwrite -ne "Y") {
        Write-Host "❌ Setup cancelled." -ForegroundColor Red
        exit
    }
}

Write-Host "📝 Creating .env file..." -ForegroundColor Green

# Get database URL
Write-Host ""
Write-Host "Database Configuration:" -ForegroundColor Cyan
Write-Host "Enter your PostgreSQL DATABASE_URL"
Write-Host "Format: postgresql://username:password@host:port/database"
Write-Host "Example: postgresql://postgres:postgres@localhost:5432/swiftliners?schema=public"
$databaseUrl = Read-Host "DATABASE_URL"

if ([string]::IsNullOrWhiteSpace($databaseUrl)) {
    $databaseUrl = "postgresql://postgres:postgres@localhost:5432/swiftliners?schema=public"
    Write-Host "Using default: $databaseUrl" -ForegroundColor Yellow
}

# Get JWT Secret
Write-Host ""
$jwtSecret = Read-Host "JWT_SECRET (press Enter for default)"
if ([string]::IsNullOrWhiteSpace($jwtSecret)) {
    $jwtSecret = "dev-jwt-secret-key-change-in-production-2024"
}

# Create .env content
$envContent = @"
# Database Configuration
DATABASE_URL="$databaseUrl"

# JWT Configuration
JWT_SECRET="$jwtSecret"

# Server Configuration
PORT=8000
NODE_ENV=development
CORS_ORIGIN="http://localhost:5173,http://localhost:5000"

# Redis Configuration (Optional - for OTP caching)
REDIS_URL="redis://localhost:6379"
REDIS_PASSWORD=""

# IntaSend Payment Gateway (Optional)
INTASEND_SECRET_KEY=""
INTASEND_PUBLISHABLE_KEY=""
INTASEND_TEST_MODE="true"
INTASEND_WALLET_ID=""

# SMS Service Configuration (Optional)
SMS_API_KEY=""
SMS_USERNAME=""

# Social Sync Configuration (Optional)
SOCIAL_SYNC_INTERVAL_MS=600000
"@

# Write to file
$envContent | Out-File -FilePath ".env" -Encoding utf8

Write-Host ""
Write-Host "✅ .env file created successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next Steps:" -ForegroundColor Cyan
Write-Host "1. Make sure PostgreSQL is running and the database exists"
Write-Host "2. Run: npx prisma generate"
Write-Host "3. Run: npx prisma migrate dev"
Write-Host "4. Run: npm run dev"
Write-Host ""
Write-Host "📖 For more details, see ENV_SETUP.md" -ForegroundColor Yellow

