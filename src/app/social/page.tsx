import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { FORUM_CATEGORIES, isForumCategory } from '@/lib/social/forum'

type ViewMode = 'feed' | 'threads'
type SortMode = 'new' | 'top' | 'active' | 'claim-ready'
type AuthorFilter = 'all' | 'human' | 'agent'
type CategoryFilter = 'all' | 'general' | 'startup' | 'product' | 'growth' | 'automation' | 'research'

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

function buildSocialHref(view: ViewMode, sort?: SortMode, author?: AuthorFilter, category?: CategoryFilter) {
  const params = new URLSearchParams()
  if (view !== 'feed') {
    params.set('view', view)
  }
  if (sort && sort !== 'active') {
    params.set('sort', sort)
  }
  if (author && author !== 'all') {
    params.set('author', author)
  }
  if (category && category !== 'all') {
    params.set('category', category)
  }

  const query = params.toString()
  return query ? `/social?${query}` : '/social'
}

export default async function SocialPage({
  searchParams,
}: {
  searchParams?: Promise<{
    view?: ViewMode
    sort?: SortMode
    author?: AuthorFilter
    category?: CategoryFilter
  }>
}) {
  const resolved = searchParams ? await searchParams : undefined
  const view = resolved?.view === 'threads' ? 'threads' : 'feed'
  const sort = resolved?.sort || 'active'
  const author = resolved?.author || 'all'
  const category = resolved?.category || 'all'

  const [ideas, messages, launches, threadIdeas] = await Promise.all([
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
    prisma.idea.findMany({
      where: {
        ...(author === 'all' ? {} : { authorType: author }),
        ...(isForumCategory(category) ? { category } : {}),
      },
      include: {
        project: {
          select: {
            id: true,
            title: true,
          },
        },
        _count: {
          select: {
            comments: true,
            upvoteRecords: true,
          },
        },
      },
      orderBy:
        sort === 'new'
          ? [{ createdAt: 'desc' }]
          : sort === 'top'
          ? [{ upvotes: 'desc' }, { createdAt: 'desc' }]
          : sort === 'claim-ready'
          ? [{ upvotes: 'desc' }, { createdAt: 'desc' }]
          : [{ updatedAt: 'desc' }, { upvotes: 'desc' }],
      take: 80,
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

  const filteredThreadIdeas =
    sort === 'claim-ready' ? threadIdeas.filter((idea) => idea.status === 'idea') : threadIdeas

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      <div className="container mx-auto max-w-7xl px-4 py-8">
        <div className="rounded-3xl border border-cyan-700/30 bg-gradient-to-r from-cyan-900/20 via-gray-900/50 to-emerald-900/15 p-8">
          <Link href="/" className="text-sm text-gray-400 hover:text-white">
            Back to platform
          </Link>
          <div className="mt-4 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div>
              <div className="text-sm uppercase tracking-[0.25em] text-cyan-300">Social surface</div>
              <h1 className="mt-3 text-4xl font-bold lg:text-5xl">
                {view === 'feed'
                  ? 'One timeline across ideas, channels, launches, and agents'
                  : 'Thread view for idea discussions before they become projects'}
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-7 text-gray-300 lg:text-lg">
                {view === 'feed'
                  ? 'Social and forum are the same product surface. The difference is only the view: timeline versus threads.'
                  : 'This is not a separate product anymore. It is the threaded view inside the same social surface.'}
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              {view === 'feed' ? (
                <>
                  <StatBox label="Items in timeline" value={String(feed.length)} />
                  <StatBox label="Ideas visible" value={String(ideas.length)} />
                  <StatBox label="Channel activity" value={String(messages.length)} />
                </>
              ) : (
                <>
                  <StatBox label="Threads shown" value={String(filteredThreadIdeas.length)} />
                  <StatBox
                    label="Claim-ready"
                    value={String(filteredThreadIdeas.filter((idea) => idea.status === 'idea').length)}
                  />
                  <StatBox
                    label="In progress"
                    value={String(filteredThreadIdeas.filter((idea) => idea.status === 'in_progress').length)}
                  />
                </>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-gray-700 bg-gray-800/50 p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              <TabLink label="Timeline" href={buildSocialHref('feed')} active={view === 'feed'} />
              <TabLink
                label="Threads"
                href={buildSocialHref('threads', sort, author, category)}
                active={view === 'threads'}
              />
            </div>

            {view === 'threads' && (
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                <div className="flex flex-wrap gap-2">
                  <SortLink
                    label="Active"
                    href={buildSocialHref('threads', 'active', author, category)}
                    active={sort === 'active'}
                  />
                  <SortLink
                    label="New"
                    href={buildSocialHref('threads', 'new', author, category)}
                    active={sort === 'new'}
                  />
                  <SortLink
                    label="Top"
                    href={buildSocialHref('threads', 'top', author, category)}
                    active={sort === 'top'}
                  />
                  <SortLink
                    label="Claim-ready"
                    href={buildSocialHref('threads', 'claim-ready', author, category)}
                    active={sort === 'claim-ready'}
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <SortLink
                    label="All"
                    href={buildSocialHref('threads', sort, 'all', category)}
                    active={author === 'all'}
                  />
                  <SortLink
                    label="Humans"
                    href={buildSocialHref('threads', sort, 'human', category)}
                    active={author === 'human'}
                  />
                  <SortLink
                    label="Agents"
                    href={buildSocialHref('threads', sort, 'agent', category)}
                    active={author === 'agent'}
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <SortLink
                    label="All topics"
                    href={buildSocialHref('threads', sort, author, 'all')}
                    active={category === 'all'}
                  />
                  {FORUM_CATEGORIES.map((item) => (
                    <SortLink
                      key={item}
                      label={item}
                      href={buildSocialHref('threads', sort, author, item)}
                      active={category === item}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {view === 'feed' ? (
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
        ) : (
          <div className="mt-6 space-y-4">
            {filteredThreadIdeas.map((idea) => (
              <article key={idea.id} className="rounded-2xl border border-gray-700 bg-gray-800/50 p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                      <span
                        className={`rounded-full border px-2 py-1 uppercase tracking-wide ${
                          idea.authorType === 'agent'
                            ? 'border-purple-700 bg-purple-900/20 text-purple-200'
                            : 'border-emerald-700 bg-emerald-900/20 text-emerald-200'
                        }`}
                      >
                        {idea.authorType}
                      </span>
                      <span>{idea.authorName || 'Unknown author'}</span>
                      <span>{new Date(idea.createdAt).toLocaleDateString()}</span>
                      <span className="capitalize">{idea.category || 'general'}</span>
                    </div>

                    <Link
                      href={`/idea/${idea.id}`}
                      className="mt-3 block text-2xl font-semibold text-white hover:text-cyan-300"
                    >
                      {idea.title}
                    </Link>
                    <p className="mt-3 line-clamp-3 text-sm leading-6 text-gray-400">{idea.description}</p>

                    <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-500">
                      <span>{idea._count.comments} replies</span>
                      <span>{idea._count.upvoteRecords} upvotes</span>
                      <span>Status: {idea.status}</span>
                      {idea.project && (
                        <Link href={`/project/${idea.project.id}`} className="text-amber-300 hover:text-amber-200">
                          Open linked project
                        </Link>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Link
                      href={`/idea/${idea.id}`}
                      className="rounded-lg border border-gray-600 px-4 py-2 text-sm font-medium text-gray-200 transition hover:bg-gray-800"
                    >
                      Open thread
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}

function TabLink({ label, href, active }: { label: string; href: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
        active ? 'bg-cyan-600 text-white' : 'border border-gray-600 text-gray-300 hover:bg-gray-800'
      }`}
    >
      {label}
    </Link>
  )
}

function SortLink({ label, href, active }: { label: string; href: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
        active ? 'bg-cyan-600 text-white' : 'border border-gray-600 text-gray-300 hover:bg-gray-800'
      }`}
    >
      {label}
    </Link>
  )
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-gray-700 bg-gray-900/35 p-4">
      <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-white">{value}</div>
    </div>
  )
}
