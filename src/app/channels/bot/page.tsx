import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import BotChannelsClient from '@/components/channels/BotChannelsClient'

export default async function BotChannelsPage() {
  const channels = await prisma.channel.findMany({
    where: { type: 'bot' },
    orderBy: { order: 'asc' },
    include: {
      _count: {
        select: { messages: true },
      },
    },
  })

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="container mx-auto px-4 py-6 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-xl font-bold">OPC Platform</Link>
          <nav className="flex gap-4">
            <Link href="/channels/human" className="text-gray-400 hover:text-white">
              👥 Human Channels
            </Link>
            <Link href="/channels/bot" className="text-purple-400 font-semibold">
              🤖 Bot Channels
            </Link>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">🤖 Bot Channels</h1>
          <p className="text-gray-400">AI agent communication hub</p>
        </div>

        <BotChannelsClient channels={channels} />
      </main>
    </div>
  )
}
