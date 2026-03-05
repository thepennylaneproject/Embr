const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://embr:embr_dev_password@localhost:5433/embr?schema=public'
    }
  }
});

async function main() {
  console.log('🌱 Seeding database...');

  const passwordHash = await bcrypt.hash('test1234', 10);

  // Create test users
  const creator = await prisma.user.upsert({
    where: { email: 'creator@embr.app' },
    update: {},
    create: {
      email: 'creator@embr.app',
      username: 'creator',
      fullName: 'Test Creator',
      role: 'CREATOR',
      isVerified: true,
      passwordHash: passwordHash,
      unreadNotificationCount: 0
    }
  });
  console.log('✓ Created creator user:', creator.email);

  const user = await prisma.user.upsert({
    where: { email: 'user@embr.app' },
    update: {},
    create: {
      email: 'user@embr.app',
      username: 'user',
      fullName: 'Test User',
      role: 'USER',
      isVerified: true,
      passwordHash: passwordHash,
      unreadNotificationCount: 0
    }
  });
  console.log('✓ Created regular user:', user.email);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@embr.app' },
    update: {},
    create: {
      email: 'admin@embr.app',
      username: 'admin',
      fullName: 'Test Admin',
      role: 'ADMIN',
      isVerified: true,
      passwordHash: passwordHash,
      unreadNotificationCount: 0
    }
  });
  console.log('✓ Created admin user:', admin.email);

  // Create a test group
  const group = await prisma.group.upsert({
    where: { id: 'test-group-1' },
    update: {},
    create: {
      id: 'test-group-1',
      name: 'Community Test Group',
      slug: 'community-test-group',
      description: 'A test group for smoke testing',
      type: 'PUBLIC',
      createdById: creator.id,
      category: 'general'
    }
  });
  console.log('✓ Created test group:', group.name);

  console.log('\n✅ Seeding complete!');
  console.log('\nTest accounts:');
  console.log('  Email: creator@embr.app | Password: test1234 | Role: CREATOR');
  console.log('  Email: user@embr.app    | Password: test1234 | Role: USER');
  console.log('  Email: admin@embr.app   | Password: test1234 | Role: ADMIN');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
