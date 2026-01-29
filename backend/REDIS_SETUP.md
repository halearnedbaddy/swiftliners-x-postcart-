# Redis Setup Guide for Windows

Redis is optional but recommended for better OTP caching performance. Here are several ways to install and run Redis on Windows.

## Option 1: Using Docker (Recommended - Easiest)

If you have Docker Desktop installed:

1. **Start Docker Desktop** (if not already running)

2. **Run Redis container:**
   ```powershell
   docker run -d --name redis-swiftliners -p 6379:6379 redis:latest
   ```

3. **Verify it's running:**
   ```powershell
   docker ps
   ```
   You should see a container named `redis-swiftliners` running.

4. **Stop Redis (when needed):**
   ```powershell
   docker stop redis-swiftliners
   ```

5. **Start Redis again:**
   ```powershell
   docker start redis-swiftliners
   ```

6. **Remove Redis (if needed):**
   ```powershell
   docker stop redis-swiftliners
   docker rm redis-swiftliners
   ```

## Option 2: Using WSL (Windows Subsystem for Linux)

If you have WSL installed:

1. **Open WSL terminal:**
   ```powershell
   wsl
   ```

2. **Install Redis:**
   ```bash
   sudo apt-get update
   sudo apt-get install redis-server -y
   ```

3. **Start Redis:**
   ```bash
   sudo service redis-server start
   ```

4. **Verify it's running:**
   ```bash
   redis-cli ping
   ```
   Should return `PONG`

5. **Configure Redis to start on boot (optional):**
   ```bash
   sudo systemctl enable redis-server
   ```

6. **Stop Redis:**
   ```bash
   sudo service redis-server stop
   ```

## Option 3: Using Memurai (Windows Native Redis Alternative)

Memurai is a Redis-compatible server for Windows:

1. **Download Memurai:**
   - Visit: https://www.memurai.com/get-memurai
   - Download the free Developer Edition

2. **Install Memurai:**
   - Run the installer
   - Follow the installation wizard

3. **Start Memurai:**
   - It should start automatically as a Windows service
   - Or start it from Services (services.msc)

4. **Verify it's running:**
   ```powershell
   redis-cli ping
   ```
   (You may need to add Memurai to your PATH)

## Option 4: Using Chocolatey (Package Manager)

If you have Chocolatey installed:

1. **Install Redis:**
   ```powershell
   choco install redis-64 -y
   ```

2. **Start Redis:**
   ```powershell
   redis-server
   ```

## Quick Test After Installation

Once Redis is installed and running, test the connection:

```powershell
# If you have redis-cli installed
redis-cli ping
# Should return: PONG

# Or test from Node.js
node -e "const redis = require('redis'); const client = redis.createClient({url: 'redis://localhost:6379'}); client.connect().then(() => {console.log('✅ Redis connected!'); client.quit();}).catch(err => console.log('❌ Redis error:', err.message));"
```

## Update Your .env File

After Redis is running, make sure your `backend/.env` file has:

```env
REDIS_URL="redis://localhost:6379"
REDIS_PASSWORD=""
```

## Troubleshooting

### Port 6379 already in use
If you get an error that port 6379 is already in use:
- Check if Redis is already running: `netstat -ano | findstr :6379`
- Stop the existing Redis instance
- Or change the port in your `.env` file

### Connection refused
- Make sure Redis is actually running
- Check firewall settings
- Verify the port number matches

### Docker container keeps stopping
- Check Docker logs: `docker logs redis-swiftliners`
- Make sure Docker Desktop is running
- Try restarting the container

## Recommended: Docker Method

For development, **Docker is the easiest option** because:
- ✅ No complex installation
- ✅ Easy to start/stop
- ✅ Works on all Windows versions
- ✅ Isolated from your system
- ✅ Easy to remove when done

## Next Steps

1. Choose an installation method above
2. Start Redis
3. Restart your backend server
4. You should see: `✅ Redis connected for OTP service` in your backend logs
5. Redis errors should stop appearing

