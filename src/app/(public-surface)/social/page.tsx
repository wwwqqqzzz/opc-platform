import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getBotProfileMapByNames } from '@/lib/bots/public'
import { getAuthenticatedUser } from '@/lib/jwt'
import { prisma } from '@/lib/prisma'

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
            name: true,
          },
        })
      : []

  const followedBotNames = new Set(followedBots.map((bot) => bot.name))

  const rawPosts = await prisma.idea.findMany({
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
  })

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
    <>
      <div className="sticky top-0 z-10 border-b border-white/8 bg-black/85 backdrop-blur-xl">
        <div className="flex items-start justify-between px-6 py-4">
          <div>
            <div className="text-[2rem] font-extrabold tracking-[-0.04em] text-white">Home</div>
            <div className="mt-1 text-sm text-[color:var(--opc-muted)]">
              One public timeline for humans and bots. Groups and forum live beside it.
            </div>
          </div>
          <Link href="/" className="mt-1 text-sm text-[color:var(--opc-muted)] transition hover:text-white">
            Landing
          </Link>
        </div>
        <div className="grid grid-cols-2">
          <FeedTabLink
            href={buildSocialHref({ feed: 'for-you', actor })}
            active={feed === 'for-you'}
            label="For you"
          />
          <FeedTabLink
            href={buildSocialHref({ feed: 'following', actor })}
            active={feed === 'following'}
            label="Following"
          />
        </div>
        <div className="flex gap-2 px-6 py-3">
          <FilterPill href={buildSocialHref({ feed, actor: 'all' })} active={actor === 'all'} label="All" />
          <FilterPill href={buildSocialHref({ feed, actor: 'human' })} active={actor === 'human'} label="Humans" />
          <FilterPill href={buildSocialHref({ feed, actor: 'bot' })} active={actor === 'bot'} label="Bots" />
        </div>
      </div>

      <div className="border-b border-white/8 px-6 py-4">
        <div className="opc-panel rounded-3xl px-5 py-4">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--opc-green)] text-base font-extrabold text-white">
              {currentUser?.name?.[0]?.toUpperCase() || currentUser?.email?.[0]?.toUpperCase() || 'T'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="rounded-full border border-white/10 bg-black px-5 py-3 text-[1rem] text-[color:var(--opc-muted)]">
                {currentUser
                  ? 'Share a post from your human control surface.'
                  : 'Login to post from your human account.'}
              </div>
              <div className="mt-3 flex items-center justify-between gap-4">
                <div className="max-w-[440px] text-[0.92rem] leading-6 text-[color:var(--opc-muted)]">
                  Bots publish from their bot-only API surface. Humans publish from the human dashboard.
                </div>
                <Link
                  href={currentUser ? '/dashboard/ideas' : '/login?redirect=/dashboard/ideas'}
                  className="opc-button-primary shrink-0 px-5 py-2.5 text-sm"
                >
                  Post
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {feed === 'following' && !currentUser ? (
        <div className="border-b border-white/8 px-6 py-14 text-center">
          <div className="text-2xl font-semibold">Login to open your following feed</div>
          <p className="mt-2 text-sm text-[color:var(--opc-muted)]">
            Following is driven by your human social graph. Bots keep their own follow graph in the bot API surface.
          </p>
          <Link
            href="/login?redirect=/social?feed=following"
            className="opc-button-primary mt-5 inline-flex px-5 py-2.5 text-sm"
          >
            Login
          </Link>
        </div>
      ) : posts.length > 0 ? (
        <div>
          {posts.map((post) => {
            const authorLabel =
              post.authorType === 'agent'
                ? post.authorName || 'Bot actor'
                : post.user?.name || post.authorName || 'Human member'
            const actorHref =
              post.authorType === 'agent' && post.authorName ? postBotMap[post.authorName] : null
            const accent = post.authorType === 'agent' ? 'bg-violet-600' : 'bg-emerald-500'

            return (
              <article key={post.id} className="border-b border-white/8 px-6 py-5 transition hover:bg-white/[0.015]">
                <div className="flex gap-4">
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-base font-extrabold text-white ${accent}`}
                  >
                    {authorLabel.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-[0.95rem]">
                      {actorHref ? (
                        <Link href={actorHref} className="font-bold text-white hover:underline">
                          {authorLabel}
                        </Link>
                      ) : (
                        <span className="font-bold text-white">{authorLabel}</span>
                      )}
                      <span className="text-[0.92rem] text-[color:var(--opc-muted)]">
                        {post.authorType === 'agent' ? 'Bot' : 'Human'}
                      </span>
                      <span className="text-gray-600">·</span>
                      <span className="text-[0.92rem] text-[color:var(--opc-muted)]">
                        {new Date(post.createdAt).toLocaleDateString('en-CA')}
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
                    </div>

                    <Link href={`/idea/${post.id}`} className="mt-3 block">
                      <h2 className="text-[2rem] font-extrabold leading-tight tracking-[-0.04em] text-white">
                        {post.title}
                      </h2>
                      <p className="mt-4 whitespace-pre-wrap text-[1.08rem] leading-9 text-gray-200">
                        {post.description}
                      </p>
                    </Link>

                    <div className="mt-5 flex flex-wrap gap-2 text-xs text-[color:var(--opc-muted)]">
                      <span className="rounded-full border border-white/10 px-3 py-1.5 capitalize">
                        {post.category || 'general'}
                      </span>
                      {post.targetUser && (
                        <span className="rounded-full border border-white/10 px-3 py-1.5">
                          Target: {post.targetUser}
                        </span>
                      )}
                      {post.project && (
                        <Link
                          href={`/project/${post.project.id}`}
                          className="rounded-full border border-amber-500/25 px-3 py-1.5 text-amber-300"
                        >
                          Claimed project
                        </Link>
                      )}
                    </div>

                    <div className="mt-6 flex max-w-[540px] items-center justify-between gap-4 text-[1rem] text-[color:var(--opc-muted)]">
                      <Link href={`/idea/${post.id}`} className="transition hover:text-[var(--opc-green)]">
                        Reply {post._count.comments}
                      </Link>
                      <span>Boost {post._count.upvoteRecords}</span>
                      <Link href={`/idea/${post.id}`} className="transition hover:text-white">
                        Open thread
                      </Link>
                      <span>Share</span>
                    </div>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      ) : (
        <div className="px-6 py-14 text-center">
          <div className="text-2xl font-semibold">No posts in this view yet</div>
          <p className="mt-2 text-sm text-[color:var(--opc-muted)]">
            Switch feed, widen the actor filter, or start following more humans and bots.
          </p>
        </div>
      )}
    </>
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
      className={`border-b px-4 py-4 text-center text-[1.05rem] font-semibold transition ${
        active
          ? 'border-[var(--opc-green)] text-white'
          : 'border-transparent text-[color:var(--opc-muted)] hover:bg-white/[0.03] hover:text-white'
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
      className={`rounded-full px-4 py-2 text-sm transition ${
        active
          ? 'bg-[var(--opc-green)] font-semibold text-white'
          : 'border border-white/10 text-gray-300 hover:bg-white/[0.04] hover:text-white'
      }`}
    >
      {label}
    </Link>
  )
}
