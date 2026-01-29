#!/usr/bin/env tsx

/**
 * Script to create an admin user
 * 
 * Usage:
 *   npm run create-admin
 *   or
 *   tsx scripts/create-admin.ts
 * 
 * The script will prompt you for:
 *   - Email address
 *   - Password
 *   - Name (optional, defaults to "Admin User")
 */

// Load environment variables
import 'dotenv/config';

import { PrismaClient, UserRole, SignupMethod, AccountStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';
import * as readline from 'readline';

const prisma = new PrismaClient();

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
}

async function createAdmin() {
  try {
    console.log('\n🔐 Admin User Creation Script\n');
    console.log('This script will create an admin user in the database.\n');

    // Get email
    let email = await question('Enter admin email: ');
    email = email.trim().toLowerCase();

    if (!email || !email.includes('@')) {
      console.error('❌ Invalid email address');
      process.exit(1);
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      if (existingUser.role === 'ADMIN') {
        console.error(`❌ Admin user with email ${email} already exists!`);
        process.exit(1);
      } else {
        const update = await question(
          `⚠️  User with email ${email} exists but is not an admin. Update to admin? (y/n): `
        );
        if (update.toLowerCase() !== 'y') {
          console.log('Cancelled.');
          process.exit(0);
        }

        // Update existing user to admin
        const password = await question('Enter new password: ');
        if (!password || password.length < 6) {
          console.error('❌ Password must be at least 6 characters');
          process.exit(1);
        }

        const passwordHash = await bcrypt.hash(password, 12);

        await prisma.user.update({
          where: { email },
          data: {
            role: 'ADMIN',
            passwordHash,
            isActive: true,
            accountStatus: 'ACTIVE',
            isVerified: true,
            isEmailVerified: true,
            failedLoginAttempts: 0,
            lockedUntil: null,
          },
        });

        console.log(`\n✅ Successfully updated user ${email} to admin!`);
        console.log(`\n📧 Email: ${email}`);
        console.log(`🔑 Password: ${password}`);
        console.log(`\nYou can now login at: http://localhost:8080/admin/login\n`);
        await prisma.$disconnect();
        rl.close();
        process.exit(0);
      }
    }

    // Get password
    const password = await question('Enter admin password (min 6 characters): ');
    if (!password || password.length < 6) {
      console.error('❌ Password must be at least 6 characters');
      process.exit(1);
    }

    // Get name (optional)
    const nameInput = await question('Enter admin name (optional, press Enter for "Admin User"): ');
    const name = nameInput.trim() || 'Admin User';

    // Hash password
    console.log('\n⏳ Creating admin user...');
    const passwordHash = await bcrypt.hash(password, 12);

    // Create admin user
    const admin = await prisma.user.create({
      data: {
        email,
        name,
        passwordHash,
        role: UserRole.ADMIN,
        signupMethod: SignupMethod.EMAIL_PASSWORD,
        accountStatus: AccountStatus.ACTIVE,
        isActive: true,
        isVerified: true,
        isEmailVerified: true,
        failedLoginAttempts: 0,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    // Create wallet for admin (optional, but good for consistency)
    try {
      await prisma.wallet.create({
        data: {
          userId: admin.id,
          availableBalance: 0,
          pendingBalance: 0,
          totalEarned: 0,
          totalSpent: 0,
        },
      });
    } catch (error) {
      // Wallet might already exist or creation might fail, that's okay
      console.log('⚠️  Note: Wallet creation skipped (may already exist)');
    }

    console.log('\n✅ Admin user created successfully!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 Admin Credentials:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📧 Email:    ${admin.email}`);
    console.log(`🔑 Password: ${password}`);
    console.log(`👤 Name:     ${admin.name}`);
    console.log(`🆔 User ID:  ${admin.id}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('🌐 Login URL: http://localhost:8080/admin/login\n');
    console.log('⚠️  IMPORTANT: Save these credentials securely!\n');

  } catch (error: any) {
    console.error('\n❌ Error creating admin user:');
    console.error(error.message);
    if (error.code === 'P2002') {
      console.error('\n💡 This email is already in use. Try a different email.');
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    rl.close();
  }
}

// Run the script
createAdmin();

