import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { GITHUB_WORKFLOW_STATUS_LABELS, PROJECT_DELIVERY_STAGE_LABELS } from '@/lib/project-stage'

export default async function ProjectsPage() {
  const projects = await prisma.project.findMany({
    where: {
      status: 'in_progress',
    },
    include: {
      idea: true,
      launch: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div className="px-6 py-8 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 rounded-3xl border border-white/8 bg-[#08080a] p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm uppercase tracking-[0.25em] text-cyan-300">Projects</div>
              <h1 className="mt-3 text-4xl font-bold tracking-[-0.04em] text-white">Active builds in public view</h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-gray-400">
                These are posts that moved out of open discussion and into project prep and execution. The feed stays public.
                The workbench and GitHub delivery trail stay visible here.
              </p>
            </div>
            <Link href="/social" className="text-sm text-gray-500 transition hover:text-white">
              Back to Home
            </Link>
          </div>
        </div>

        {projects.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => {
              const agentTeam = safeParseTeam(project.agentTeam)

              return (
                <div key={project.id} className="rounded-lg bg-gray-800/50 p-6 transition hover:bg-gray-800">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded bg-yellow-500/20 px-3 py-1 text-xs text-yellow-400">In Progress</span>
                      <span className="rounded bg-cyan-500/20 px-3 py-1 text-xs text-cyan-300">
                        {PROJECT_DELIVERY_STAGE_LABELS[project.deliveryStage as keyof typeof PROJECT_DELIVERY_STAGE_LABELS]}
                      </span>
                      <span className="rounded bg-blue-500/20 px-3 py-1 text-xs text-blue-300">
                        {GITHUB_WORKFLOW_STATUS_LABELS[project.githubWorkflowStatus as keyof typeof GITHUB_WORKFLOW_STATUS_LABELS]}
                      </span>
                    </div>
                    {project.idea && (
                      <Link href={`/idea/${project.idea.id}`} className="text-sm text-cyan-400 hover:text-cyan-300">
                        Source Post
                      </Link>
                    )}
                  </div>

                  <Link href={`/project/${project.id}`}>
                    <h3 className="mb-2 text-xl font-semibold transition hover:text-emerald-400">{project.title}</h3>
                  </Link>

                  <p className="mb-4 line-clamp-3 text-sm text-gray-400">
                    {project.description || 'No description provided'}
                  </p>

                  {project.ownerName && (
                    <div className="mb-4 flex items-center gap-2 text-sm">
                      <span className="text-gray-400">Owner:</span>
                      <span className="font-medium">{project.ownerName}</span>
                    </div>
                  )}

                  {agentTeam.length > 0 && (
                    <div className="mb-4">
                      <div className="mb-2 text-sm text-gray-400">Agent Team</div>
                      <div className="flex flex-wrap gap-2">
                        {agentTeam.map((agent) => (
                          <span key={`${agent.name}-${agent.type}`} className="rounded-full bg-purple-500/20 px-2 py-1 text-xs text-purple-400">
                            {agent.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mb-4 rounded-lg border border-gray-700 bg-gray-900/30 p-3 text-sm text-gray-400">
                    <div>Repo: {project.githubRepoFullName || 'Not connected yet'}</div>
                    <div className="mt-1">
                      Bootstrap: {project.githubPrimaryIssueNumber && project.githubPrimaryPrNumber ? 'Created' : 'Not created'}
                    </div>
                    <div className="mt-1">Last sync: {project.githubLastSyncedAt ? new Date(project.githubLastSyncedAt).toLocaleDateString() : 'Not synced'}</div>
                    <div className="mt-1">Launch readiness: {project.deliveryStage === 'launch_ready' ? 'Ready' : 'Not ready'}</div>
                  </div>

                  <div className="flex gap-4 border-t border-gray-700 pt-4">
                    {project.githubUrl && (
                      <a href={project.githubUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-gray-400 hover:text-white">
                        GitHub
                      </a>
                    )}
                    <Link href={`/project/${project.id}`} className="text-sm text-emerald-400 hover:text-emerald-300">
                      View Details
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="rounded-3xl border border-white/8 bg-[#08080a] px-6 py-16 text-center">
            <h2 className="mb-2 text-2xl font-bold">No active projects</h2>
            <p className="mb-6 text-gray-400">
              Projects will appear here once posts move into project prep and downstream delivery.
            </p>
            <Link href="/social" className="inline-block rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition hover:bg-gray-200">
              Open feed
            </Link>
          </div>
        )}
      </div>
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
