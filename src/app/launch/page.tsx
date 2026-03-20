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

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <Link href="/" className="mb-2 inline-block text-gray-400 hover:text-white">
              Back to Ideas
            </Link>
            <h1 className="text-3xl font-bold">Launch Leaderboard</h1>
            <p className="mt-2 text-gray-400">Products with visible GitHub build provenance and launch history.</p>
          </div>
        </div>

        {created && (
          <div className="mb-6 rounded-xl border border-emerald-700 bg-emerald-900/20 p-5">
            <div className="text-sm uppercase tracking-wide text-emerald-300">Launch created</div>
            <div className="mt-1 text-xl font-semibold text-white">
              Your project is now on the launch board
            </div>
            <p className="mt-2 text-sm text-emerald-100/80">
              This page is now the public record of the build, repository provenance, and launch history.
            </p>
          </div>
        )}

        {launches.length > 0 ? (
          <div className="space-y-6">
            {launches.map((launch, index) => {
              const agentTeam = safeParseTeam(launch.agentTeam)
              const latestActivity = launch.project?.githubActivities[0] || null
              const latestSnapshot = getLatestSnapshot(launch.project?.githubActivities)
              const latestFailure = getLatestSyncFailure(launch.project?.lifecycleEvents)

              return (
                <article
                  key={launch.id}
                  id={launch.id}
                  className={`rounded-lg p-6 transition hover:bg-gray-800 ${
                    highlightId === launch.id
                      ? 'border border-emerald-500 bg-emerald-900/10'
                      : 'bg-gray-800/50'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="w-10 text-2xl font-bold text-gray-500">{index + 1}</div>

                    <div className="flex-1 space-y-5">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <h2 className="text-2xl font-semibold">{launch.productName}</h2>
                          <p className="mt-1 text-gray-400">{launch.tagline}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold">Upvotes {launch.upvotes}</div>
                          <div className="text-sm text-gray-500">
                            {new Date(launch.launchedAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>

                      <div className="grid gap-4 lg:grid-cols-3">
                        <div className="rounded-lg border border-gray-700 bg-gray-900/30 p-4">
                          <div className="text-sm text-gray-400">Source Idea</div>
                          {launch.project?.idea ? (
                            <Link href={`/idea/${launch.project.idea.id}`} className="mt-1 block font-medium text-cyan-300 hover:text-cyan-200">
                              {launch.project.idea.title}
                            </Link>
                          ) : (
                            <div className="mt-1 font-medium">No linked idea</div>
                          )}
                        </div>
                        <div className="rounded-lg border border-gray-700 bg-gray-900/30 p-4">
                          <div className="text-sm text-gray-400">Repository</div>
                          <div className="mt-1 font-medium">{launch.project?.githubRepoFullName || 'Not available'}</div>
                          {launch.githubUrl && (
                            <a href={launch.githubUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-sm text-emerald-400 hover:text-emerald-300">
                              Open Repository
                            </a>
                          )}
                        </div>
                        <div className="rounded-lg border border-gray-700 bg-gray-900/30 p-4">
                          <div className="text-sm text-gray-400">Workflow Status</div>
                          <div className="mt-1 font-medium">
                            {launch.project
                              ? GITHUB_WORKFLOW_STATUS_LABELS[
                                  launch.project.githubWorkflowStatus as keyof typeof GITHUB_WORKFLOW_STATUS_LABELS
                                ]
                              : 'Unknown'}
                          </div>
                          {latestActivity && (
                            <div className="mt-2 text-sm text-gray-500">{latestActivity.title}</div>
                          )}
                        </div>
                      </div>

                      <div className="grid gap-4 lg:grid-cols-4">
                        <EvidenceCard
                          label="Last Sync"
                          value={
                            launch.project?.githubLastSyncedAt
                              ? new Date(launch.project.githubLastSyncedAt).toLocaleString()
                              : 'Not available'
                          }
                        />
                        <EvidenceCard
                          label="Tracked Commits"
                          value={latestSnapshot ? String(latestSnapshot.commitCount) : 'Not available'}
                        />
                        <EvidenceCard
                          label="Workflow Runs"
                          value={latestSnapshot ? String(latestSnapshot.workflowRuns) : 'Not available'}
                        />
                        <EvidenceCard
                          label="Primary Bootstrap"
                          value={
                            launch.project?.githubPrimaryIssueNumber && launch.project.githubPrimaryPrNumber
                              ? `Issue #${launch.project.githubPrimaryIssueNumber} + PR #${launch.project.githubPrimaryPrNumber}`
                              : 'Not available'
                          }
                        />
                      </div>

                      {(latestSnapshot?.latestMergedPullRequestUrl || latestSnapshot?.latestReleaseUrl || latestFailure) && (
                        <div className="rounded-lg border border-gray-700 bg-gray-900/30 p-4">
                          <div className="mb-3 text-sm font-medium text-white">Launch Evidence</div>
                          <div className="flex flex-wrap gap-4 text-sm">
                            {latestSnapshot?.latestMergedPullRequestUrl && (
                              <a
                                href={latestSnapshot.latestMergedPullRequestUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-purple-400 hover:text-purple-300"
                              >
                                Latest Merged PR
                              </a>
                            )}
                            {latestSnapshot?.latestReleaseUrl && (
                              <a
                                href={latestSnapshot.latestReleaseUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-emerald-400 hover:text-emerald-300"
                              >
                                Latest Release
                              </a>
                            )}
                          </div>
                          {latestFailure && (
                            <p className="mt-3 text-sm text-amber-300">
                              Historical note: {latestFailure}
                            </p>
                          )}
                        </div>
                      )}

                      {agentTeam.length > 0 && (
                        <div>
                          <div className="mb-2 text-sm text-gray-400">Agent Team</div>
                          <div className="flex flex-wrap gap-2">
                            {agentTeam.map((agent) => (
                              <span key={`${agent.name}-${agent.type}`} className="rounded-full bg-purple-500/20 px-3 py-1 text-sm text-purple-400">
                                {agent.name} ({agent.type})
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="rounded-lg border border-gray-700 bg-gray-900/30 p-4">
                        <div className="mb-3 text-sm font-medium text-white">Build Provenance</div>
                        <div className="space-y-3">
                          {launch.project?.lifecycleEvents.length ? (
                            launch.project.lifecycleEvents.map((event) => (
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

                      <div className="flex flex-wrap gap-4 text-sm">
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
                            Bootstrap Issue
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
                      </div>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        ) : (
          <div className="py-16 text-center">
            <h2 className="mb-2 text-2xl font-bold">No launches yet</h2>
            <p className="text-gray-400">Products will appear here once projects complete GitHub delivery and are launched.</p>
            <Link href="/" className="mt-4 inline-block rounded-lg bg-emerald-500 px-6 py-3 font-semibold transition hover:bg-emerald-600">
              Submit an Idea
            </Link>
          </div>
        )}
      </div>
    </main>
  )
}

function EvidenceCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-700 bg-gray-900/30 p-4">
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
