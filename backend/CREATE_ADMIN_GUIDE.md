# Create Admin Account Guide

## Quick Admin Creation

The admin account will be created with these default credentials:

- **Email:** `admin@payloom.com`
- **Password:** `Admin123!`
- **Name:** `PayLoom Admin`

## Prerequisites

Before creating the admin account, you need:

1. **Database Connection** - Your PostgreSQL database must be accessible
2. **Environment Variables** - A `.env` file with `DATABASE_URL` configured

## Step 1: Set Up Database Connection

### ⚠️ Important for Neon Databases

If you're using **Neon** (neon.tech), your connection string **MUST** include SSL parameters:

```
postgresql://user:password@host/database?sslmode=require
```

**Common issues:**
- Neon databases pause after inactivity - wake it up in the Neon console
- SSL is required - add `?sslmode=require` to your connection string
- Use the **pooler** connection string (not the direct connection)

### Option A: If you have a database connection string

1. Create a `.env` file in the `backend` directory
2. Add your database connection string (with SSL for Neon):

```env
# For Neon databases, add ?sslmode=require
DATABASE_URL="postgresql://user:password@host/database?sslmode=require"
JWT_SECRET="dev-jwt-secret-key-change-in-production-2024"
PORT=8000
NODE_ENV=development
CORS_ORIGIN="http://localhost:5173,http://localhost:5000"
```

### Option B: Use the setup script

Run the PowerShell setup script:

```powershell
cd backend
.\setup-env.ps1
```

This will guide you through creating the `.env` file.

## Step 2: Test Database Connection

Before proceeding, test your database connection:

```bash
cd backend
npm run test-db
```

This will verify:
- Database connectivity
- SSL configuration (for Neon)
- Schema existence

If the test fails, check the troubleshooting section below.

## Step 3: Run Database Migrations

Before creating the admin, make sure your database schema is up to date:

```bash
cd backend
npx prisma generate
npx prisma migrate dev
```

## Step 4: Create Admin Account

Once your database is connected, run:

```bash
cd backend
npm run create-admin-quick
```

This will create the admin account with the default credentials shown above.

## Step 5: Login as Admin

1. Navigate to: `http://localhost:5000/admin/login`
2. Enter:
   - Email: `admin@payloom.com`
   - Password: `Admin123!`

## Alternative: Interactive Admin Creation

If you want to create an admin with custom credentials:

```bash
cd backend
npm run create-admin
```

This will prompt you for:
- Email address
- Password (minimum 6 characters)
- Name (optional)

## Troubleshooting

### "Can't reach database server"

**Solution for Neon databases:** 
1. **Wake up your database** - Neon databases pause after inactivity
   - Go to https://console.neon.tech
   - Select your project
   - Click "Resume" if the database is paused
   
2. **Add SSL to connection string** - Neon requires SSL
   - Your connection string should end with `?sslmode=require`
   - Example: `postgresql://user:pass@host/db?sslmode=require`
   
3. **Use the pooler connection** - More reliable than direct connection
   - In Neon console, use the "Pooler" connection string (not "Direct connection")
   - Pooler strings usually have `-pooler` in the hostname

**General solutions:**
- Check your `DATABASE_URL` in the `.env` file
- Ensure your database server is running
- Verify network connectivity to the database
- Test connection with: `npm run test-db`

### "Invalid email address"

**Solution:**
- Make sure the email contains an `@` symbol
- Email will be converted to lowercase automatically

### "Password must be at least 6 characters"

**Solution:**
- Use a password with at least 6 characters
- For security, use a strong password (12+ characters recommended)

### "This email is already in use"

**Solution:**
- If the email exists but is not an admin, the script will ask if you want to upgrade it
- If it's already an admin, you'll need to use a different email or use the existing credentials

## Security Notes

- The password is hashed using bcrypt (12 rounds)
- Admin users cannot be created through the public signup page
- All admin login attempts are logged
- Admin accounts have stricter security (3 failed attempts = 1 hour lockout)

## After Creating Admin

Once the admin account is created, you can:

1. Login at: `http://localhost:5000/admin/login`
2. Access the admin dashboard at: `http://localhost:5000/admin`
3. Manage users, transactions, disputes, and platform settings
