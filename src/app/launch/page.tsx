import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { GITHUB_WORKFLOW_STATUS_LABELS } from '@/lib/project-stage'

export default async function LaunchPage({
  searchParams,
}: {
  searchParams?: Promise<{
    created?: string
    highlight?: string
  }>
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const created = resolvedSearchParams?.created === '1'
  const highlightId = resolvedSearchParams?.highlight
  const launches = await prisma.launch.findMany({
    include: {
      project: {
        include: {
          idea: true,
          lifecycleEvents: {
            orderBy: { createdAt: 'asc' },
          },
          githubActivities: {
            orderBy: { createdAt: 'desc' },
            take: 25,
          },
        },
      },
    },
    orderBy: [{ upvotes: 'desc' }, { launchedAt: 'desc' }],
    take: 50,
  })

  const stats = {
    total: launches.length,
    withRepo: launches.filter((launch) => Boolean(launch.project?.githubRepoFullName)).length,
    withReleaseProof: launches.filter((launch) => {
      const snapshot = getLatestSnapshot(launch.project?.githubActivities)
      return Boolean(snapshot?.latestMergedPullRequestUrl || snapshot?.latestReleaseUrl)
    }).length,
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      <div className="container mx-auto max-w-7xl px-4 py-8">
        <div className="rounded-3xl border border-emerald-700/30 bg-gradient-to-r from-emerald-900/30 via-gray-900/60 to-cyan-900/20 p-8">
          <Link href="/" className="inline-block text-sm text-gray-400 hover:text-white">
            Back to platform
          </Link>
          <div className="mt-4 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <div>
              <div className="text-sm uppercase tracking-[0.3em] text-emerald-300">Launch Board</div>
              <h1 className="mt-3 text-4xl font-bold text-white lg:text-5xl">
                Public launches with visible build provenance
              </h1>
              <p className="mt-4 max-w-3xl text-base text-gray-300 lg:text-lg">
                Every launch here is backed by a tracked project, a bound GitHub repository, bootstrap artifacts,
                sync history, and lifecycle milestones. This page is the public record after execution, not just a
                showcase card.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/project"
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
                >
                  View active projects
                </Link>
                <Link
                  href="/ideas/human"
                  className="rounded-lg border border-gray-600 px-4 py-2 text-sm font-medium text-gray-200 transition hover:bg-gray-800"
                >
                  Start another build
                </Link>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              <HeroStat label="Tracked launches" value={String(stats.total)} />
              <HeroStat label="With public repo" value={String(stats.withRepo)} />
              <HeroStat label="With release proof" value={String(stats.withReleaseProof)} />
            </div>
          </div>
        </div>

        {created && (
          <div className="mt-6 rounded-xl border border-emerald-700 bg-emerald-900/20 p-5">
            <div className="text-sm uppercase tracking-wide text-emerald-300">Launch created</div>
            <div className="mt-1 text-xl font-semibold text-white">Your project is now on the launch board</div>
            <p className="mt-2 text-sm text-emerald-100/80">
              This page is now the public record of the build, repository provenance, and launch history.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href="/dashboard"
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
              >
                Return to dashboard
              </Link>
              <Link
                href="/ideas/human"
                className="rounded-lg border border-gray-600 px-4 py-2 text-sm font-medium text-gray-200 transition hover:bg-gray-800"
              >
                Start next project
              </Link>
            </div>
          </div>
        )}

        {launches.length > 0 ? (
          <div className="mt-8 space-y-6">
            {launches.map((launch, index) => {
              const agentTeam = safeParseTeam(launch.agentTeam)
              const latestActivity = launch.project?.githubActivities[0] || null
              const latestSnapshot = getLatestSnapshot(launch.project?.githubActivities)
              const latestFailure = getLatestSyncFailure(launch.project?.lifecycleEvents)
              const provenanceTimeline = getKeyProvenanceEvents(launch.project?.lifecycleEvents)

              return (
                <article
                  key={launch.id}
                  id={launch.id}
                  className={`rounded-2xl border p-6 ${
                    highlightId === launch.id
                      ? 'border-emerald-500 bg-emerald-900/10'
                      : 'border-gray-700 bg-gray-800/50'
                  }`}
                >
                  <div className="grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
                    <div className="space-y-5">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-3">
                            <span className="rounded-full border border-gray-600 px-3 py-1 text-xs text-gray-300">
                              Rank #{index + 1}
                            </span>
                            {launch.project?.githubWorkflowStatus && (
                              <span className="rounded-full border border-cyan-700 bg-cyan-900/20 px-3 py-1 text-xs text-cyan-200">
                                {
                                  GITHUB_WORKFLOW_STATUS_LABELS[
                                    launch.project.githubWorkflowStatus as keyof typeof GITHUB_WORKFLOW_STATUS_LABELS
                                  ]
                                }
                              </span>
                            )}
                          </div>
                          <h2 className="mt-3 text-3xl font-semibold text-white">{launch.productName}</h2>
                          <p className="mt-2 text-gray-300">{launch.tagline}</p>
                        </div>
                        <div className="rounded-xl border border-gray-700 bg-gray-900/30 p-4 text-left lg:min-w-[180px] lg:text-right">
                          <div className="text-sm text-gray-400">Launch date</div>
                          <div className="mt-1 text-lg font-semibold text-white">
                            {new Date(launch.launchedAt).toLocaleDateString()}
                          </div>
                          <div className="mt-3 text-sm text-gray-400">Upvotes</div>
                          <div className="mt-1 text-lg font-semibold text-white">{launch.upvotes}</div>
                        </div>
                      </div>

                      <div className="grid gap-4 md:grid-cols-3">
                        <DetailCard label="Source idea">
                          {launch.project?.idea ? (
                            <Link href={`/idea/${launch.project.idea.id}`} className="font-medium text-cyan-300 hover:text-cyan-200">
                              {launch.project.idea.title}
                            </Link>
                          ) : (
                            <span className="text-gray-400">No linked idea</span>
                          )}
                        </DetailCard>
                        <DetailCard label="Repository">
                          <div className="font-medium text-white">{launch.project?.githubRepoFullName || 'Not available'}</div>
                          {launch.githubUrl && (
                            <a
                              href={launch.githubUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-2 inline-block text-sm text-emerald-400 hover:text-emerald-300"
                            >
                              Open repository
                            </a>
                          )}
                        </DetailCard>
                        <DetailCard label="Latest signal">
                          <div className="font-medium text-white">{latestActivity?.title || 'No recent GitHub activity'}</div>
                          {latestActivity && (
                            <div className="mt-2 text-sm text-gray-500">
                              {new Date(latestActivity.createdAt).toLocaleString()}
                            </div>
                          )}
                        </DetailCard>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        <EvidenceCard
                          label="Last sync"
                          value={
                            launch.project?.githubLastSyncedAt
                              ? new Date(launch.project.githubLastSyncedAt).toLocaleString()
                              : 'Not available'
                          }
                        />
                        <EvidenceCard
                          label="Tracked commits"
                          value={latestSnapshot ? String(latestSnapshot.commitCount) : 'Not available'}
                        />
                        <EvidenceCard
                          label="Workflow runs"
                          value={latestSnapshot ? String(latestSnapshot.workflowRuns) : 'Not available'}
                        />
                        <EvidenceCard
                          label="Bootstrap"
                          value={
                            launch.project?.githubPrimaryIssueNumber && launch.project.githubPrimaryPrNumber
                              ? `Issue #${launch.project.githubPrimaryIssueNumber} + PR #${launch.project.githubPrimaryPrNumber}`
                              : 'Not available'
                          }
                        />
                      </div>

                      <div className="rounded-xl border border-gray-700 bg-gray-900/30 p-5">
                        <div className="text-sm uppercase tracking-wide text-cyan-300">Build provenance</div>
                        <div className="mt-4 space-y-4">
                          {provenanceTimeline.length > 0 ? (
                            provenanceTimeline.map((event) => (
                              <div key={event.id} className="flex gap-3">
                                <div className="mt-1 h-3 w-3 rounded-full bg-cyan-500"></div>
                                <div>
                                  <div className="text-sm font-medium text-white">{event.title}</div>
                                  <div className="text-xs text-gray-500">
                                    {new Date(event.createdAt).toLocaleString()}
                                  </div>
                                  {event.description && (
                                    <div className="mt-1 text-sm text-gray-400">{event.description}</div>
                                  )}
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="text-sm text-gray-500">No project lifecycle history available.</div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-5">
                      <div className="rounded-xl border border-gray-700 bg-gray-900/30 p-5">
                        <div className="text-sm uppercase tracking-wide text-cyan-300">Proof bundle</div>
                        <div className="mt-4 flex flex-wrap gap-3 text-sm">
                          {launch.demoUrl && (
                            <a href={launch.demoUrl} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:text-emerald-300">
                              Demo
                            </a>
                          )}
                          {launch.project?.githubPrimaryIssueNumber && launch.githubUrl && (
                            <a
                              href={`${launch.githubUrl}/issues/${launch.project.githubPrimaryIssueNumber}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-cyan-400 hover:text-cyan-300"
                            >
                              Bootstrap issue
                            </a>
                          )}
                          {launch.project?.githubPrimaryPrNumber && launch.githubUrl && (
                            <a
                              href={`${launch.githubUrl}/pull/${launch.project.githubPrimaryPrNumber}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-purple-400 hover:text-purple-300"
                            >
                              Bootstrap PR
                            </a>
                          )}
                          {latestSnapshot?.latestMergedPullRequestUrl && (
                            <a
                              href={latestSnapshot.latestMergedPullRequestUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-purple-400 hover:text-purple-300"
                            >
                              Latest merged PR
                            </a>
                          )}
                          {latestSnapshot?.latestReleaseUrl && (
                            <a
                              href={latestSnapshot.latestReleaseUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-emerald-400 hover:text-emerald-300"
                            >
                              Latest release
                            </a>
                          )}
                        </div>
                        {latestFailure && (
                          <p className="mt-4 text-sm text-amber-300">Historical note: {latestFailure}</p>
                        )}
                      </div>

                      {agentTeam.length > 0 && (
                        <div className="rounded-xl border border-gray-700 bg-gray-900/30 p-5">
                          <div className="text-sm uppercase tracking-wide text-cyan-300">Agent team</div>
                          <div className="mt-4 flex flex-wrap gap-2">
                            {agentTeam.map((agent) => (
                              <span key={`${agent.name}-${agent.type}`} className="rounded-full bg-purple-500/20 px-3 py-1 text-sm text-purple-400">
                                {agent.name} ({agent.type})
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        ) : (
          <div className="py-16 text-center">
            <h2 className="mb-2 text-2xl font-bold">No launches yet</h2>
            <p className="text-gray-400">
              Products will appear here once projects complete GitHub delivery and are launched.
            </p>
            <Link href="/" className="mt-4 inline-block rounded-lg bg-emerald-500 px-6 py-3 font-semibold transition hover:bg-emerald-600">
              Submit an idea
            </Link>
          </div>
        )}
      </div>
    </main>
  )
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-700 bg-gray-900/35 p-4">
      <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-white">{value}</div>
    </div>
  )
}

function DetailCard({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-gray-700 bg-gray-900/30 p-4">
      <div className="text-sm text-gray-400">{label}</div>
      <div className="mt-2 text-sm">{children}</div>
    </div>
  )
}

function EvidenceCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-700 bg-gray-900/30 p-4">
      <div className="text-sm text-gray-400">{label}</div>
      <div className="mt-1 font-medium text-white">{value}</div>
    </div>
  )
}

function safeParseTeam(value: string | null) {
  if (!value) {
    return [] as Array<{ name: string; type: string }>
  }

  try {
    const parsed = JSON.parse(value) as Array<{ name?: string; type?: string } | string>
    return parsed.map((agent) =>
      typeof agent === 'string'
        ? { name: agent, type: 'unspecified' }
        : { name: agent.name || 'Unnamed agent', type: agent.type || 'unspecified' }
    )
  } catch {
    return []
  }
}

function getLatestSnapshot(
  activities:
    | Array<{
        eventType: string
        metadata: string | null
      }>
    | undefined
) {
  const snapshot = activities?.find((activity) => activity.eventType === 'sync_snapshot')
  if (!snapshot?.metadata) {
    return null
  }

  try {
    const parsed = JSON.parse(snapshot.metadata) as Record<string, unknown>
    return {
      commitCount: Number(parsed.commitCount || 0),
      workflowRuns: Number(parsed.workflowRuns || 0),
      latestMergedPullRequestUrl:
        typeof parsed.latestMergedPullRequestUrl === 'string' ? parsed.latestMergedPullRequestUrl : null,
      latestReleaseUrl:
        typeof parsed.latestReleaseUrl === 'string' ? parsed.latestReleaseUrl : null,
    }
  } catch {
    return null
  }
}

function getLatestSyncFailure(
  lifecycleEvents:
    | Array<{
        eventType: string
        description: string | null
      }>
    | undefined
) {
  const failure = lifecycleEvents
    ?.slice()
    .reverse()
    .find((event) => event.eventType === 'github_sync_failed')

  return failure?.description || null
}

function getKeyProvenanceEvents(
  lifecycleEvents:
    | Array<{
        id: string
        eventType: string
        title: string
        description: string | null
        createdAt: Date
      }>
    | undefined
) {
  if (!lifecycleEvents?.length) {
    return []
  }

  const preferredOrder = [
    'project_created',
    'github_repo_connected',
    'github_bootstrap_started',
    'github_issue_created',
    'github_pr_created',
    'github_progress_detected',
    'github_ready_for_launch',
    'launch_created',
  ]

  const selected = preferredOrder
    .map((eventType) => lifecycleEvents.find((event) => event.eventType === eventType))
    .filter(
      (
        event
      ): event is {
        id: string
        eventType: string
        title: string
        description: string | null
        createdAt: Date
      } => Boolean(event)
    )

  return selected.length > 0 ? selected : lifecycleEvents.slice(-6)
}
