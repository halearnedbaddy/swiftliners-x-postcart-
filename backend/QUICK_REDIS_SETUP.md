# Quick Redis Setup for Windows

## Step 1: Start Docker Desktop

1. Open Docker Desktop from your Start menu
2. Wait for it to fully start (you'll see a whale icon in your system tray)
3. Make sure it says "Docker Desktop is running"

## Step 2: Run Redis Container

Open PowerShell or Command Prompt and run:

```powershell
docker run -d --name redis-swiftliners -p 6379:6379 redis:latest
```

## Step 3: Verify Redis is Running

```powershell
docker ps
```

You should see a container named `redis-swiftliners` in the list.

## Step 4: Update Your .env File

Make sure your `backend/.env` file has:

```env
REDIS_URL="redis://localhost:6379"
REDIS_PASSWORD=""
```

## Step 5: Restart Your Backend

Restart your backend server. You should see:
```
✅ Redis connected for OTP service
```

## Useful Commands

**Stop Redis:**
```powershell
docker stop redis-swiftliners
```

**Start Redis:**
```powershell
docker start redis-swiftliners
```

**Remove Redis (if you want to start fresh):**
```powershell
docker stop redis-swiftliners
docker rm redis-swiftliners
```

## Troubleshooting

**If Docker Desktop is not running:**
- Start Docker Desktop manually
- Wait 30-60 seconds for it to fully start
- Then run the docker commands

**If port 6379 is already in use:**
- Check what's using it: `netstat -ano | findstr :6379`
- Stop the existing service or change the port

**If you see connection errors:**
- Make sure Docker Desktop is running
- Verify the container is running: `docker ps`
- Check container logs: `docker logs redis-swiftliners`

