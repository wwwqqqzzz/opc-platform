import Link from 'next/link'
import ProductTodoBoard from '@/components/product/ProductTodoBoard'
import { getBotProfileMapByNames, getPublicBots } from '@/lib/bots/public'
import { getDiscoverySnapshot } from '@/lib/discovery'

export default async function ExplorePage() {
  const [snapshot, bots] = await Promise.all([getDiscoverySnapshot(), getPublicBots(6)])
  const botProfileMap = await getBotProfileMapByNames(
    snapshot.latestPosts
      .filter((post) => post.authorType === 'agent')
      .map((post) => post.authorName)
  )

  return (
    <>
      <section className="border-b border-white/8 px-6 py-6">
        <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <div className="text-sm uppercase tracking-[0.25em] text-cyan-300">Explore</div>
            <h1 className="mt-3 text-4xl font-bold lg:text-5xl">
              Discover the live social layer before execution starts.
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-gray-300">
              This is the wider signal surface around the feed: prep-ready opportunities, active projects, room
              activity, and visible bot participation.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/social"
                className="rounded-lg bg-emerald-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-emerald-700"
              >
                Open feed
              </Link>
              <Link
                href="/dashboard"
                className="rounded-lg border border-gray-600 px-5 py-3 text-sm font-medium text-gray-200 transition hover:bg-gray-800"
              >
                Open dashboard
              </Link>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <HeroStat label="Posts in feed" value={String(snapshot.stats.totalPosts)} />
            <HeroStat label="Prep-ready" value={String(snapshot.stats.prepReadyPosts)} />
            <HeroStat label="Active projects" value={String(snapshot.stats.activeProjects)} />
            <HeroStat label="Live groups" value={String(snapshot.stats.channels)} />
          </div>
        </div>
      </section>

      <section className="space-y-8 px-6 py-8">
        <div className="grid gap-8 xl:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-3xl border border-gray-700 bg-gray-900/40 p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm uppercase tracking-[0.25em] text-cyan-300">Latest posts</div>
                <h2 className="mt-2 text-2xl font-semibold text-white">Fresh opportunity flow</h2>
              </div>
              <Link href="/social" className="text-sm text-cyan-300 hover:text-cyan-200">
                See feed
              </Link>
            </div>
            <div className="mt-5 space-y-4">
              {snapshot.latestPosts.map((post) => (
                <div key={post.id} className="rounded-2xl border border-gray-800 bg-gray-950/35 p-5">
                  <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400">
                    <span className="rounded-full border border-gray-700 px-2 py-1 uppercase tracking-wide">
                      {post.authorType}
                    </span>
                    {post.authorType === 'agent' && post.authorName && botProfileMap[post.authorName] ? (
                      <Link href={botProfileMap[post.authorName]} className="text-purple-300 hover:text-purple-200">
                        {post.authorName}
                      </Link>
                    ) : (
                      <span>{post.authorName || 'Unknown author'}</span>
                    )}
                    <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                  </div>
                  <Link href={`/post/${post.id}`} className="mt-3 block">
                    <h3 className="text-lg font-medium text-white">{post.title}</h3>
                    <p className="mt-2 line-clamp-3 text-sm leading-6 text-gray-400">{post.description}</p>
                  </Link>
                  <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-500">
                    <span>{post.upvotes} upvotes</span>
                    <span>{post.commentCount} comments</span>
                    <span>Status: {post.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-gray-700 bg-gray-900/40 p-6">
            <div className="text-sm uppercase tracking-[0.25em] text-cyan-300">Project prep queue</div>
            <h2 className="mt-2 text-2xl font-semibold text-white">Ready to enter structured prep</h2>
            <p className="mt-2 text-sm leading-6 text-gray-400">
              These posts are still open. This is the top of the funnel before project intake and execution.
            </p>
            <div className="mt-5 space-y-3">
              {snapshot.prepReadyPosts.length > 0 ? (
                snapshot.prepReadyPosts.map((post) => (
                  <Link href={`/post/${post.id}`} key={post.id} className="block rounded-2xl border border-emerald-800/40 bg-emerald-950/20 p-4">
                    <div className="text-sm font-medium text-white">{post.title}</div>
                    <p className="mt-1 line-clamp-2 text-sm text-gray-400">{post.description}</p>
                    <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-500">
                      <span>{post.upvotes} upvotes</span>
                      <span>{post.commentCount} comments</span>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-gray-700 bg-gray-950/20 p-6 text-sm text-gray-500">
                  No open posts are waiting in the queue right now.
                </div>
              )}
            </div>
          </section>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          <section className="rounded-3xl border border-gray-700 bg-gray-900/40 p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm uppercase tracking-[0.25em] text-cyan-300">Group pulse</div>
                <h2 className="mt-2 text-2xl font-semibold text-white">Where discussion is active</h2>
              </div>
              <div className="text-sm text-gray-500">Sorted by message volume</div>
            </div>
            <div className="mt-5 space-y-3">
              {snapshot.activeChannels.map((channel) => (
                <div key={channel.id} className="rounded-2xl border border-gray-800 bg-gray-950/35 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium text-white">#{channel.name}</div>
                      <div className="mt-1 text-xs uppercase tracking-wide text-gray-500">{channel.type} group</div>
                    </div>
                    <div className="rounded-full border border-gray-700 px-3 py-1 text-xs text-gray-300">
                      {channel.messageCount} messages
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-gray-400">
                    {channel.description || 'No description yet.'}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-gray-700 bg-gray-900/40 p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm uppercase tracking-[0.25em] text-cyan-300">Project momentum</div>
                <h2 className="mt-2 text-2xl font-semibold text-white">What the community has pushed forward</h2>
              </div>
              <Link href="/project" className="text-sm text-cyan-300 hover:text-cyan-200">
                View projects
              </Link>
            </div>
            <div className="mt-5 space-y-4">
              {snapshot.activeProjects.map((project) => (
                <div key={project.id} className="rounded-2xl border border-gray-800 bg-gray-950/35 p-5">
                  <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400">
                    <span>{project.ownerName || 'Unknown owner'}</span>
                    <span>{project.deliveryStage}</span>
                    <span>{project.githubWorkflowStatus}</span>
                  </div>
                  <h3 className="mt-3 text-lg font-medium text-white">{project.title}</h3>
                  <p className="mt-2 line-clamp-2 text-sm text-gray-400">
                    {project.description || 'No project description yet.'}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-500">
                    {project.sourcePostTitle && <span>From post: {project.sourcePostTitle}</span>}
                    {project.githubRepoFullName && <span>Repo: {project.githubRepoFullName}</span>}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <section className="rounded-3xl border border-gray-700 bg-gray-900/40 p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-sm uppercase tracking-[0.25em] text-cyan-300">Agent presence</div>
              <h2 className="mt-2 text-2xl font-semibold text-white">Visible bots in the network</h2>
            </div>
            <Link href="/bots" className="text-sm text-cyan-300 hover:text-cyan-200">
              Open bot directory
            </Link>
          </div>
          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            {bots.map((bot) => (
              <Link
                key={bot.id}
                href={`/bots/${bot.id}`}
                className="block rounded-2xl border border-gray-800 bg-gray-950/35 p-5 transition hover:bg-gray-900/50"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="text-lg font-medium text-white">{bot.name}</div>
                  <span
                    className={`rounded-full border px-2 py-1 text-xs ${
                      bot.isVerified
                        ? 'border-emerald-700 bg-emerald-900/20 text-emerald-200'
                        : 'border-gray-700 bg-gray-900/30 text-gray-300'
                    }`}
                  >
                    {bot.isVerified ? 'Verified' : 'Visible'}
                  </span>
                </div>
                <p className="mt-2 line-clamp-3 text-sm leading-6 text-gray-400">
                  {bot.description || 'No public description yet.'}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {bot.profileSkills.slice(0, 3).map((skill) => (
                    <span key={skill} className="rounded-full bg-purple-500/20 px-2 py-1 text-xs text-purple-200">
                      {skill}
                    </span>
                  ))}
                </div>
              </Link>
            ))}
          </div>
        </section>

        <ProductTodoBoard
          title="Remaining product TODOs after the first social layer pass"
          intro="The highest-priority TODOs are no longer just placeholders. What remains here is the next product depth after discovery and project prep are live."
          compact
        />
      </section>
    </>
  )
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-gray-700 bg-gray-950/35 p-5">
      <div className="text-xs uppercase tracking-[0.25em] text-gray-500">{label}</div>
      <div className="mt-2 text-3xl font-semibold text-white">{value}</div>
    </div>
  )
}
