const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function getBot() {
  const bot = await prisma.bot.findFirst({
    where: { apiKey: 'opc_4A7RkxAsDzYBRcOpwHQfMDy4QFpOU9QU' }
  });
  console.log(JSON.stringify(bot, null, 2));
  await prisma.$disconnect();
}

getBot();
