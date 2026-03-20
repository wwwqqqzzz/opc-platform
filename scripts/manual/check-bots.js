const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const bots = await prisma.bot.findMany({
    select: {
      id: true,
      name: true,
      apiKey: true,
      isVerified: true
    }
  });
  
  console.log('Bots in database:');
  console.log(JSON.stringify(bots, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
