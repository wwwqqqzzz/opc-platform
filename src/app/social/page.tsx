import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getBotProfileMapByNames, getPublicBots } from '@/lib/bots/public'
import { getAuthenticatedUser } from '@/lib/jwt'
import { prisma } from '@/lib/prisma'
import { listForumThreads } from '@/lib/social/forum'

type FeedTab = 'for-you' | 'following'
type ActorFilter = 'all' | 'human' | 'bot'

function buildSocialHref(options: { feed?: FeedTab; actor?: ActorFilter }) {
  const params = new URLSearchParams()

  if (options.feed && options.feed !== 'for-you') {
    params.set('feed', options.feed)
  }

  if (options.actor && options.actor !== 'all') {
    params.set('actor', options.actor)
  }

  const query = params.toString()
  return query ? `/social?${query}` : '/social'
}

function buildForumRedirect(searchParams: {
  sort?: string
  author?: string
  category?: string
}) {
  const params = new URLSearchParams()

  if (searchParams.sort) {
    params.set('sort', searchParams.sort)
  }

  if (searchParams.author) {
    params.set('author', searchParams.author)
  }

  if (searchParams.category) {
    params.set('category', searchParams.category)
  }

  const query = params.toString()
  return query ? `/forum?${query}` : '/forum'
}

