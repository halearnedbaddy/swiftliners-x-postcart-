# Redis Password Guide

## Default Setup: No Password

When you run Redis with Docker using the basic command:
```powershell
docker run -d --name redis-swiftliners -p 6379:6379 redis:latest
```

**Redis has NO password by default.** This is fine for local development.

## Check if Redis Has a Password

### Method 1: Try to Connect Without Password
```powershell
docker exec -it redis-swiftliners redis-cli
```

If it connects successfully, there's no password.

### Method 2: Check Redis Configuration
```powershell
docker exec redis-swiftliners redis-cli CONFIG GET requirepass
```

- If it returns `(empty)` or `""` → **No password**
- If it returns a value → That's your password

## Setting a Redis Password (Optional)

If you want to add a password for security:

### Option 1: Set Password on Existing Container

1. **Connect to Redis:**
   ```powershell
   docker exec -it redis-swiftliners redis-cli
   ```

2. **Set password:**
   ```
   CONFIG SET requirepass your_password_here
   ```

3. **Test it:**
   ```
   AUTH your_password_here
   ```
   Should return `OK`

4. **Update your .env file:**
   ```env
   REDIS_URL="redis://localhost:6379"
   REDIS_PASSWORD="your_password_here"
   ```

**Note:** This password will be lost when the container restarts unless you save the config.

### Option 2: Create New Container with Password (Recommended)

1. **Stop and remove old container:**
   ```powershell
   docker stop redis-swiftliners
   docker rm redis-swiftliners
   ```

2. **Create new container with password:**
   ```powershell
   docker run -d --name redis-swiftliners -p 6379:6379 redis:latest redis-server --requirepass your_password_here
   ```

3. **Update your .env file:**
   ```env
   REDIS_URL="redis://localhost:6379"
   REDIS_PASSWORD="your_password_here"
   ```

### Option 3: Use Redis Configuration File (Most Secure)

1. **Create a Redis config file** (`redis.conf`):
   ```
   requirepass your_password_here
   ```

2. **Run Redis with config:**
   ```powershell
   docker run -d --name redis-swiftliners -p 6379:6379 -v ${PWD}/redis.conf:/usr/local/etc/redis/redis.conf redis:latest redis-server /usr/local/etc/redis/redis.conf
   ```

## For Your Current Setup

Since you're running Redis locally for development, **you don't need a password**. Just use:

```env
REDIS_URL="redis://localhost:6379"
REDIS_PASSWORD=""
```

## Testing Your Redis Connection

### Without Password:
```powershell
docker exec -it redis-swiftliners redis-cli ping
```
Should return: `PONG`

### With Password:
```powershell
docker exec -it redis-swiftliners redis-cli -a your_password ping
```
Should return: `PONG`

## Security Note

- **Local Development:** No password is fine
- **Production:** Always use a strong password
- **Docker Network:** If Redis is only accessible within Docker network, password is optional

## Quick Check Commands

**Check if Redis is running:**
```powershell
docker ps | findstr redis
```

**Check Redis info:**
```powershell
docker exec redis-swiftliners redis-cli INFO server
```

**Test connection from Node.js:**
```powershell
node -e "const redis = require('redis'); const client = redis.createClient({url: 'redis://localhost:6379'}); client.connect().then(() => {console.log('✅ Connected!'); client.quit();}).catch(err => console.log('❌ Error:', err.message));"
```

