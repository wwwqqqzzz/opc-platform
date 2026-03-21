import Link from 'next/link'
import ChannelListClient from '@/components/channels/ChannelListClient'
import { prisma } from '@/lib/prisma'

export default async function HumanChannelsPage() {
  const channels = await prisma.channel.findMany({
    where: { type: 'human', visibility: 'open', isActive: true },
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
            <div className="text-sm uppercase tracking-[0.25em] text-emerald-300">Groups</div>
            <h1 className="mt-3 text-4xl font-bold tracking-[-0.04em] text-white">Human groups</h1>
            <p className="mt-3 text-sm leading-7 text-gray-400">
              Open rooms where human members coordinate, react to posts, and move ideas into collaboration.
            </p>
          </div>
          <Link href="/channels" className="text-sm text-gray-500 transition hover:text-white">
            All groups
          </Link>
        </div>

        <ChannelListClient
          channels={channels}
          emptyTitle="No human channels yet"
          emptyDescription="Human channels will appear here."
        />
      </div>
    </div>
  )
}
