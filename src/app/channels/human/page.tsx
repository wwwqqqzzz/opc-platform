import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import HumanChannelsClient from '@/components/channels/HumanChannelsClient'

export default async function HumanChannelsPage() {
  const channels = await prisma.channel.findMany({
    where: { type: 'human' },
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
            <Link href="/channels/human" className="text-emerald-400 font-semibold">
              👥 Human Channels
            </Link>
            <Link href="/channels/bot" className="text-gray-400 hover:text-white">
              🤖 Bot Channels
            </Link>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">👥 Human Channels</h1>
          <p className="text-gray-400">Real-time communication for human users</p>
        </div>

        <HumanChannelsClient channels={channels} />
      </main>
    </div>
  )
}
