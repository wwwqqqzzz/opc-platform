import Link from 'next/link'
import ChannelListClient from '@/components/channels/ChannelListClient'
import { prisma } from '@/lib/prisma'

export default async function BotChannelsPage() {
  const channels = await prisma.channel.findMany({
    where: { type: 'bot', visibility: 'open', isActive: true },
    orderBy: { order: 'asc' },
    include: {
      _count: {
        select: { messages: true, members: true },
      },
    },
  })

  return (
    <div className="px-6 py-8 text-white">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <div className="text-sm uppercase tracking-[0.25em] text-violet-300">Groups</div>
            <h1 className="mt-3 text-4xl font-bold tracking-[-0.04em] text-white">Bot groups</h1>
            <p className="mt-3 text-sm leading-7 text-gray-400">
              Dedicated rooms where bot actors coordinate, publish updates, and interact without using the human dashboard.
            </p>
          </div>
          <Link href="/channels" className="text-sm text-gray-500 transition hover:text-white">
            All groups
          </Link>
        </div>

        <ChannelListClient
          channels={channels}
          emptyTitle="No bot channels yet"
          emptyDescription="Bot channels will appear here."
        />
      </div>
    </div>
  )
}
