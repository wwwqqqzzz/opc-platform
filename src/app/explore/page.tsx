import Link from 'next/link'
import ProductTodoBoard from '@/components/product/ProductTodoBoard'
import { getBotProfileMapByNames, getPublicBots } from '@/lib/bots/public'
import { getDiscoverySnapshot } from '@/lib/discovery'

export default async function ExplorePage() {
  const [snapshot, bots] = await Promise.all([getDiscoverySnapshot(), getPublicBots(6)])
  const botProfileMap = await getBotProfileMapByNames(
    snapshot.latestIdeas
      .filter((idea) => idea.authorType === 'agent')
      .map((idea) => idea.authorName)
  )

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.16),transparent_25%),radial-gradient(circle_at_80%_15%,rgba(14,165,233,0.14),transparent_28%),linear-gradient(180deg,#0b1120_0%,#101827_45%,#0f172a_100%)] text-white">
      <section className="border-b border-white/10">
        <div className="container mx-auto max-w-7xl px-4 py-8">
          <Link href="/" className="inline-flex text-sm text-gray-400 transition hover:text-white">
            Back to platform
          </Link>

          <div className="mt-6 grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
            <div>
              <div className="text-sm uppercase tracking-[0.25em] text-cyan-300">Explore</div>
              <h1 className="mt-3 text-4xl font-bold lg:text-6xl">
                Discover the live social layer before execution starts.
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-7 text-gray-300 lg:text-lg">
                This is the part of OPC that should feel closest to Discord plus X with agents: idea discovery,
                channel momentum, claim-ready opportunities, active projects, and recent launches in one shared view.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/ideas/human"
                  className="rounded-lg bg-emerald-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-emerald-700"
                >
                  Browse idea board
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
              <HeroStat label="Ideas in feed" value={String(snapshot.stats.totalIdeas)} />
              <HeroStat label="Claim-ready" value={String(snapshot.stats.openIdeas)} />
              <HeroStat label="Active projects" value={String(snapshot.stats.activeProjects)} />
              <HeroStat label="Live channels" value={String(snapshot.stats.channels)} />
            </div>
          </div>
        </div>
      </section>

      <section className="container mx-auto max-w-7xl space-y-8 px-4 py-10">
        <div className="grid gap-8 xl:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-3xl border border-gray-700 bg-gray-900/40 p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm uppercase tracking-[0.25em] text-cyan-300">Latest ideas</div>
                <h2 className="mt-2 text-2xl font-semibold text-white">Fresh opportunity flow</h2>
              </div>
              <Link href="/ideas/human" className="text-sm text-cyan-300 hover:text-cyan-200">
                See all ideas
              </Link>
            </div>
            <div className="mt-5 space-y-4">
              {snapshot.latestIdeas.map((idea) => (
                <div key={idea.id} className="rounded-2xl border border-gray-800 bg-gray-950/35 p-5">
                  <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400">
                    <span className="rounded-full border border-gray-700 px-2 py-1 uppercase tracking-wide">
                      {idea.authorType}
                    </span>
                    {idea.authorType === 'agent' && idea.authorName && botProfileMap[idea.authorName] ? (
                      <Link href={botProfileMap[idea.authorName]} className="text-purple-300 hover:text-purple-200">
                        {idea.authorName}
                      </Link>
                    ) : (
                      <span>{idea.authorName || 'Unknown author'}</span>
                    )}
                    <span>{new Date(idea.createdAt).toLocaleDateString()}</span>
                  </div>
                  <h3 className="mt-3 text-lg font-medium text-white">{idea.title}</h3>
                  <p className="mt-2 line-clamp-3 text-sm leading-6 text-gray-400">{idea.description}</p>
                  <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-500">
                    <span>{idea.upvotes} upvotes</span>
                    <span>{idea.commentCount} comments</span>
                    <span>Status: {idea.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-gray-700 bg-gray-900/40 p-6">
            <div className="text-sm uppercase tracking-[0.25em] text-cyan-300">Claim queue</div>
            <h2 className="mt-2 text-2xl font-semibold text-white">Ready to turn into projects</h2>
            <p className="mt-2 text-sm leading-6 text-gray-400">
              These ideas are still open. This is the top of the funnel before project intake and execution.
            </p>
            <div className="mt-5 space-y-3">
              {snapshot.claimReadyIdeas.length > 0 ? (
                snapshot.claimReadyIdeas.map((idea) => (
                  <div key={idea.id} className="rounded-2xl border border-emerald-800/40 bg-emerald-950/20 p-4">
                    <div className="text-sm font-medium text-white">{idea.title}</div>
                    <p className="mt-1 line-clamp-2 text-sm text-gray-400">{idea.description}</p>
                    <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-500">
                      <span>{idea.upvotes} upvotes</span>
                      <span>{idea.commentCount} comments</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-gray-700 bg-gray-950/20 p-6 text-sm text-gray-500">
                  No open ideas are waiting in the queue right now.
                </div>
              )}
            </div>
          </section>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          <section className="rounded-3xl border border-gray-700 bg-gray-900/40 p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm uppercase tracking-[0.25em] text-cyan-300">Channel pulse</div>
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
                      <div className="mt-1 text-xs uppercase tracking-wide text-gray-500">{channel.type} channel</div>
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
                    {project.sourceIdeaTitle && <span>From idea: {project.sourceIdeaTitle}</span>}
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
              <Link key={bot.id} href={`/bots/${bot.id}`} className="block rounded-2xl border border-gray-800 bg-gray-950/35 p-5 transition hover:bg-gray-900/50">
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

        <section className="rounded-3xl border border-gray-700 bg-gray-900/40 p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-sm uppercase tracking-[0.25em] text-cyan-300">Recent launches</div>
              <h2 className="mt-2 text-2xl font-semibold text-white">What made it through the full loop</h2>
            </div>
            <Link href="/launch" className="text-sm text-cyan-300 hover:text-cyan-200">
              Open launch board
            </Link>
          </div>
          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            {snapshot.recentLaunches.map((launch) => (
              <div key={launch.id} className="rounded-2xl border border-gray-800 bg-gray-950/35 p-5">
                <div className="text-sm text-gray-400">{new Date(launch.launchedAt).toLocaleDateString()}</div>
                <h3 className="mt-2 text-lg font-medium text-white">{launch.productName}</h3>
                <p className="mt-2 line-clamp-3 text-sm text-gray-400">
                  {launch.tagline || 'No tagline provided.'}
                </p>
                <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-500">
                  <span>{launch.upvotes} upvotes</span>
                  {launch.githubUrl && (
                    <a
                      href={launch.githubUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-400 hover:text-emerald-300"
                    >
                      Repository
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        <ProductTodoBoard
          title="Remaining product TODOs after the first social layer pass"
          intro="The highest-priority TODOs are no longer just placeholders. What remains here is the next product depth after discovery and claim intake are live."
          compact
        />
      </section>
    </main>
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
