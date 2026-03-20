'use client'

import Link from 'next/link'
import { notFound, useParams, useRouter, useSearchParams } from 'next/navigation'
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
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const [project, setProject] = useState<ProjectDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const [connectingRepo, setConnectingRepo] = useState(false)
  const [disconnectingRepo, setDisconnectingRepo] = useState(false)
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
    const canParseCombinedRepo = repoForm.repoOwner.includes('/') && !repoForm.repoName
    if (!repoForm.repoOwner || (!repoForm.repoName && !canParseCombinedRepo)) {
      setActionError('Provide both repository owner and repository name, or paste owner/repo into the first field.')
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

  const handleDisconnectRepo = async () => {
    if (!project) return

    try {
      setDisconnectingRepo(true)
      setActionError(null)
      await runProjectAction(`/api/projects/${project.id}/github/connect`, undefined, {
        method: 'DELETE',
        successMessage: 'GitHub repository disconnected.',
      })
      setRepoForm({ repoOwner: '', repoName: '' })
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Failed to disconnect repository')
    } finally {
      setDisconnectingRepo(false)
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
      const launch = await runProjectAction(
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
      router.push(`/launch?created=1&highlight=${launch.id}`)
      router.refresh()
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
  const repoConnectionBlocker = getRepoConnectionBlocker(project, githubConnected)
  const repoDisconnectionBlocker = getRepoDisconnectionBlocker(project)
  const bootstrapBlocker = getBootstrapBlocker(project)
  const syncBlocker = getSyncBlocker(project)
  const launchBlocker = getLaunchBlocker(project)
  const bootstrapReady = bootstrapBlocker === null
  const canLaunch = project.status === 'in_progress' && !project.launch && project.deliveryStage === 'launch_ready'
  const nextAction = getNextAction(project, githubConnected)
  const launchChecklist = getLaunchChecklist(project)
  const latestSyncError = getLatestSyncError(project)
  const latestSnapshot = getLatestSnapshot(project)
  const onboardingMode = searchParams.get('onboarding') === '1'
  const claimedMode = searchParams.get('claimed') === '1'
  const githubConnectedMode = searchParams.get('github_connected') === '1'
  const githubConnectHref = `/api/integrations/github/connect?redirect=${encodeURIComponent(`/project/${project.id}?onboarding=1`)}`

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      <div className="container mx-auto max-w-6xl px-4 py-8">
        <div className="mb-8">
          <Link href="/project" className="mb-4 inline-block text-gray-400 hover:text-white">
            Back to Projects
          </Link>

          {(claimedMode || onboardingMode || githubConnectedMode) && (
            <div className="mb-6 rounded-xl border border-cyan-700/40 bg-cyan-900/20 p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="text-sm uppercase tracking-wide text-cyan-300">Execution onboarding</div>
                  <div className="mt-1 text-xl font-semibold text-white">
                    {claimedMode
                      ? 'Project claimed successfully'
                      : githubConnectedMode
                      ? 'GitHub connected successfully'
                      : 'Continue project execution setup'}
                  </div>
                  <p className="mt-2 text-sm text-cyan-100/80">
                    {claimedMode
                      ? 'You are now inside the execution flow. The next step is to connect GitHub, bind a repository, and create the first execution artifacts.'
                      : githubConnectedMode
                      ? 'GitHub is now connected. Bind a repository next so this project gets a real execution trail.'
                      : 'This page guides the first setup flow from repository connection to launch readiness.'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  {!githubConnected && (
                    <a
                      href={githubConnectHref}
                      className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-cyan-700"
                    >
                      Connect GitHub
                    </a>
                  )}
                  <Link
                    href="/dashboard"
                    className="rounded-lg border border-gray-600 px-4 py-2 text-sm font-medium text-gray-200 transition hover:bg-gray-800"
                  >
                    View onboarding dashboard
                  </Link>
                </div>
              </div>
            </div>
          )}

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
            {launchBlocker && <p className="mt-3 text-sm text-amber-300">{launchBlocker}</p>}
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
              <div className="mt-4 rounded-lg border border-cyan-700/40 bg-cyan-900/20 p-4">
                <div className="text-sm text-cyan-200">Recommended next step</div>
                <div className="mt-1 font-medium text-white">{nextAction.title}</div>
                <p className="mt-2 text-sm text-cyan-100/80">{nextAction.description}</p>
              </div>
              {latestSyncError && (
                <div className="mt-4 rounded-lg border border-red-700 bg-red-900/20 p-4">
                  <div className="text-sm text-red-200">Latest GitHub failure</div>
                  <div className="mt-1 font-medium text-white">{latestSyncError.title}</div>
                  <p className="mt-2 text-sm text-red-100/80">{latestSyncError.description}</p>
                </div>
              )}
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
                Connect GitHub with{' '}
                <a href={githubConnectHref} className="underline">
                  one click
                </a>{' '}
                before binding a repository.
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
                      <div className="flex flex-wrap items-center gap-3">
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
                        {canManageProject && (
                          <button
                            onClick={handleDisconnectRepo}
                            disabled={Boolean(repoDisconnectionBlocker) || disconnectingRepo}
                            className="rounded-lg border border-red-700 px-3 py-1.5 text-sm text-red-300 transition hover:bg-red-900/30 disabled:opacity-50"
                          >
                            {disconnectingRepo ? 'Disconnecting...' : 'Disconnect Repo'}
                          </button>
                        )}
                      </div>
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

                    {canManageProject && (
                      <p className={`mt-4 text-sm ${repoDisconnectionBlocker ? 'text-amber-300' : 'text-gray-500'}`}>
                        {repoDisconnectionBlocker ||
                          'You can disconnect and replace this repository until GitHub bootstrap artifacts are created.'}
                      </p>
                    )}

                    <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      <ChecklistPill label="GitHub account" complete={githubConnected} />
                      <ChecklistPill label="Repository connected" complete={repoConnected} />
                      <ChecklistPill
                        label="Bootstrap created"
                        complete={Boolean(project.github.bootstrap.issueNumber && project.github.bootstrap.pullRequestNumber)}
                      />
                      <ChecklistPill
                        label="Launch ready"
                        complete={project.deliveryStage === 'launch_ready' || project.deliveryStage === 'launched'}
                      />
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
                        placeholder="octocat or octocat/hello-world"
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
                      disabled={Boolean(repoConnectionBlocker) || connectingRepo}
                      className="mt-4 rounded-lg bg-cyan-600 px-5 py-2 font-medium text-white transition hover:bg-cyan-700 disabled:opacity-50"
                    >
                      {connectingRepo ? 'Connecting...' : 'Connect Repository'}
                    </button>
                    {repoConnectionBlocker ? (
                      <p className="mt-3 text-sm text-amber-300">{repoConnectionBlocker}</p>
                    ) : (
                      <p className="mt-3 text-sm text-gray-500">You can enter separate fields, or paste `owner/repo` into the first field.</p>
                    )}
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
                    {!canManageProject ? (
                      <p className="text-sm text-gray-500">Only the project owner can create the GitHub bootstrap workflow.</p>
                    ) : bootstrapBlocker ? (
                      <p className="text-sm text-amber-300">{bootstrapBlocker}</p>
                    ) : (
                      <p className="text-sm text-gray-500">This creates the primary issue, bootstrap branch, and first pull request in GitHub.</p>
                    )}
                    <button
                      onClick={handleSync}
                      disabled={!canManageProject || Boolean(syncBlocker) || syncing}
                      className="w-full rounded-lg border border-gray-600 px-4 py-2 text-sm font-medium text-gray-200 transition hover:bg-gray-700 disabled:opacity-50"
                    >
                      {syncing ? 'Syncing...' : 'Sync GitHub Activity'}
                    </button>
                    {!canManageProject ? (
                      <p className="text-sm text-gray-500">Only the project owner can sync GitHub activity back into OPC.</p>
                    ) : syncBlocker ? (
                      <p className="text-sm text-amber-300">{syncBlocker}</p>
                    ) : (
                      <p className="text-sm text-gray-500">Use sync whenever you want current commit, issue, PR, workflow, and release status.</p>
                    )}
                  </div>
                </div>

                {project.github?.stats.latestCommitMessage && (
                  <div className="rounded-lg border border-gray-700 bg-gray-900/30 p-4">
                    <div className="text-sm text-gray-400">Latest Commit</div>
                    <div className="mt-1 font-medium text-white">{project.github.stats.latestCommitMessage}</div>
                    <div className="mt-1 text-xs text-gray-500">{project.github.stats.latestCommitSha}</div>
                  </div>
                )}

                {latestSnapshot && (
                  <div className="rounded-lg border border-gray-700 bg-gray-900/30 p-4">
                    <div className="text-sm text-gray-400">Last Sync Snapshot</div>
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <InfoCard label="Workflow Runs" value={String(latestSnapshot.workflowRuns)} />
                      <InfoCard label="Tracked Commits" value={String(latestSnapshot.commitCount)} />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-4 text-sm">
                      {latestSnapshot.latestMergedPullRequestUrl && (
                        <a href={latestSnapshot.latestMergedPullRequestUrl} target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300">
                          Latest Merged PR
                        </a>
                      )}
                      {latestSnapshot.latestReleaseUrl && (
                        <a href={latestSnapshot.latestReleaseUrl} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:text-emerald-300">
                          Latest Release
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="rounded-lg bg-gray-800/50 p-6">
            <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-xl font-semibold">Launch Readiness</h2>
                <p className="mt-1 text-sm text-gray-400">
                  OPC only opens launch after the GitHub execution trail is complete and current.
                </p>
              </div>
              <div className={`text-sm ${launchBlocker ? 'text-amber-300' : 'text-emerald-300'}`}>
                {launchBlocker ? 'Launch is locked' : 'Launch can be created now'}
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {launchChecklist.map((item) => (
                <ChecklistCard
                  key={item.label}
                  label={item.label}
                  description={item.description}
                  complete={item.complete}
                />
              ))}
            </div>

            {launchBlocker && (
              <p className="mt-4 text-sm text-amber-300">{launchBlocker}</p>
            )}
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
                          .join(' | ') || 'GitHub activity'
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

function ChecklistPill({ label, complete }: { label: string; complete: boolean }) {
  return (
    <div
      className={`rounded-lg border px-3 py-2 text-sm ${
        complete
          ? 'border-emerald-700 bg-emerald-900/20 text-emerald-200'
          : 'border-gray-700 bg-gray-950/40 text-gray-400'
      }`}
    >
      {label}: {complete ? 'Done' : 'Pending'}
    </div>
  )
}

function ChecklistCard({
  label,
  description,
  complete,
}: {
  label: string
  description: string
  complete: boolean
}) {
  return (
    <div
      className={`rounded-lg border p-4 ${
        complete
          ? 'border-emerald-700 bg-emerald-900/20'
          : 'border-amber-700 bg-amber-900/20'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="font-medium text-white">{label}</div>
        <span
          className={`rounded-full border px-2 py-0.5 text-xs ${
            complete
              ? 'border-emerald-500 text-emerald-200'
              : 'border-amber-500 text-amber-200'
          }`}
        >
          {complete ? 'Ready' : 'Pending'}
        </span>
      </div>
      <p className="mt-2 text-sm text-gray-300">{description}</p>
    </div>
  )
}

function getRepoConnectionBlocker(project: ProjectDto, githubConnected: boolean) {
  if (!githubConnected) {
    return 'Connect your GitHub account in Settings before binding a repository.'
  }

  if (project.status === 'launched') {
    return 'Launched projects keep their repository history locked for provenance.'
  }

  if (project.githubPrimaryIssueNumber || project.githubPrimaryPrNumber) {
    return 'This project already created GitHub bootstrap artifacts, so the connected repository is fixed.'
  }

  return null
}

function getRepoDisconnectionBlocker(project: ProjectDto) {
  if (!project.githubRepoFullName) {
    return 'No repository is connected yet.'
  }

  if (project.status === 'launched') {
    return 'Launched projects keep their repository history locked.'
  }

  if (project.githubPrimaryIssueNumber || project.githubPrimaryPrNumber) {
    return 'Bootstrap already created issue or PR artifacts, so this repository should stay attached.'
  }

  return null
}

function getBootstrapBlocker(project: ProjectDto) {
  if (!project.githubRepoFullName) {
    return 'Connect a GitHub repository before starting the workflow.'
  }

  if (project.status === 'launched') {
    return 'Launched projects cannot start a new GitHub workflow.'
  }

  if (project.githubPrimaryIssueNumber || project.githubPrimaryPrNumber) {
    return 'GitHub bootstrap already exists for this project.'
  }

  return null
}

function getSyncBlocker(project: ProjectDto) {
  if (!project.githubRepoFullName) {
    return 'Connect a GitHub repository before running sync.'
  }

  if (project.status === 'launched') {
    return 'Launched projects are read-only in OPC.'
  }

  return null
}

function getLaunchBlocker(project: ProjectDto) {
  if (project.launch) {
    return 'This project already has a launch entry.'
  }

  if (!project.githubRepoFullName || !project.githubUrl) {
    return 'Connect a visible GitHub repository before launch.'
  }

  if (!project.githubPrimaryIssueNumber || !project.githubPrimaryPrNumber) {
    return 'Create the GitHub bootstrap issue and pull request before launch.'
  }

  if (!project.githubLastSyncedAt) {
    return 'Run GitHub sync once before launch so OPC has current execution data.'
  }

  if (project.githubSyncStatus === 'error') {
    return 'Fix the GitHub sync error and run a successful sync before launch.'
  }

  if (project.githubWorkflowStatus !== 'ready_for_launch') {
    return 'GitHub workflow has not reached a launch-ready state yet.'
  }

  if (project.deliveryStage !== 'launch_ready') {
    return 'Launch opens after GitHub activity reaches the launch-ready state.'
  }

  return null
}

function getLaunchChecklist(project: ProjectDto) {
  return [
    {
      label: 'Repository connected',
      description: 'One public repository is attached to this project.',
      complete: Boolean(project.githubRepoFullName && project.githubUrl),
    },
    {
      label: 'Bootstrap created',
      description: 'The primary GitHub issue and pull request exist.',
      complete: Boolean(project.githubPrimaryIssueNumber && project.githubPrimaryPrNumber),
    },
    {
      label: 'Synced from GitHub',
      description: 'OPC has a recent GitHub snapshot for this project.',
      complete: Boolean(project.githubLastSyncedAt) && project.githubSyncStatus !== 'error',
    },
    {
      label: 'Workflow is launch ready',
      description: 'GitHub activity has reached the ready-for-launch state.',
      complete: project.githubWorkflowStatus === 'ready_for_launch',
    },
    {
      label: 'Delivery stage confirmed',
      description: 'OPC marked the project as launch-ready, not just in progress.',
      complete: project.deliveryStage === 'launch_ready' || project.deliveryStage === 'launched',
    },
    {
      label: 'No launch exists yet',
      description: 'Launch creation is only available once per project.',
      complete: !project.launch,
    },
  ]
}

function getLatestSyncError(project: ProjectDto) {
  const syncFailure = [...project.lifecycle]
    .reverse()
    .find((event) => event.eventType === 'github_sync_failed')

  if (!syncFailure) {
    return null
  }

  return {
    title: syncFailure.title,
    description: syncFailure.description || 'GitHub sync failed and needs attention.',
  }
}

function getLatestSnapshot(project: ProjectDto) {
  const snapshot = project.githubActivity.find((activity) => activity.eventType === 'sync_snapshot')
  if (!snapshot?.metadata) {
    return null
  }

  return {
    workflowRuns: Number(snapshot.metadata.workflowRuns || 0),
    commitCount: Number(snapshot.metadata.commitCount || 0),
    latestMergedPullRequestUrl:
      typeof snapshot.metadata.latestMergedPullRequestUrl === 'string'
        ? snapshot.metadata.latestMergedPullRequestUrl
        : null,
    latestReleaseUrl:
      typeof snapshot.metadata.latestReleaseUrl === 'string'
        ? snapshot.metadata.latestReleaseUrl
        : null,
  }
}

function getNextAction(project: ProjectDto, githubConnected: boolean) {
  if (!githubConnected) {
    return {
      title: 'Connect GitHub in Settings',
      description: 'The owner account needs GitHub OAuth before this project can bind a repository or create bootstrap artifacts.',
    }
  }

  if (!project.githubRepoFullName) {
    return {
      title: 'Bind the project repository',
      description: 'Connect one repository to establish the single development source of truth for this project.',
    }
  }

  if (!project.githubPrimaryIssueNumber || !project.githubPrimaryPrNumber) {
    return {
      title: 'Start the GitHub workflow',
      description: 'Create the primary issue, bootstrap branch, and first pull request so development activity can be tracked from OPC.',
    }
  }

  if (project.deliveryStage === 'launch_ready' && !project.launch) {
    return {
      title: 'Send this project to Launch',
      description: 'GitHub activity already marked the project as ready. Create the launch entry while the delivery history is fresh.',
    }
  }

  if (project.launch) {
    return {
      title: 'Monitor launch performance',
      description: 'The build already launched. Use the timeline and launch page as the public provenance record.',
    }
  }

  return {
    title: 'Keep GitHub activity in sync',
    description: 'Use manual sync after meaningful repo changes so OPC reflects the latest execution state and launch readiness.',
  }
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
