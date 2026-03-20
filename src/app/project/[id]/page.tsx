'use client'

import Link from 'next/link'
import { notFound, useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import {
  AGENT_GITHUB_STATUS_LABELS,
  GITHUB_SYNC_STATUS_LABELS,
  GITHUB_WORKFLOW_STATUS_LABELS,
  PROJECT_DELIVERY_STAGE_LABELS,
} from '@/lib/project-stage'
import type { ProjectDto } from '@/types/projects'

interface RepoFormState {
  repoOwner: string
  repoName: string
}

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>()
  const { user } = useAuth()
  const [project, setProject] = useState<ProjectDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const [connectingRepo, setConnectingRepo] = useState(false)
  const [bootstrapping, setBootstrapping] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [launching, setLaunching] = useState(false)
  const [showLaunchDialog, setShowLaunchDialog] = useState(false)
  const [repoForm, setRepoForm] = useState<RepoFormState>({ repoOwner: '', repoName: '' })
  const [launchForm, setLaunchForm] = useState({
    productName: '',
    tagline: '',
    demoUrl: '',
  })

  useEffect(() => {
    void fetchProject()
  }, [params.id])

  const fetchProject = async () => {
    try {
      const response = await fetch(`/api/projects/${params.id}`)
      if (response.status === 404) {
        notFound()
      }
      if (!response.ok) {
        throw new Error('Failed to fetch project')
      }

      const data: ProjectDto = await response.json()
      setProject(data)

      if (data.github?.connection.owner && data.github.connection.name) {
        setRepoForm({
          repoOwner: data.github.connection.owner,
          repoName: data.github.connection.name,
        })
      }
    } catch (error) {
      console.error('Failed to fetch project:', error)
      setActionError(error instanceof Error ? error.message : 'Failed to fetch project')
    } finally {
      setLoading(false)
    }
  }

  const runProjectAction = async (
    url: string,
    body?: unknown,
    options?: { successMessage?: string; method?: string }
  ) => {
    const response = await fetch(url, {
      method: options?.method || 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    })

    const data = await response.json()
    if (!response.ok) {
      throw new Error(data.error || data.details || 'Request failed')
    }

    if (data.warnings?.length) {
      setActionMessage(data.warnings.join(' '))
    } else if (options?.successMessage) {
      setActionMessage(options.successMessage)
    }

    await fetchProject()
    return data
  }

  const handleConnectRepo = async () => {
    if (!project) return
    if (!repoForm.repoOwner || !repoForm.repoName) {
      setActionError('Repository owner and repository name are required.')
      return
    }

    try {
      setConnectingRepo(true)
      setActionError(null)
      await runProjectAction(`/api/projects/${project.id}/github/connect`, repoForm, {
        successMessage: 'GitHub repository connected.',
      })
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Failed to connect repository')
    } finally {
      setConnectingRepo(false)
    }
  }

  const handleBootstrap = async () => {
    if (!project) return

    try {
      setBootstrapping(true)
      setActionError(null)
      await runProjectAction(`/api/projects/${project.id}/github/bootstrap`, undefined, {
        successMessage: 'GitHub workflow bootstrapped.',
      })
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Failed to bootstrap GitHub workflow')
    } finally {
      setBootstrapping(false)
    }
  }

  const handleSync = async () => {
    if (!project) return

    try {
      setSyncing(true)
      setActionError(null)
      await runProjectAction(`/api/projects/${project.id}/github/sync`, undefined, {
        successMessage: 'GitHub activity synced.',
      })
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Failed to sync GitHub data')
    } finally {
      setSyncing(false)
    }
  }

  const handleLaunch = async () => {
    if (!project || !launchForm.productName || !launchForm.tagline) {
      setActionError('Product name and tagline are required.')
      return
    }

    try {
      setLaunching(true)
      setActionError(null)
      await runProjectAction(
        '/api/launches',
        {
          projectId: project.id,
          productName: launchForm.productName,
          tagline: launchForm.tagline,
          demoUrl: launchForm.demoUrl,
        },
        { successMessage: 'Launch created successfully.' }
      )
      setShowLaunchDialog(false)
      setLaunchForm({ productName: '', tagline: '', demoUrl: '' })
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Failed to create launch')
    } finally {
      setLaunching(false)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
        <div className="container mx-auto max-w-6xl px-4 py-8">
          <div className="py-16 text-center text-gray-400">Loading...</div>
        </div>
      </main>
    )
  }

  if (!project) {
    notFound()
  }

  const agentTeam = safeParseTeam(project.agentTeam)
  const canManageProject = Boolean(user?.id && project.user?.id === user.id)
  const githubConnected = Boolean(project.githubConnection?.connected)
  const repoConnected = Boolean(project.github?.connection.fullName)
  const bootstrapReady = repoConnected && !project.github?.bootstrap.issueNumber && !project.launch
  const canLaunch = project.status === 'in_progress' && !project.launch && project.deliveryStage === 'launch_ready'

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      <div className="container mx-auto max-w-6xl px-4 py-8">
        <div className="mb-8">
          <Link href="/project" className="mb-4 inline-block text-gray-400 hover:text-white">
            Back to Projects
          </Link>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex-1">
              <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
                <Badge label={project.status === 'launched' ? 'Launched' : 'In Progress'} tone="yellow" />
                <Badge label={PROJECT_DELIVERY_STAGE_LABELS[project.deliveryStage]} tone="cyan" />
                <Badge label={GITHUB_WORKFLOW_STATUS_LABELS[project.githubWorkflowStatus]} tone="blue" />
                <Badge label={`Sync: ${GITHUB_SYNC_STATUS_LABELS[project.githubSyncStatus]}`} tone="gray" />
                {project.idea && (
                  <Link href={`/idea/${project.idea.id}`} className="text-cyan-400 hover:text-cyan-300">
                    View Source Idea
                  </Link>
                )}
                {project.launch && (
                  <Link href={`/launch#${project.launch.id}`} className="text-emerald-400 hover:text-emerald-300">
                    View Launch
                  </Link>
                )}
              </div>

              <h1 className="mb-3 text-4xl font-bold">{project.title}</h1>
              <p className="max-w-3xl text-gray-400">
                {project.description || 'No project description provided.'}
              </p>
            </div>

            {canLaunch && canManageProject && (
              <button
                onClick={() => setShowLaunchDialog(true)}
                className="rounded-lg bg-emerald-600 px-6 py-3 font-medium text-white transition hover:bg-emerald-700"
              >
                Send to Launch
              </button>
            )}
          </div>
        </div>

        {(actionError || actionMessage) && (
          <div className="mb-6 space-y-3">
            {actionError && <Notice tone="error" message={actionError} />}
            {actionMessage && <Notice tone="success" message={actionMessage} />}
          </div>
        )}

        {showLaunchDialog && (
          <Dialog title="Create Launch" onClose={() => setShowLaunchDialog(false)}>
            <div className="space-y-4">
              <DialogField
                label="Product Name"
                value={launchForm.productName}
                onChange={(value) => setLaunchForm((prev) => ({ ...prev, productName: value }))}
              />
              <DialogField
                label="Tagline"
                value={launchForm.tagline}
                onChange={(value) => setLaunchForm((prev) => ({ ...prev, tagline: value }))}
              />
              <DialogField
                label="Demo URL"
                value={launchForm.demoUrl}
                onChange={(value) => setLaunchForm((prev) => ({ ...prev, demoUrl: value }))}
              />
            </div>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowLaunchDialog(false)}
                className="flex-1 rounded-lg bg-gray-700 px-4 py-2 font-medium hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={handleLaunch}
                disabled={launching}
                className="flex-1 rounded-lg bg-emerald-600 px-4 py-2 font-medium hover:bg-emerald-700 disabled:opacity-50"
              >
                {launching ? 'Launching...' : 'Create Launch'}
              </button>
            </div>
          </Dialog>
        )}

        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
            <section className="rounded-lg bg-gray-800/50 p-6">
              <h2 className="mb-4 text-xl font-semibold">Project Overview</h2>
              <p className="leading-relaxed text-gray-300">
                {project.description || 'No description provided.'}
              </p>
              {project.idea && (
                <div className="mt-6 rounded-lg border border-gray-700 bg-gray-900/40 p-4">
                  <div className="text-sm text-gray-400">Source Idea</div>
                  <Link href={`/idea/${project.idea.id}`} className="mt-1 block text-lg font-medium text-cyan-300 hover:text-cyan-200">
                    {project.idea.title}
                  </Link>
                  <p className="mt-2 text-sm text-gray-400">{project.idea.description}</p>
                </div>
              )}
            </section>

            <section className="rounded-lg bg-gray-800/50 p-6">
              <h2 className="mb-4 text-xl font-semibold">Project State</h2>
              <div className="grid gap-3">
                <InfoCard label="Owner" value={project.ownerName || 'Unknown owner'} />
                <InfoCard label="Delivery Stage" value={PROJECT_DELIVERY_STAGE_LABELS[project.deliveryStage]} />
                <InfoCard label="Workflow Status" value={GITHUB_WORKFLOW_STATUS_LABELS[project.githubWorkflowStatus]} />
                <InfoCard label="Agent Status" value={AGENT_GITHUB_STATUS_LABELS[project.agentGithubStatus]} />
                <InfoCard
                  label="Last Synced"
                  value={project.githubLastSyncedAt ? new Date(project.githubLastSyncedAt).toLocaleString() : 'Not yet'}
                />
              </div>
            </section>
          </div>

          <section className="rounded-lg bg-gray-800/50 p-6">
            <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-xl font-semibold">GitHub Execution Layer</h2>
                <p className="mt-1 text-sm text-gray-400">
                  Connect one repository, bootstrap the build workflow, and sync delivery activity back into OPC Platform.
                </p>
              </div>
              <div className="text-sm text-gray-400">
                {githubConnected
                  ? `Owner GitHub: @${project.githubConnection?.login}`
                  : 'Owner has not connected GitHub yet'}
              </div>
            </div>

            {!githubConnected && canManageProject && (
              <div className="rounded-lg border border-amber-700 bg-amber-900/20 p-4 text-sm text-amber-100">
                Connect GitHub in <Link href="/dashboard/settings" className="underline">Settings</Link> before binding a repository.
              </div>
            )}

            <div className="mt-4 grid gap-4 lg:grid-cols-[1.2fr_1fr]">
              <div className="space-y-4">
                {repoConnected && project.github ? (
                  <div className="rounded-lg border border-gray-700 bg-gray-900/30 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-sm text-gray-400">Connected Repository</div>
                        <div className="text-lg font-medium">{project.github.connection.fullName}</div>
                      </div>
                      {project.github.connection.url && (
                        <a
                          href={project.github.connection.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-cyan-400 hover:text-cyan-300"
                        >
                          Open Repository
                        </a>
                      )}
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      <InfoCard label="Default Branch" value={project.github.connection.defaultBranch || 'Unknown'} />
                      <InfoCard label="Open Issues" value={String(project.github.stats.openIssues)} />
                      <InfoCard label="Open PRs" value={String(project.github.stats.openPullRequests)} />
                      <InfoCard label="Commits Seen" value={String(project.github.stats.commitCount)} />
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <InfoCard
                        label="Primary Issue"
                        value={project.github.bootstrap.issueNumber ? `#${project.github.bootstrap.issueNumber}` : 'Not created'}
                      />
                      <InfoCard
                        label="Primary PR"
                        value={project.github.bootstrap.pullRequestNumber ? `#${project.github.bootstrap.pullRequestNumber}` : 'Not created'}
                      />
                    </div>

                    <div className="mt-4 flex flex-wrap gap-4 text-sm">
                      {project.github.bootstrap.issueUrl && (
                        <a href={project.github.bootstrap.issueUrl} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:text-emerald-300">
                          Open Issue
                        </a>
                      )}
                      {project.github.bootstrap.pullRequestUrl && (
                        <a href={project.github.bootstrap.pullRequestUrl} target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300">
                          Open Pull Request
                        </a>
                      )}
                      {project.github.stats.latestCommitUrl && (
                        <a href={project.github.stats.latestCommitUrl} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:text-cyan-300">
                          Latest Commit
                        </a>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border border-gray-700 bg-gray-900/30 p-4">
                    <div className="text-sm text-gray-400">Repository Binding</div>
                    <div className="mt-1 text-lg font-medium">No repository connected</div>
                    <p className="mt-2 text-sm text-gray-500">
                      Bind one GitHub repository to turn this project into a real execution workflow.
                    </p>
                  </div>
                )}

                {canManageProject && !repoConnected && (
                  <div className="rounded-lg border border-gray-700 bg-gray-900/30 p-4">
                    <h3 className="mb-4 text-lg font-medium">Connect Repository</h3>
                    <div className="grid gap-4 md:grid-cols-2">
                      <DialogField
                        label="Repository Owner"
                        value={repoForm.repoOwner}
                        onChange={(value) => setRepoForm((prev) => ({ ...prev, repoOwner: value }))}
                        placeholder="octocat"
                      />
                      <DialogField
                        label="Repository Name"
                        value={repoForm.repoName}
                        onChange={(value) => setRepoForm((prev) => ({ ...prev, repoName: value }))}
                        placeholder="hello-world"
                      />
                    </div>
                    <button
                      onClick={handleConnectRepo}
                      disabled={!githubConnected || connectingRepo}
                      className="mt-4 rounded-lg bg-cyan-600 px-5 py-2 font-medium text-white transition hover:bg-cyan-700 disabled:opacity-50"
                    >
                      {connectingRepo ? 'Connecting...' : 'Connect Repository'}
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="rounded-lg border border-gray-700 bg-gray-900/30 p-4">
                  <h3 className="text-lg font-medium">Workflow Actions</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Bootstrap the GitHub side once, then sync activity whenever you want fresh status.
                  </p>
                  <div className="mt-4 space-y-3">
                    <button
                      onClick={handleBootstrap}
                      disabled={!canManageProject || !bootstrapReady || bootstrapping}
                      className="w-full rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-purple-700 disabled:opacity-50"
                    >
                      {bootstrapping ? 'Bootstrapping...' : 'Start GitHub Workflow'}
                    </button>
                    <button
                      onClick={handleSync}
                      disabled={!canManageProject || !repoConnected || syncing}
                      className="w-full rounded-lg border border-gray-600 px-4 py-2 text-sm font-medium text-gray-200 transition hover:bg-gray-700 disabled:opacity-50"
                    >
                      {syncing ? 'Syncing...' : 'Sync GitHub Activity'}
                    </button>
                  </div>
                </div>

                {project.github?.stats.latestCommitMessage && (
                  <div className="rounded-lg border border-gray-700 bg-gray-900/30 p-4">
                    <div className="text-sm text-gray-400">Latest Commit</div>
                    <div className="mt-1 font-medium text-white">{project.github.stats.latestCommitMessage}</div>
                    <div className="mt-1 text-xs text-gray-500">{project.github.stats.latestCommitSha}</div>
                  </div>
                )}
              </div>
            </div>
          </section>

          {agentTeam.length > 0 && (
            <section className="rounded-lg bg-gray-800/50 p-6">
              <h2 className="mb-3 text-xl font-semibold">Agent Team</h2>
              <div className="grid gap-4 md:grid-cols-2">
                {agentTeam.map((agent, index) => (
                  <div key={`${agent.name}-${index}`} className="rounded-lg border border-purple-500/20 bg-purple-500/10 p-4">
                    <div className="font-medium">{agent.name}</div>
                    <div className="mt-1 text-sm text-gray-400">{agent.type}</div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="rounded-lg bg-gray-800/50 p-6">
              <h2 className="mb-4 text-xl font-semibold">GitHub Activity</h2>
              <div className="space-y-4">
                {project.githubActivity.length > 0 ? (
                  project.githubActivity.map((activity) => (
                    <TimelineRow
                      key={activity.id}
                      dateLabel={new Date(activity.createdAt).toLocaleString()}
                      title={activity.title}
                      description={
                        [
                          activity.authorLogin ? `@${activity.authorLogin}` : null,
                          activity.number ? `#${activity.number}` : null,
                          activity.status || null,
                        ]
                          .filter(Boolean)
                          .join(' • ') || 'GitHub activity'
                      }
                      url={activity.url}
                    />
                  ))
                ) : (
                  <p className="text-sm text-gray-500">No GitHub activity yet.</p>
                )}
              </div>
            </section>

            <section className="rounded-lg bg-gray-800/50 p-6">
              <h2 className="mb-4 text-xl font-semibold">Lifecycle Timeline</h2>
              <div className="space-y-4">
                {project.lifecycle.length > 0 ? (
                  project.lifecycle.map((event) => (
                    <TimelineRow
                      key={event.id}
                      dateLabel={new Date(event.createdAt).toLocaleString()}
                      title={event.title}
                      description={event.description || event.eventType}
                    />
                  ))
                ) : (
                  <p className="text-sm text-gray-500">No lifecycle events yet.</p>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  )
}

function Badge({ label, tone }: { label: string; tone: 'yellow' | 'cyan' | 'blue' | 'gray' }) {
  const className =
    tone === 'yellow'
      ? 'bg-yellow-500/20 text-yellow-300'
      : tone === 'cyan'
      ? 'bg-cyan-500/20 text-cyan-300'
      : tone === 'blue'
      ? 'bg-blue-500/20 text-blue-300'
      : 'bg-gray-700 text-gray-300'

  return <span className={`rounded px-3 py-1 ${className}`}>{label}</span>
}

function Notice({ tone, message }: { tone: 'error' | 'success'; message: string }) {
  return (
    <div
      className={`rounded-lg border px-4 py-3 text-sm ${
        tone === 'error'
          ? 'border-red-700 bg-red-900/40 text-red-200'
          : 'border-emerald-700 bg-emerald-900/40 text-emerald-200'
      }`}
    >
      {message}
    </div>
  )
}

function Dialog({
  title,
  children,
  onClose,
}: {
  title: string
  children: React.ReactNode
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-lg bg-gray-800 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            x
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

function DialogField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-2 focus:border-cyan-500 focus:outline-none"
      />
    </div>
  )
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-700 bg-gray-900/40 p-4">
      <div className="mb-1 text-sm text-gray-400">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  )
}

function TimelineRow({
  dateLabel,
  title,
  description,
  url,
}: {
  dateLabel: string
  title: string
  description: string
  url?: string | null
}) {
  const content = (
    <div className="rounded-lg border border-gray-700 bg-gray-900/40 p-4">
      <div className="text-xs text-gray-500">{dateLabel}</div>
      <div className="mt-1 font-medium text-white">{title}</div>
      <div className="mt-2 text-sm text-gray-400">{description}</div>
    </div>
  )

  if (!url) {
    return content
  }

  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="block transition hover:opacity-90">
      {content}
    </a>
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
