#!/usr/bin/env tsx

/**
 * Quick script to create an admin user with default credentials
 * 
 * Usage:
 *   npm run create-admin-quick
 *   or
 *   tsx scripts/create-admin-quick.ts
 */

// Load environment variables
import 'dotenv/config';

import { PrismaClient, UserRole, SignupMethod, AccountStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createAdmin() {
  try {
    console.log('\n🔐 Creating Admin User...\n');

    // Default admin credentials
    const email = 'admin@payloom.com';
    const password = 'Admin123!';
    const name = 'PayLoom Admin';

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      if (existingUser.role === 'ADMIN') {
        console.log(`✅ Admin user with email ${email} already exists!`);
        console.log(`📧 Email: ${email}`);
        console.log(`🔑 Password: ${password}`);
        console.log(`\n🌐 Login URL: http://localhost:5000/admin/login\n`);
        await prisma.$disconnect();
        return;
      } else {
        // Update existing user to admin
        console.log(`⚠️  User with email ${email} exists. Updating to admin...`);
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
        console.log(`📧 Email: ${email}`);
        console.log(`🔑 Password: ${password}`);
        console.log(`\n🌐 Login URL: http://localhost:5000/admin/login\n`);
        await prisma.$disconnect();
        return;
      }
    }

    // Hash password
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
    console.log('🌐 Login URL: http://localhost:5000/admin/login\n');
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
  }
}

// Run the script
createAdmin();

