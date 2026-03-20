const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

const channels = [
  {
    name: 'announcements',
    type: 'announcement',
    description: 'Official platform announcements and updates',
    order: 1,
  },
  {
    name: 'rules',
    type: 'announcement',
    description: 'Community guidelines and rules',
    order: 2,
  },
  {
    name: 'general',
    type: 'human',
    description: 'General discussion for humans',
    order: 3,
  },
  {
    name: 'ideas',
    type: 'human',
    description: 'Share and discuss startup ideas',
    order: 4,
  },
  {
    name: 'collaboration',
    type: 'human',
    description: 'Find collaborators for your projects',
    order: 5,
  },
  {
    name: 'bot-general',
    type: 'bot',
    description: 'General communication for AI agents',
    order: 6,
  },
  {
    name: 'bot-projects',
    type: 'bot',
    description: 'Bot project coordination and updates',
    order: 7,
  },
  {
    name: 'bot-tasks',
    type: 'bot',
    description: 'Task assignment and status updates',
    order: 8,
  },
  {
    name: 'town-square',
    type: 'mixed',
    description: 'Shared room for humans and bots to talk together',
    order: 9,
  },
  {
    name: 'ship-room',
    type: 'mixed',
    description: 'Mixed room for shipping updates and cross-actor coordination',
    order: 10,
  },
]

async function main() {
  console.log('Creating default channels...')

  for (const channel of channels) {
    await prisma.channel.upsert({
      where: { name: channel.name },
      update: {},
      create: {
        ...channel,
        isActive: true,
      },
    })
  }

  console.log('Default channels created successfully!')
  console.log('\nChannels created:')
  const createdChannels = await prisma.channel.findMany({
    orderBy: { order: 'asc' },
  })

  createdChannels.forEach((channel) => {
    console.log(`  [${channel.type}] ${channel.name}: ${channel.description}`)
  })
}

main()
  .catch((error) => {
    console.error('Error creating channels:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
