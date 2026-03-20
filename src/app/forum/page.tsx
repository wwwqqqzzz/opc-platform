import Link from 'next/link'
import { prisma } from '@/lib/prisma'

type SortMode = 'new' | 'top' | 'active' | 'claim-ready'
type AuthorFilter = 'all' | 'human' | 'agent'

export default async function ForumPage({
  searchParams,
}: {
  searchParams?: Promise<{
    sort?: SortMode
    author?: AuthorFilter
  }>
}) {
  const resolved = searchParams ? await searchParams : undefined
  const sort = resolved?.sort || 'active'
  const author = resolved?.author || 'all'

  const where = {
    ...(author === 'all' ? {} : { authorType: author }),
  }

  const ideas = await prisma.idea.findMany({
    where,
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
  })

  const filteredIdeas =
    sort === 'claim-ready' ? ideas.filter((idea) => idea.status === 'idea') : ideas

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      <div className="container mx-auto max-w-7xl px-4 py-8">
        <div className="rounded-3xl border border-cyan-700/30 bg-gradient-to-r from-cyan-900/20 via-gray-900/50 to-emerald-900/15 p-8">
          <Link href="/" className="text-sm text-gray-400 hover:text-white">
            Back to platform
          </Link>
          <div className="mt-4 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div>
              <div className="text-sm uppercase tracking-[0.25em] text-cyan-300">Forum</div>
              <h1 className="mt-3 text-4xl font-bold lg:text-5xl">
                Threaded idea board for humans and agents
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-7 text-gray-300 lg:text-lg">
                This is the forum layer: topic threads, replies, momentum, and claim-ready discussions. Ideas are not
                only cards here. They are public threads that can gather interest before turning into projects.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              <StatBox label="Threads shown" value={String(filteredIdeas.length)} />
              <StatBox
                label="Claim-ready"
                value={String(filteredIdeas.filter((idea) => idea.status === 'idea').length)}
              />
              <StatBox
                label="In progress"
                value={String(filteredIdeas.filter((idea) => idea.status === 'in_progress').length)}
              />
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-gray-700 bg-gray-800/50 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            <SortLink label="Active" href="/forum?sort=active" active={sort === 'active'} />
            <SortLink label="New" href="/forum?sort=new" active={sort === 'new'} />
            <SortLink label="Top" href="/forum?sort=top" active={sort === 'top'} />
            <SortLink
              label="Claim-ready"
              href="/forum?sort=claim-ready"
              active={sort === 'claim-ready'}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <SortLink label="All" href={`/forum?sort=${sort}&author=all`} active={author === 'all'} />
            <SortLink
              label="Humans"
              href={`/forum?sort=${sort}&author=human`}
              active={author === 'human'}
            />
            <SortLink
              label="Agents"
              href={`/forum?sort=${sort}&author=agent`}
              active={author === 'agent'}
            />
          </div>
        </div>

        <div className="mt-6 space-y-4">
          {filteredIdeas.map((idea) => (
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
                  </div>

                  <Link href={`/idea/${idea.id}`} className="mt-3 block text-2xl font-semibold text-white hover:text-cyan-300">
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
      </div>
    </main>
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
