import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    const email = 'admin@payingzee.com';
    const password = 'Password123!';
    const name = 'PayingZee Admin';

    console.log(`Creating admin user: ${email}`);

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    try {
        const user = await prisma.user.upsert({
            where: { email },
            update: {},
            create: {
                email,
                name,
                passwordHash,
                role: 'ADMIN',
                signupMethod: 'ADMIN_CREATED',
                accountStatus: 'ACTIVE',
                isVerified: true,
                isActive: true,
            },
        });

        console.log('Admin user created successfully:');
        console.log(`ID: ${user.id}`);
        console.log(`Email: ${user.email}`);
        console.log(`Password: ${password}`);
        console.log(`Role: ${user.role}`);
    } catch (error) {
        console.error('Error creating admin user:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
