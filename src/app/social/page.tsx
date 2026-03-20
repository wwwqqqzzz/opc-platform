import Link from 'next/link'
import { prisma } from '@/lib/prisma'

type FeedItem =
  | {
      id: string
      type: 'idea'
      title: string
      body: string
      actor: string
      href: string
      createdAt: Date
    }
  | {
      id: string
      type: 'message'
      title: string
      body: string
      actor: string
      href: string
      createdAt: Date
    }
  | {
      id: string
      type: 'launch'
      title: string
      body: string
      actor: string
      href: string
      createdAt: Date
    }

export default async function SocialPage() {
  const [ideas, messages, launches] = await Promise.all([
    prisma.idea.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        title: true,
        description: true,
        authorName: true,
        createdAt: true,
      },
    }),
    prisma.message.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        channel: {
          select: {
            id: true,
            type: true,
            name: true,
          },
        },
      },
    }),
    prisma.launch.findMany({
      orderBy: { launchedAt: 'desc' },
      take: 20,
      select: {
        id: true,
        productName: true,
        tagline: true,
        ownerName: true,
        launchedAt: true,
      },
    }),
  ])

  const feed: FeedItem[] = [
    ...ideas.map((idea) => ({
      id: `idea-${idea.id}`,
      type: 'idea' as const,
      title: idea.title,
      body: idea.description,
      actor: idea.authorName || 'Unknown author',
      href: `/idea/${idea.id}`,
      createdAt: idea.createdAt,
    })),
    ...messages.map((message) => ({
      id: `message-${message.id}`,
      type: 'message' as const,
      title: `#${message.channel.name}`,
      body: message.content,
      actor: message.senderName || 'Unknown sender',
      href: `/channels/${message.channel.type}/${message.channel.id}`,
      createdAt: message.createdAt,
    })),
    ...launches.map((launch) => ({
      id: `launch-${launch.id}`,
      type: 'launch' as const,
      title: launch.productName,
      body: launch.tagline || 'A new product was launched.',
      actor: launch.ownerName || 'Unknown owner',
      href: `/launch?highlight=${launch.id}`,
      createdAt: launch.launchedAt,
    })),
  ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      <div className="container mx-auto max-w-5xl px-4 py-8">
        <div className="rounded-3xl border border-cyan-700/30 bg-gradient-to-r from-cyan-900/20 via-gray-900/50 to-emerald-900/15 p-8">
          <Link href="/" className="text-sm text-gray-400 hover:text-white">
            Back to platform
          </Link>
          <div className="mt-4">
            <div className="text-sm uppercase tracking-[0.25em] text-cyan-300">Social Feed</div>
            <h1 className="mt-3 text-4xl font-bold lg:text-5xl">
              One timeline across ideas, channels, and launches
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-gray-300 lg:text-lg">
              This is the concrete social layer: one feed that mixes idea posts, room activity, and launch outcomes
              instead of forcing users to hunt through separate pages.
            </p>
          </div>
        </div>

        <div className="mt-8 space-y-4">
          {feed.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className="block rounded-2xl border border-gray-700 bg-gray-800/50 p-5 transition hover:bg-gray-800/70"
            >
              <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                <span
                  className={`rounded-full border px-2 py-1 uppercase tracking-wide ${
                    item.type === 'idea'
                      ? 'border-emerald-700 bg-emerald-900/20 text-emerald-200'
                      : item.type === 'message'
                      ? 'border-cyan-700 bg-cyan-900/20 text-cyan-200'
                      : 'border-purple-700 bg-purple-900/20 text-purple-200'
                  }`}
                >
                  {item.type}
                </span>
                <span>{item.actor}</span>
                <span>{item.createdAt.toLocaleString()}</span>
              </div>
              <div className="mt-3 text-xl font-semibold text-white">{item.title}</div>
              <p className="mt-2 line-clamp-3 text-sm leading-6 text-gray-400">{item.body}</p>
            </Link>
          ))}
        </div>
      </div>
    </main>
  )
}
