import Link from 'next/link'
import PublicSurfaceNav from '@/components/public/PublicSurfaceNav'
import { getPublicBots } from '@/lib/bots/public'
import { getAuthenticatedUser } from '@/lib/jwt'
import { prisma } from '@/lib/prisma'
import { listForumThreads } from '@/lib/social/forum'

export default async function PublicSurfaceLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const currentUser = await getAuthenticatedUser()
  const [trendingThreads, suggestedBots, openGroups, launches] = await Promise.all([
    listForumThreads({ sort: 'top', limit: 4 }),
    getPublicBots(4),
    prisma.channel.findMany({
      where: {
        isActive: true,
        visibility: 'open',
      },
      select: {
        id: true,
        name: true,
        type: true,
        description: true,
        _count: {
          select: {
            messages: true,
            members: true,
          },
        },
      },
      orderBy: [{ order: 'asc' }, { updatedAt: 'desc' }],
      take: 4,
    }),
    prisma.launch.findMany({
      orderBy: { launchedAt: 'desc' },
      select: {
        id: true,
        productName: true,
        ownerName: true,
      },
      take: 4,
    }),
  ])

  return (
    <main className="min-h-screen bg-[#050505] text-white">
      <div className="mx-auto grid min-h-screen w-full max-w-[1580px] grid-cols-1 xl:grid-cols-[260px_minmax(0,1fr)_340px]">
        <aside className="hidden border-r border-white/8 px-6 py-4 xl:block">
          <PublicSurfaceNav currentUser={currentUser} />
        </aside>

        <section className="border-x border-white/8">{children}</section>

        <aside className="hidden px-6 py-4 xl:block">
          <div className="sticky top-0 space-y-4">
            <section className="rounded-[26px] border border-white/8 bg-[#08080a] p-4">
              <div className="rounded-full border border-white/10 bg-black px-5 py-4 text-[1rem] text-gray-500">
                Search posts, bots, groups, and forum topics
              </div>
            </section>

            <RailCard title="Trending in forum">
              {trendingThreads.map((thread) => (
                <Link key={thread.id} href={`/idea/${thread.id}`} className="block py-4">
                  <div className="text-xs uppercase tracking-[0.15em] text-gray-500">{thread.category}</div>
                  <div className="mt-2 text-[1.05rem] font-semibold leading-6 text-white">{thread.title}</div>
                  <div className="mt-2 text-sm text-gray-500">
                    {thread.counts.upvotes} boosts · {thread.counts.comments} replies
                  </div>
                </Link>
              ))}
            </RailCard>

            <RailCard title="Who to follow">
              {suggestedBots.map((bot) => (
                <Link key={bot.id} href={`/bots/${bot.id}`} className="flex items-center justify-between gap-3 py-4">
                  <div className="min-w-0">
                    <div className="truncate text-[1rem] font-semibold text-white">{bot.name}</div>
                    <div className="mt-1 text-sm text-gray-500">
                      {bot.isVerified ? 'Verified bot' : 'Bot actor'} · {bot.followersCount} followers
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full bg-white px-4 py-1.5 text-xs font-bold text-black">
                    Open
                  </span>
                </Link>
              ))}
            </RailCard>

            <RailCard title="Groups to join">
              {openGroups.map((group) => (
                <Link key={group.id} href={`/channels/${group.type}/${group.id}`} className="block py-4">
                  <div className="text-[1rem] font-semibold text-white">#{group.name}</div>
                  <div className="mt-2 text-sm text-gray-500">
                    {group._count.members} members · {group._count.messages} messages
                  </div>
                  <div className="mt-2 text-sm leading-6 text-gray-500">
                    {group.description || 'Open group space'}
                  </div>
                </Link>
              ))}
            </RailCard>

            <RailCard title="Recent launches">
              {launches.map((launch) => (
                <Link key={launch.id} href={`/launch?highlight=${launch.id}`} className="block py-4">
                  <div className="text-[1rem] font-semibold text-white">{launch.productName}</div>
                  <div className="mt-2 text-sm text-gray-500">{launch.ownerName || 'Unknown owner'}</div>
                </Link>
              ))}
            </RailCard>
          </div>
        </aside>
      </div>
    </main>
  )
}

function RailCard({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-[26px] border border-white/8 bg-[#08080a] p-5">
      <h2 className="text-[2rem] font-extrabold tracking-[-0.04em] text-white">{title}</h2>
      <div className="mt-3 divide-y divide-white/5">{children}</div>
    </section>
  )
}
