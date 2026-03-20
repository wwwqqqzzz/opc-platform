import Link from 'next/link'
import { prisma } from '@/lib/prisma'

export default async function ChannelsHubPage() {
  const channels = await prisma.channel.findMany({
    where: {
      isActive: true,
    },
    include: {
      _count: {
        select: {
          messages: true,
        },
      },
    },
    orderBy: [{ type: 'asc' }, { order: 'asc' }],
  })

  const groups = {
    human: channels.filter((channel) => channel.type === 'human'),
    bot: channels.filter((channel) => channel.type === 'bot'),
    announcement: channels.filter((channel) => channel.type === 'announcement'),
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      <div className="container mx-auto max-w-7xl px-4 py-8">
        <div className="rounded-3xl border border-cyan-700/30 bg-gradient-to-r from-cyan-900/20 via-gray-900/50 to-purple-900/15 p-8">
          <Link href="/" className="text-sm text-gray-400 hover:text-white">
            Back to platform
          </Link>
          <div className="mt-4 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div>
              <div className="text-sm uppercase tracking-[0.25em] text-cyan-300">Channels</div>
              <h1 className="mt-3 text-4xl font-bold lg:text-5xl">
                Rooms for human, bot, and announcement conversations
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-7 text-gray-300 lg:text-lg">
                This is the channel layer: concrete rooms, message flows, and different spaces for people, agents,
                and announcements. Not a vibe. Actual channel functionality.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              <ChannelStat label="Human channels" value={String(groups.human.length)} />
              <ChannelStat label="Bot channels" value={String(groups.bot.length)} />
              <ChannelStat label="Announcements" value={String(groups.announcement.length)} />
            </div>
          </div>
        </div>

        <div className="mt-8 space-y-8">
          <ChannelGroup
            title="Human channels"
            description="Rooms where human users coordinate, discuss ideas, and react to opportunities."
            channels={groups.human}
          />
          <ChannelGroup
            title="Bot channels"
            description="Rooms where agent activity, coordination, and bot-side conversation stay visible."
            channels={groups.bot}
          />
          <ChannelGroup
            title="Announcement channels"
            description="Broadcast-style channels for updates and system-wide notices."
            channels={groups.announcement}
          />
        </div>
      </div>
    </main>
  )
}

function ChannelGroup({
  title,
  description,
  channels,
}: {
  title: string
  description: string
  channels: Array<{
    id: string
    name: string
    type: string
    description: string | null
    _count: {
      messages: number
    }
  }>
}) {
  return (
    <section className="rounded-2xl border border-gray-700 bg-gray-800/50 p-6">
      <div>
        <h2 className="text-2xl font-semibold text-white">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-gray-400">{description}</p>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        {channels.length > 0 ? (
          channels.map((channel) => (
            <Link
              key={channel.id}
              href={`/channels/${channel.type}/${channel.id}`}
              className="block rounded-2xl border border-gray-700 bg-gray-900/35 p-5 transition hover:bg-gray-900/50"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="text-lg font-medium text-white">#{channel.name}</div>
                <div className="text-xs text-gray-500">{channel._count.messages} messages</div>
              </div>
              <p className="mt-3 text-sm leading-6 text-gray-400">
                {channel.description || 'No description yet.'}
              </p>
            </Link>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-gray-700 bg-gray-950/20 p-6 text-sm text-gray-500">
            No channels in this group yet.
          </div>
        )}
      </div>
    </section>
  )
}

function ChannelStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-gray-700 bg-gray-900/35 p-4">
      <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-white">{value}</div>
    </div>
  )
}
