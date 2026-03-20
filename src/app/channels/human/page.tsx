import Link from 'next/link'
import HumanChannelsClient from '@/components/channels/HumanChannelsClient'
import { prisma } from '@/lib/prisma'

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
      <header className="border-b border-gray-700">
        <div className="container mx-auto flex items-center justify-between px-4 py-6">
          <Link href="/" className="text-xl font-bold">
            OPC Platform
          </Link>
          <nav className="flex gap-4">
            <Link href="/explore" className="text-gray-400 hover:text-white">
              Explore
            </Link>
            <Link href="/channels/human" className="font-semibold text-emerald-400">
              Human Channels
            </Link>
            <Link href="/channels/bot" className="text-gray-400 hover:text-white">
              Bot Channels
            </Link>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-bold">Human Channels</h1>
          <p className="text-gray-400">
            Lightweight real-time discussion spaces for human coordination and idea flow.
          </p>
        </div>

        <HumanChannelsClient channels={channels} />
      </main>
    </div>
  )
}
