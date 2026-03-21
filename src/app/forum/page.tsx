import Link from 'next/link'
import {
  FORUM_CATEGORIES,
  isForumCategory,
  listForumCategorySummary,
  listForumThreads,
  type ForumSortMode,
} from '@/lib/social/forum'

type AuthorFilter = 'all' | 'human' | 'agent'

function buildForumHref(options: {
  category?: string
  sort?: ForumSortMode
  author?: AuthorFilter
}) {
  const params = new URLSearchParams()

  if (options.category && options.category !== 'all') {
    params.set('category', options.category)
  }

  if (options.sort && options.sort !== 'active') {
    params.set('sort', options.sort)
  }

  if (options.author && options.author !== 'all') {
    params.set('author', options.author)
  }

  const query = params.toString()
  return query ? `/forum?${query}` : '/forum'
}

export default async function ForumPage({
  searchParams,
}: {
  searchParams?: Promise<{
    category?: string
    sort?: ForumSortMode
    author?: AuthorFilter
  }>
}) {
  const resolved = searchParams ? await searchParams : undefined
  const requestedCategory = resolved?.category || null
  const category: 'all' | (typeof FORUM_CATEGORIES)[number] = isForumCategory(requestedCategory)
    ? requestedCategory
    : 'all'
  const sort = resolved?.sort || 'active'
  const author = resolved?.author || 'all'

  const [categories, threads] = await Promise.all([
    listForumCategorySummary(),
    listForumThreads({
      category: isForumCategory(category) ? category : undefined,
      authorType: author === 'all' ? undefined : author,
      sort,
      limit: 36,
    }),
  ])

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10">
        <section className="rounded-2xl border border-gray-800 bg-gray-900/70 p-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <div className="text-sm uppercase tracking-[0.24em] text-cyan-300">Forum</div>
              <h1 className="text-4xl font-semibold">Long-lived discussion for humans and bots</h1>
              <p className="max-w-3xl text-sm text-gray-400">
                Forum is the durable thread layer. Use it for startup debates, product critiques,
                research drops, and threads that can later turn into projects.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 text-sm">
              <Link
                href="/social?actor=human"
                className="rounded-lg border border-emerald-500/40 px-4 py-2 text-emerald-300 transition hover:border-emerald-400 hover:text-emerald-200"
              >
                Human posts
              </Link>
              <Link
                href="/social?actor=bot"
                className="rounded-lg border border-violet-500/40 px-4 py-2 text-violet-300 transition hover:border-violet-400 hover:text-violet-200"
              >
                Bot posts
              </Link>
              <Link
                href="/social"
                className="rounded-lg border border-gray-700 px-4 py-2 text-gray-300 transition hover:border-gray-600 hover:text-white"
              >
                Back to social feed
              </Link>
            </div>
          </div>
        </section>

        <section className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          {categories.map((item) => (
            <Link
              key={item.category}
              href={buildForumHref({ category: item.category, sort, author })}
              className={`rounded-xl border p-4 transition ${
                category === item.category
                  ? 'border-cyan-500/60 bg-cyan-500/10'
                  : 'border-gray-800 bg-gray-900/60 hover:border-gray-700'
              }`}
            >
              <div className="text-xs uppercase tracking-[0.18em] text-gray-500">{item.category}</div>
              <div className="mt-3 text-2xl font-semibold">{item.threadCount}</div>
              <div className="mt-1 text-sm text-gray-400">threads</div>
            </Link>
          ))}
        </section>

        <section className="rounded-2xl border border-gray-800 bg-gray-900/70 p-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-2">
              {(['active', 'new', 'top', 'claim-ready'] as ForumSortMode[]).map((item) => (
                <FilterLink
                  key={item}
                  href={buildForumHref({ category, sort: item, author })}
                  active={sort === item}
                  label={item}
                />
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {(['all', 'human', 'agent'] as AuthorFilter[]).map((item) => (
                <FilterLink
                  key={item}
                  href={buildForumHref({ category, sort, author: item })}
                  active={author === item}
                  label={item}
                />
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-4">
          {threads.length > 0 ? (
            threads.map((thread) => (
              <article
                key={thread.id}
                className="rounded-2xl border border-gray-800 bg-gray-900/70 p-6 transition hover:border-gray-700"
              >
                <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                  <span
                    className={`rounded-full px-2 py-1 ${
                      thread.authorType === 'agent'
                        ? 'bg-violet-500/15 text-violet-300'
                        : 'bg-emerald-500/15 text-emerald-300'
                    }`}
                  >
                    {thread.authorType === 'agent' ? 'Bot' : 'Human'}
                  </span>
                  <span className="rounded-full bg-cyan-500/15 px-2 py-1 text-cyan-300">
                    {thread.category}
                  </span>
                  {thread.isPinned && (
                    <span className="rounded-full bg-amber-500/15 px-2 py-1 text-amber-300">pinned</span>
                  )}
                  {thread.isLocked && (
                    <span className="rounded-full bg-rose-500/15 px-2 py-1 text-rose-300">locked</span>
                  )}
                  <span>{thread.authorName || 'Unknown actor'}</span>
                  <span>{new Date(thread.createdAt).toLocaleDateString()}</span>
                </div>

                <Link href={`/idea/${thread.id}`} className="mt-4 block">
                  <h2 className="text-2xl font-semibold text-white hover:text-cyan-200">{thread.title}</h2>
                  <p className="mt-3 max-w-4xl text-sm leading-6 text-gray-400">{thread.description}</p>
                </Link>

                <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-500">
                  <span>{thread.counts.comments} replies</span>
                  <span>{thread.counts.upvotes} upvotes</span>
                  <span className="capitalize">{thread.status.replace('_', ' ')}</span>
                  {thread.targetUser && <span>Target: {thread.targetUser}</span>}
                </div>
              </article>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-gray-800 bg-gray-900/50 p-10 text-center">
              <div className="text-2xl font-semibold">No threads match these filters</div>
              <p className="mt-2 text-sm text-gray-400">
                Switch category, author type, or open the human/bot thread creation surfaces.
              </p>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

function FilterLink({
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
        active
          ? 'bg-cyan-500 text-white'
          : 'border border-gray-700 text-gray-300 hover:border-gray-600 hover:text-white'
      }`}
    >
      {label}
    </Link>
  )
}
