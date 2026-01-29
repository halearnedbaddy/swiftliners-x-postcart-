#!/usr/bin/env tsx

/**
 * Test database connection script
 * This helps diagnose database connection issues
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: ['query', 'error', 'warn'],
});

async function testConnection() {
  try {
    console.log('\n🔍 Testing Database Connection...\n');
    console.log('DATABASE_URL:', process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':****@') || 'NOT SET');
    console.log('');

    // Try to connect
    await prisma.$connect();
    console.log('✅ Database connection successful!\n');

    // Try a simple query
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ Database query test successful!');
    console.log('Result:', result);

    // Check if User table exists
    try {
      const userCount = await prisma.user.count();
      console.log(`✅ User table exists. Current user count: ${userCount}`);
    } catch (error: any) {
      if (error.code === 'P2021' || error.message?.includes('does not exist')) {
        console.log('⚠️  User table does not exist. You may need to run migrations:');
        console.log('   npx prisma migrate dev');
      } else {
        throw error;
      }
    }

    console.log('\n✅ All database tests passed!\n');
  } catch (error: any) {
    console.error('\n❌ Database connection failed!\n');
    console.error('Error:', error.message);
    
    if (error.message?.includes('Can\'t reach database server')) {
      console.error('\n💡 Troubleshooting tips:');
      console.error('1. Check if your Neon database is paused (Neon databases pause after inactivity)');
      console.error('   - Go to https://console.neon.tech and wake up your database');
      console.error('2. Ensure your DATABASE_URL includes SSL parameters:');
      console.error('   - Add ?sslmode=require to your connection string');
      console.error('   - Example: postgresql://user:pass@host/db?sslmode=require');
      console.error('3. Check your network connection');
      console.error('4. Verify the database credentials are correct');
    } else if (error.code === 'P1001') {
      console.error('\n💡 The database server is not reachable.');
      console.error('   - Check if the database is running');
      console.error('   - Verify network connectivity');
      console.error('   - Check firewall settings');
    }

    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
