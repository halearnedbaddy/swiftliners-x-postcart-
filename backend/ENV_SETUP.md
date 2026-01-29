# Environment Variables Setup Guide

## Quick Setup

The backend requires environment variables to run. Follow these steps:

### 1. Create `.env` file

In the `backend` directory, create a file named `.env` with the following content:

```env
# Database Configuration
# Replace with your PostgreSQL connection string
# Format: postgresql://username:password@host:port/database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/swiftliners?schema=public"

# JWT Configuration (Change this to a secure random string in production)
JWT_SECRET="dev-jwt-secret-key-change-in-production-2024"

# Server Configuration
PORT=8000
NODE_ENV=development
CORS_ORIGIN="http://localhost:5173,http://localhost:5000"

# Redis Configuration (Optional - for OTP caching)
# If Redis is not installed, leave these empty or remove them
REDIS_URL="redis://localhost:6379"
REDIS_PASSWORD=""

# IntaSend Payment Gateway (Optional - warnings will appear if not set)
INTASEND_SECRET_KEY=""
INTASEND_PUBLISHABLE_KEY=""
INTASEND_TEST_MODE="true"
INTASEND_WALLET_ID=""

# SMS Service Configuration (Optional)
SMS_API_KEY=""
SMS_USERNAME=""

# Social Sync Configuration (Optional)
SOCIAL_SYNC_INTERVAL_MS=600000
```

### 2. Database Setup Options

#### Option A: Local PostgreSQL (Recommended for Development)

1. Install PostgreSQL from https://www.postgresql.org/download/
2. Create a database:
   ```sql
   CREATE DATABASE swiftliners;
   ```
3. Update `DATABASE_URL` in `.env` with your PostgreSQL credentials

#### Option B: Supabase (Recommended – runs on its own)

Use **Supabase** as your database. Your inbuilt backend stays the same; only the database runs on Supabase.

**See [SUPABASE_BACKEND_SETUP.md](./SUPABASE_BACKEND_SETUP.md)** for step-by-step setup. In short:

1. Create a project at https://supabase.com
2. Copy the **Database** connection string (Settings → Database → URI)
3. Set `DATABASE_URL` in `.env` to that URI and add `?sslmode=require`
4. Run `npx prisma migrate deploy` in the backend folder

#### Option C: Other cloud databases

- **Neon**: https://neon.tech (Free tier available)
- **Railway**: https://railway.app (Free tier available)

After creating a database, copy the connection string and update `DATABASE_URL` in `.env`

### 3. Run Database Migrations

After setting up the database, run:

```bash
cd backend
npx prisma generate
npx prisma migrate dev
```

This will create all the necessary database tables.

### 4. Redis (Optional)

Redis is only needed for OTP caching. If you don't have Redis:
- The app will still work
- You'll see a connection error in the console (this is OK)
- OTP functionality will work but won't be cached

To install Redis:
- **Windows**: Use WSL or Docker
- **Mac**: `brew install redis` then `brew services start redis`
- **Linux**: `sudo apt-get install redis-server`

### 5. Start the Server

```bash
cd backend
npm run dev
```

## Troubleshooting

### Error: "Environment variable not found: DATABASE_URL"
- Make sure you created the `.env` file in the `backend` directory
- Check that the file is named exactly `.env` (not `.env.txt`)

### Error: "connect ECONNREFUSED" (Redis)
- This is OK if you don't have Redis installed
- The app will still work, just without OTP caching

### Error: "PrismaClientInitializationError"
- Check your `DATABASE_URL` is correct
- Make sure PostgreSQL is running
- Run `npx prisma generate` and `npx prisma migrate dev`

### Database Connection Issues
- Verify PostgreSQL is running: `pg_isready` (Linux/Mac) or check services (Windows)
- Check your connection string format
- Ensure the database exists

