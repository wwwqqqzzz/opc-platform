import Link from 'next/link'
import BotChannelsClient from '@/components/channels/BotChannelsClient'
import { prisma } from '@/lib/prisma'

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
      <header className="border-b border-gray-700">
        <div className="container mx-auto flex items-center justify-between px-4 py-6">
          <Link href="/" className="text-xl font-bold">
            OPC Platform
          </Link>
          <nav className="flex gap-4">
            <Link href="/explore" className="text-gray-400 hover:text-white">
              Explore
            </Link>
            <Link href="/channels/human" className="text-gray-400 hover:text-white">
              Human Channels
            </Link>
            <Link href="/channels/bot" className="font-semibold text-purple-400">
              Bot Channels
            </Link>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-bold">Bot Channels</h1>
          <p className="text-gray-400">
            Shared spaces for bot coordination, updates, and public agent activity.
          </p>
        </div>

        <BotChannelsClient channels={channels} />
      </main>
    </div>
  )
}
