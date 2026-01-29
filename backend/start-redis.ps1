# Redis Setup Script for Swiftliners Backend
# This script helps you start Redis using Docker

Write-Host "🚀 Swiftliners - Redis Setup" -ForegroundColor Cyan
Write-Host ""

# Check if Docker is installed
$dockerInstalled = Get-Command docker -ErrorAction SilentlyContinue
if (-not $dockerInstalled) {
    Write-Host "❌ Docker is not installed!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install Docker Desktop from: https://www.docker.com/products/docker-desktop" -ForegroundColor Yellow
    Write-Host "Or use one of the alternative methods in REDIS_SETUP.md" -ForegroundColor Yellow
    exit 1
}

# Check if Docker is running
try {
    docker ps | Out-Null
    Write-Host "✅ Docker is running" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Docker Desktop is not running!" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Please:" -ForegroundColor Cyan
    Write-Host "1. Start Docker Desktop" -ForegroundColor White
    Write-Host "2. Wait for it to fully start (whale icon in system tray)" -ForegroundColor White
    Write-Host "3. Run this script again" -ForegroundColor White
    Write-Host ""
    Write-Host "Or press Enter to try starting Docker Desktop automatically..." -ForegroundColor Yellow
    $null = Read-Host
    Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe" -ErrorAction SilentlyContinue
    Write-Host "Waiting for Docker Desktop to start (this may take 30-60 seconds)..." -ForegroundColor Yellow
    Start-Sleep -Seconds 5
    
    # Wait for Docker to be ready
    $maxAttempts = 12
    $attempt = 0
    while ($attempt -lt $maxAttempts) {
        try {
            docker ps | Out-Null
            Write-Host "✅ Docker is now running!" -ForegroundColor Green
            break
        } catch {
            $attempt++
            Write-Host "Waiting... ($attempt/$maxAttempts)" -ForegroundColor Gray
            Start-Sleep -Seconds 5
        }
    }
    
    if ($attempt -eq $maxAttempts) {
        Write-Host "❌ Docker Desktop did not start. Please start it manually." -ForegroundColor Red
        exit 1
    }
}

# Check if Redis container already exists
$existingContainer = docker ps -a --filter "name=redis-swiftliners" --format "{{.Names}}" 2>$null
if ($existingContainer -eq "redis-swiftliners") {
    Write-Host ""
    Write-Host "📦 Redis container already exists" -ForegroundColor Cyan
    
    # Check if it's running
    $running = docker ps --filter "name=redis-swiftliners" --format "{{.Names}}" 2>$null
    if ($running -eq "redis-swiftliners") {
        Write-Host "✅ Redis is already running!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Redis is available at: redis://localhost:6379" -ForegroundColor Cyan
        exit 0
    } else {
        Write-Host "🔄 Starting existing Redis container..." -ForegroundColor Yellow
        docker start redis-swiftliners | Out-Null
        Start-Sleep -Seconds 2
        
        # Verify it started
        $running = docker ps --filter "name=redis-swiftliners" --format "{{.Names}}" 2>$null
        if ($running -eq "redis-swiftliners") {
            Write-Host "✅ Redis started successfully!" -ForegroundColor Green
            Write-Host ""
            Write-Host "Redis is available at: redis://localhost:6379" -ForegroundColor Cyan
            exit 0
        } else {
            Write-Host "❌ Failed to start Redis container" -ForegroundColor Red
            Write-Host "Try removing it first: docker rm redis-swiftliners" -ForegroundColor Yellow
            exit 1
        }
    }
}

# Create and start new Redis container
Write-Host ""
Write-Host "📦 Creating Redis container..." -ForegroundColor Cyan
$result = docker run -d --name redis-swiftliners -p 6379:6379 redis:latest 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Redis container created and started!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Redis is now running at: redis://localhost:6379" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "📝 Next steps:" -ForegroundColor Yellow
    Write-Host "1. Make sure your backend/.env file has: REDIS_URL=`"redis://localhost:6379`"" -ForegroundColor White
    Write-Host "2. Restart your backend server" -ForegroundColor White
    Write-Host "3. You should see: '✅ Redis connected for OTP service' in the logs" -ForegroundColor White
    Write-Host ""
    Write-Host "To stop Redis: docker stop redis-swiftliners" -ForegroundColor Gray
    Write-Host "To start Redis: docker start redis-swiftliners" -ForegroundColor Gray
    Write-Host "To remove Redis: docker stop redis-swiftliners; docker rm redis-swiftliners" -ForegroundColor Gray
} else {
    Write-Host "❌ Failed to create Redis container" -ForegroundColor Red
    Write-Host "Error:" -ForegroundColor Red
    Write-Host $result -ForegroundColor Red
    exit 1
}

