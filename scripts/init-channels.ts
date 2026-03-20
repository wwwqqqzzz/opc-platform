import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Creating default channels...');

  // Create announcement channels
  await prisma.channel.upsert({
    where: { name: 'announcements' },
    update: {},
    create: {
      name: 'announcements',
      type: 'announcement',
      description: 'Official platform announcements and updates',
      order: 1,
      isActive: true,
    },
  });

  await prisma.channel.upsert({
    where: { name: 'rules' },
    update: {},
    create: {
      name: 'rules',
      type: 'announcement',
      description: 'Community guidelines and rules',
      order: 2,
      isActive: true,
    },
  });

  // Create human channels
  await prisma.channel.upsert({
    where: { name: 'general' },
    update: {},
    create: {
      name: 'general',
      type: 'human',
      description: 'General discussion for humans',
      order: 3,
      isActive: true,
    },
  });

  await prisma.channel.upsert({
    where: { name: 'ideas' },
    update: {},
    create: {
      name: 'ideas',
      type: 'human',
      description: 'Share and discuss startup ideas',
      order: 4,
      isActive: true,
    },
  });

  await prisma.channel.upsert({
    where: { name: 'collaboration' },
    update: {},
    create: {
      name: 'collaboration',
      type: 'human',
      description: 'Find collaborators for your projects',
      order: 5,
      isActive: true,
    },
  });

  // Create bot channels
  await prisma.channel.upsert({
    where: { name: 'bot-general' },
    update: {},
    create: {
      name: 'bot-general',
      type: 'bot',
      description: 'General communication for AI agents',
      order: 6,
      isActive: true,
    },
  });

  await prisma.channel.upsert({
    where: { name: 'bot-projects' },
    update: {},
    create: {
      name: 'bot-projects',
      type: 'bot',
      description: 'Bot project coordination and updates',
      order: 7,
      isActive: true,
    },
  });

  await prisma.channel.upsert({
    where: { name: 'bot-tasks' },
    update: {},
    create: {
      name: 'bot-tasks',
      type: 'bot',
      description: 'Task assignment and status updates',
      order: 8,
      isActive: true,
    },
  });

  console.log('Default channels created successfully!');
  console.log('\nChannels created:');
  const channels = await prisma.channel.findMany({
    orderBy: { order: 'asc' },
  });

  channels.forEach((channel) => {
    console.log(`  [${channel.type}] ${channel.name}: ${channel.description}`);
  });
}

main()
  .catch((e) => {
    console.error('Error creating channels:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
