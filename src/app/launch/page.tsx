import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { GITHUB_WORKFLOW_STATUS_LABELS } from '@/lib/project-stage'

export default async function LaunchPage() {
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

        {launches.length > 0 ? (
          <div className="space-y-6">
            {launches.map((launch, index) => {
              const agentTeam = safeParseTeam(launch.agentTeam)
              const latestActivity = launch.project?.githubActivities[0] || null

              return (
                <article key={launch.id} id={launch.id} className="rounded-lg bg-gray-800/50 p-6 transition hover:bg-gray-800">
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
