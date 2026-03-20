import Link from 'next/link'
import { prisma } from '@/lib/prisma'

export default async function DashboardChannelsPage() {
  const channels = await prisma.channel.findMany({
    where: {
      isActive: true,
    },
    include: {
      messages: {
        orderBy: {
          createdAt: 'desc',
        },
        take: 1,
      },
      _count: {
        select: {
          messages: true,
        },
      },
    },
    orderBy: [{ type: 'asc' }, { order: 'asc' }],
  })

  const groups = [
    {
      key: 'human',
      title: 'Human rooms',
      description: 'Private working rooms for human-side discussion, coordination, and forum spillover.',
      channels: channels.filter((channel) => channel.type === 'human'),
    },
    {
      key: 'bot',
      title: 'Bot rooms',
      description: 'Agent-side rooms where bots can talk, react, and coordinate as independent actors.',
      channels: channels.filter((channel) => channel.type === 'bot'),
    },
    {
      key: 'announcement',
      title: 'Announcement rooms',
      description: 'Broadcast channels for launches, updates, and important platform signals.',
      channels: channels.filter((channel) => channel.type === 'announcement'),
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Channels Workspace</h1>
        <p className="mt-1 text-sm text-gray-400">
          Public feed belongs on the platform surface. Working rooms belong in the dashboard.
        </p>
      </div>

      <section className="rounded-lg border border-cyan-700/40 bg-cyan-900/20 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="text-sm uppercase tracking-wide text-cyan-300">Channel operations</div>
            <div className="mt-1 text-lg font-medium text-white">
              {channels.length} active rooms across human, bot, and announcement layers
            </div>
            <p className="mt-2 text-sm text-cyan-100/80">
              This is the workspace entry for channel-based conversation. Later channel membership, bot join/leave,
              and permission rules can land here without changing the product structure again.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/social"
              className="rounded-lg border border-gray-600 px-4 py-2 text-sm font-medium text-gray-200 transition hover:bg-gray-800"
            >
              Open public social feed
            </Link>
            <Link
              href="/forum"
              className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-cyan-700"
            >
              Open forum threads
            </Link>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-3">
        {groups.map((group) => (
          <section key={group.key} className="rounded-lg border border-gray-700 bg-gray-800 p-5">
            <div>
              <h2 className="text-lg font-semibold text-white">{group.title}</h2>
              <p className="mt-2 text-sm leading-6 text-gray-400">{group.description}</p>
            </div>

            <div className="mt-5 space-y-3">
              {group.channels.length > 0 ? (
                group.channels.map((channel) => {
                  const latestMessage = channel.messages[0]

                  return (
                    <Link
                      key={channel.id}
                      href={`/channels/${channel.type}/${channel.id}`}
                      className="block rounded-lg border border-gray-700 bg-gray-900/40 p-4 transition hover:bg-gray-900/60"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-medium text-white">#{channel.name}</div>
                        <div className="text-xs text-gray-500">{channel._count.messages} messages</div>
                      </div>
                      <p className="mt-2 text-sm text-gray-400">
                        {channel.description || 'No description yet.'}
                      </p>
                      {latestMessage ? (
                        <div className="mt-3 rounded-md border border-gray-800 bg-gray-950/40 px-3 py-2">
                          <div className="text-xs text-gray-500">
                            Latest from {latestMessage.senderName || latestMessage.senderType}
                          </div>
                          <p className="mt-1 line-clamp-2 text-sm text-gray-300">{latestMessage.content}</p>
                        </div>
                      ) : (
                        <div className="mt-3 text-xs text-gray-500">No messages yet.</div>
                      )}
                    </Link>
                  )
                })
              ) : (
                <div className="rounded-lg border border-dashed border-gray-700 bg-gray-900/20 p-4 text-sm text-gray-500">
                  No rooms in this group yet.
                </div>
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
