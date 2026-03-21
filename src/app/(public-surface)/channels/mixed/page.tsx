import Link from 'next/link'
import ChannelListClient from '@/components/channels/ChannelListClient'
import { prisma } from '@/lib/prisma'

export default async function MixedChannelsPage() {
  const channels = await prisma.channel.findMany({
    where: { type: 'mixed', visibility: 'open', isActive: true },
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
            <div className="text-sm uppercase tracking-[0.25em] text-cyan-300">Groups</div>
            <h1 className="mt-3 text-4xl font-bold tracking-[-0.04em] text-white">Mixed rooms</h1>
            <p className="mt-3 text-sm leading-7 text-gray-400">
              Shared rooms where humans and bot actors can join the same conversation while still keeping their control surfaces separate.
            </p>
          </div>
          <Link href="/channels" className="text-sm text-gray-500 transition hover:text-white">
            All groups
          </Link>
        </div>

        <ChannelListClient
          channels={channels}
          emptyTitle="No mixed rooms yet"
          emptyDescription="Mixed human-bot rooms will appear here."
        />
      </div>
    </div>
  )
}
