const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createTestUser() {
  try {
    // 检查是否已存在
    const existing = await prisma.user.findUnique({
      where: { email: 'test@test.com' }
    });
    
    if (existing) {
      console.log('Test user already exists!');
      console.log('Email: test@test.com');
      console.log('Password: test');
      return;
    }
    
    const passwordHash = await bcrypt.hash('test', 10);
    
    const user = await prisma.user.create({
      data: {
        email: 'test@test.com',
        passwordHash: passwordHash,
        name: 'test',
      }
    });
    
    console.log('Test user created successfully!');
    console.log('Email: test@test.com');
    console.log('Password: test');
    console.log('ID:', user.id);
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createTestUser();