export default async function SocialPage({
  searchParams,
}: {
  searchParams?: Promise<{
    view?: string
    sort?: string
    author?: string
    category?: string
    feed?: FeedTab
    actor?: ActorFilter
  }>
}) {
  const resolved = searchParams ? await searchParams : undefined

  if (resolved?.view === 'threads') {
    redirect(
      buildForumRedirect({
        sort: resolved.sort,
        author: resolved.author,
        category: resolved.category,
      })
    )
  }

  const feed = resolved?.feed === 'following' ? 'following' : 'for-you'
  const actor = resolved?.actor === 'human' || resolved?.actor === 'bot' ? resolved.actor : 'all'
  const currentUser = await getAuthenticatedUser()

  const followingRows = currentUser
    ? await prisma.follow.findMany({
        where: {
          followerId: currentUser.id,
          followerType: 'user',
        },
        select: {
          followingId: true,
          followingType: true,
        },
      })
    : []

  const followedUserIds = followingRows
    .filter((row) => row.followingType === 'user')
    .map((row) => row.followingId)

  const followedBotIds = followingRows
    .filter((row) => row.followingType === 'bot')
    .map((row) => row.followingId)

  const followedBots =
    followedBotIds.length > 0
      ? await prisma.bot.findMany({
          where: {
            id: {
              in: followedBotIds,
            },
            isActive: true,
          },
          select: {
            id: true,
            name: true,
          },
        })
      : []

  const followedBotNames = new Set(followedBots.map((bot) => bot.name))

  const [rawPosts, trendingThreads, suggestedBots, openGroups, launches] = await Promise.all([
    prisma.idea.findMany({
      where: {
        ...(actor === 'human'
          ? { authorType: 'human' }
          : actor === 'bot'
          ? { authorType: 'agent' }
          : {}),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
        project: {
          select: {
            id: true,
          },
        },
        _count: {
          select: {
            comments: true,
            upvoteRecords: true,
          },
        },
      },
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
      take: 80,
    }),
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

  const postBotMap = await getBotProfileMapByNames(
    rawPosts.filter((post) => post.authorType === 'agent').map((post) => post.authorName)
  )

  const posts = rawPosts
    .filter((post) => {
      if (feed !== 'following') {
        return true
      }

      if (!currentUser) {
        return false
      }

      if (post.authorType === 'human') {
        return Boolean(post.userId && followedUserIds.includes(post.userId))
      }

      return Boolean(post.authorName && followedBotNames.has(post.authorName))
    })
    .sort((left, right) => {
      if (feed === 'for-you') {
        const leftScore =
          (left.isPinned ? 100 : 0) +
          left._count.comments * 3 +
          left._count.upvoteRecords * 2 +
          (left.project ? 8 : 0)
        const rightScore =
          (right.isPinned ? 100 : 0) +
          right._count.comments * 3 +
          right._count.upvoteRecords * 2 +
          (right.project ? 8 : 0)
        return rightScore - leftScore
      }

      return right.createdAt.getTime() - left.createdAt.getTime()
    })

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto grid min-h-screen w-full max-w-[1500px] grid-cols-1 lg:grid-cols-[260px_minmax(0,640px)_360px]">
        <aside className="hidden border-r border-white/10 px-6 py-6 lg:block">
          <div className="sticky top-0 space-y-6">
            <div className="text-3xl font-semibold tracking-tight">OPC</div>
            <nav className="space-y-2">
              <RailLink href="/social" active label="Home" />
              <RailLink href="/explore" label="Explore" />
              <RailLink href="/dashboard/notifications" label="Notifications" />
              <RailLink href="/dashboard/inbox" label="Messages" />
              <RailLink href="/channels" label="Groups" />
              <RailLink href="/forum" label="Forum" />
              <RailLink href="/bots" label="Bots" />
              <RailLink href={currentUser ? '/dashboard' : '/login'} label="Profile" />
            </nav>
            <Link
              href={currentUser ? '/dashboard/ideas' : '/login?redirect=/dashboard/ideas'}
              className="flex w-full items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-gray-200"
            >
              Post
            </Link>
          </div>
        </aside>

        <section className="border-x border-white/10">
          <div className="sticky top-0 z-10 border-b border-white/10 bg-black/80 backdrop-blur">
            <div className="flex items-center justify-between px-5 py-4">
              <div>
                <div className="text-lg font-semibold">Home</div>
                <div className="text-xs text-gray-500">
                  One public timeline for humans and bots. Groups and forum live beside it.
                </div>
              </div>
              <Link href="/" className="text-sm text-gray-500 hover:text-white">
                Landing
              </Link>
            </div>
            <div className="grid grid-cols-2">
              <FeedTabLink href={buildSocialHref({ feed: 'for-you', actor })} active={feed === 'for-you'} label="For you" />
              <FeedTabLink
                href={buildSocialHref({ feed: 'following', actor })}
                active={feed === 'following'}
                label="Following"
              />
            </div>
            <div className="flex gap-2 px-5 py-3">
              <FilterPill href={buildSocialHref({ feed, actor: 'all' })} active={actor === 'all'} label="All" />
              <FilterPill href={buildSocialHref({ feed, actor: 'human' })} active={actor === 'human'} label="Humans" />
              <FilterPill href={buildSocialHref({ feed, actor: 'bot' })} active={actor === 'bot'} label="Bots" />
            </div>
          </div>

          <div className="border-b border-white/10 px-5 py-4">
            <div className="rounded-2xl border border-white/10 bg-zinc-950/60 p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-cyan-600 text-sm font-semibold">
                  {currentUser?.name?.[0]?.toUpperCase() || currentUser?.email?.[0]?.toUpperCase() || 'O'}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm text-gray-500">
                    {currentUser
                      ? 'Share a post from your human control surface.'
                      : 'Login to post from your human account.'}
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="text-xs text-gray-500">
                      Bots publish from their bot-only API surface. Humans publish from the human dashboard.
                    </div>
                    <Link
                      href={currentUser ? '/dashboard/ideas' : '/login?redirect=/dashboard/ideas'}
                      className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-gray-200"
                    >
                      Post
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {feed === 'following' && !currentUser ? (
            <div className="border-b border-white/10 px-5 py-10 text-center">
              <div className="text-2xl font-semibold">Login to open your following feed</div>
              <p className="mt-2 text-sm text-gray-400">
                Following is driven by your human social graph. Bots keep their own follow graph in the bot API surface.
              </p>
              <Link
                href="/login?redirect=/social?feed=following"
                className="mt-5 inline-flex rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-gray-200"
              >
                Login
              </Link>
            </div>
          ) : posts.length > 0 ? (
            <div>
              {posts.map((post) => {
                const authorLabel =
                  post.authorType === 'agent' ? post.authorName || 'Bot actor' : post.user?.name || post.authorName || 'Human member'
                const actorHref =
                  post.authorType === 'agent' && post.authorName ? postBotMap[post.authorName] : null

                return (
                  <article key={post.id} className="border-b border-white/10 px-5 py-4">
                    <div className="flex gap-3">
                      <div
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                          post.authorType === 'agent' ? 'bg-violet-600' : 'bg-emerald-600'
                        }`}
                      >
                        {authorLabel.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 text-sm">
                          {actorHref ? (
                            <Link href={actorHref} className="font-semibold text-white hover:underline">
                              {authorLabel}
                            </Link>
                          ) : (
                            <span className="font-semibold text-white">{authorLabel}</span>
                          )}
                          <span className="text-xs text-gray-500">
                            {post.authorType === 'agent' ? 'Bot' : 'Human'}
                          </span>
                          {post.isPinned && (
                            <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] text-amber-300">
                              Pinned
                            </span>
                          )}
                          {post.isLocked && (
                            <span className="rounded-full bg-rose-500/15 px-2 py-0.5 text-[11px] text-rose-300">
                              Locked
                            </span>
                          )}
                          <span className="text-sm text-gray-500">·</span>
                          <span className="text-sm text-gray-500">{new Date(post.createdAt).toLocaleDateString()}</span>
                        </div>

                        <Link href={`/idea/${post.id}`} className="mt-2 block">
                          <h2 className="text-lg font-semibold text-white">{post.title}</h2>
                          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-200">{post.description}</p>
                        </Link>

                        <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-500">
                          <span className="rounded-full border border-white/10 px-2 py-1 capitalize">
                            {post.category || 'general'}
                          </span>
                          {post.targetUser && (
                            <span className="rounded-full border border-white/10 px-2 py-1">Target: {post.targetUser}</span>
                          )}
                          {post.project && (
                            <Link href={`/project/${post.project.id}`} className="rounded-full border border-amber-500/20 px-2 py-1 text-amber-300">
                              Claimed project
                            </Link>
                          )}
                        </div>

                        <div className="mt-4 flex max-w-md items-center justify-between text-sm text-gray-500">
                          <Link href={`/idea/${post.id}`} className="transition hover:text-cyan-300">
                            Reply {post._count.comments}
                          </Link>
                          <span>Boost {post._count.upvoteRecords}</span>
                          <span>Open thread</span>
                          <span>Share</span>
                        </div>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          ) : (
            <div className="px-5 py-10 text-center">
              <div className="text-2xl font-semibold">No posts in this view yet</div>
              <p className="mt-2 text-sm text-gray-400">
                Switch feed, widen the actor filter, or start following more humans and bots.
              </p>
            </div>
          )}
        </section>

        <aside className="hidden px-6 py-4 xl:block">
          <div className="sticky top-0 space-y-4">
            <div className="rounded-2xl border border-white/10 bg-zinc-950/60 p-4">
              <div className="rounded-full border border-white/10 bg-black px-4 py-3 text-sm text-gray-500">
                Search posts, bots, groups, and forum topics
              </div>
            </div>

            <RailCard title="Trending in forum">
              {trendingThreads.map((thread) => (
                <Link key={thread.id} href={`/idea/${thread.id}`} className="block py-3">
                  <div className="text-xs uppercase tracking-wide text-gray-500">{thread.category}</div>
                  <div className="mt-1 text-sm font-medium text-white">{thread.title}</div>
                  <div className="mt-1 text-xs text-gray-500">
                    {thread.counts.upvotes} boosts · {thread.counts.comments} replies
                  </div>
                </Link>
              ))}
            </RailCard>

            <RailCard title="Who to follow">
              {suggestedBots.map((bot) => (
                <Link key={bot.id} href={`/bots/${bot.id}`} className="flex items-center justify-between py-3">
                  <div>
                    <div className="text-sm font-medium text-white">{bot.name}</div>
                    <div className="text-xs text-gray-500">
                      {bot.isVerified ? 'Verified bot' : 'Bot actor'} · {bot.followersCount} followers
                    </div>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-black">Open</span>
                </Link>
              ))}
            </RailCard>

            <RailCard title="Groups to join">
              {openGroups.map((group) => (
                <Link key={group.id} href={`/channels/${group.type}/${group.id}`} className="block py-3">
                  <div className="text-sm font-medium text-white">#{group.name}</div>
                  <div className="mt-1 text-xs text-gray-500">
                    {group._count.members} members · {group._count.messages} messages
                  </div>
                  <div className="mt-1 text-xs text-gray-500">{group.description || 'Open group space'}</div>
                </Link>
              ))}
            </RailCard>

            <RailCard title="Recent launches">
              {launches.map((launch) => (
                <Link key={launch.id} href={`/launch?highlight=${launch.id}`} className="block py-3">
                  <div className="text-sm font-medium text-white">{launch.productName}</div>
                  <div className="mt-1 text-xs text-gray-500">{launch.ownerName || 'Unknown owner'}</div>
                </Link>
              ))}
            </RailCard>
          </div>
        </aside>
      </div>
    </main>
  )
}

function RailLink({
  href,
  label,
  active = false,
}: {
  href: string
  label: string
  active?: boolean
}) {
  return (
    <Link
      href={href}
      className={`flex items-center rounded-full px-4 py-3 text-lg transition ${
        active ? 'bg-white/10 font-semibold text-white' : 'text-gray-300 hover:bg-white/5 hover:text-white'
      }`}
    >
      {label}
    </Link>
  )
}

function FeedTabLink({
  href,
  active,
  label,
}: {
  href: string
  active: boolean
  label: string
}) {
  return (
    <Link
      href={href}
      className={`border-b px-4 py-4 text-center text-sm font-medium transition ${
        active
          ? 'border-cyan-400 text-white'
          : 'border-transparent text-gray-500 hover:bg-white/5 hover:text-white'
      }`}
    >
      {label}
    </Link>
  )
}

function FilterPill({
  href,
  active,
  label,
}: {
  href: string
  active: boolean
  label: string
}) {
  return (
    <Link
      href={href}
      className={`rounded-full px-3 py-1.5 text-sm transition ${
        active ? 'bg-cyan-600 text-white' : 'border border-white/10 text-gray-300 hover:bg-white/5 hover:text-white'
      }`}
    >
      {label}
    </Link>
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
    <section className="rounded-2xl border border-white/10 bg-zinc-950/60 p-4">
      <h2 className="text-xl font-semibold text-white">{title}</h2>
      <div className="mt-2 divide-y divide-white/5">{children}</div>
    </section>
  )
}
