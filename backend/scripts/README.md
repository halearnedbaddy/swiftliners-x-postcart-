# Admin User Creation Script

This script helps you create an admin user for the Swiftline platform.

## Prerequisites

1. Make sure your `.env` file is configured with the correct `DATABASE_URL`
2. Ensure your database is running and accessible
3. Run Prisma migrations if you haven't already:
   ```bash
   npm run prisma:migrate
   ```

## Usage

### Option 1: Using npm script (Recommended)
```bash
npm run create-admin
```

### Option 2: Direct execution
```bash
tsx scripts/create-admin.ts
```

## What the script does

1. Prompts you for:
   - Email address (required)
   - Password (minimum 6 characters, required)
   - Name (optional, defaults to "Admin User")

2. Checks if the email already exists:
   - If it exists and is already an admin, it will exit
   - If it exists but is not an admin, it will ask if you want to upgrade it

3. Creates the admin user with:
   - `role: ADMIN`
   - `accountStatus: ACTIVE`
   - `isActive: true`
   - `isVerified: true`
   - `isEmailVerified: true`

4. Creates a wallet for the admin user (for consistency)

5. Displays the credentials and login URL

## Example

```bash
$ npm run create-admin

🔐 Admin User Creation Script

This script will create an admin user in the database.

Enter admin email: admin@swiftline.com
Enter admin password (min 6 characters): SecurePass123!
Enter admin name (optional, press Enter for "Admin User"): 

⏳ Creating admin user...

✅ Admin user created successfully!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 Admin Credentials:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📧 Email:    admin@swiftline.com
🔑 Password: SecurePass123!
👤 Name:     Admin User
🆔 User ID:  abc123-def456-...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🌐 Login URL: http://localhost:8080/admin/login

⚠️  IMPORTANT: Save these credentials securely!
```

## Security Notes

- The password is hashed using bcrypt (12 rounds)
- Admin users cannot be created through the public signup page
- All admin login attempts are logged in the audit log
- Admin accounts have stricter security (3 failed attempts = 1 hour lockout)

## Troubleshooting

### "Invalid email address"
- Make sure the email contains an `@` symbol
- Email will be converted to lowercase automatically

### "Password must be at least 6 characters"
- Use a password with at least 6 characters
- For security, use a strong password (12+ characters recommended)

### "This email is already in use"
- The email is already registered
- If it's not an admin, the script will ask if you want to upgrade it
- If it's already an admin, you'll need to use a different email

### Database connection errors
- Check your `DATABASE_URL` in `.env`
- Ensure your database server is running
- Verify network connectivity

## After Creating Admin

1. Navigate to: `http://localhost:8080/admin/login`
2. Enter the email and password you just created
3. You'll be redirected to the admin dashboard at `/admin`

