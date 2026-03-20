'use client'

import Link from 'next/link'
import { notFound, useParams, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import {
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

  useEffect(() => {
    if (!project) {
      return
    }

    const shouldClear =
      searchParams.get('claimed') === '1' ||
      searchParams.get('github_connected') === '1'

    if (!shouldClear) {
      return
    }

    const nextParams = new URLSearchParams(searchParams.toString())
    nextParams.delete('claimed')
    nextParams.delete('github_connected')
    const query = nextParams.toString()
    router.replace(query ? `/project/${params.id}?${query}` : `/project/${params.id}`, {
      scroll: false,
    })
  }, [params.id, project, router, searchParams])

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
  const executionSteps = [
    {
      id: 'github_account',
      order: 1,
      title: 'Connect GitHub account',
      description: 'Authorize GitHub once so OPC can work with repositories on your behalf.',
      complete: githubConnected,
      actionLabel: 'Connect GitHub',
      href: githubConnectHref,
      blocker: githubConnected ? null : null,
    },
    {
      id: 'repository',
      order: 2,
      title: 'Bind project repository',
      description: 'Choose one repository as the single source of truth for this build.',
      complete: repoConnected,
      actionLabel: 'Connect repository below',
      href: '#execution-layer',
      blocker: repoConnectionBlocker,
    },
    {
      id: 'bootstrap',
      order: 3,
      title: 'Create bootstrap issue and PR',
      description: 'Generate the first issue, branch, and pull request from OPC.',
      complete: Boolean(project.githubPrimaryIssueNumber && project.githubPrimaryPrNumber),
      actionLabel: bootstrapping ? 'Bootstrapping...' : 'Start bootstrap',
      blocker: bootstrapBlocker,
      onClick: handleBootstrap,
      disabled: !canManageProject || Boolean(bootstrapBlocker) || bootstrapping,
    },
    {
      id: 'sync',
      order: 4,
      title: 'Sync GitHub execution data',
      description: 'Pull commits, PR state, workflows, and releases back into OPC.',
      complete: Boolean(project.githubLastSyncedAt) && project.githubSyncStatus !== 'error',
      actionLabel: syncing ? 'Syncing...' : 'Run sync',
      blocker: syncBlocker,
      onClick: handleSync,
      disabled: !canManageProject || Boolean(syncBlocker) || syncing,
    },
    {
      id: 'launch',
      order: 5,
      title: 'Create launch entry',
      description: 'Once GitHub reaches launch-ready state, publish the build to the launch board.',
      complete: Boolean(project.launch),
      actionLabel: 'Open launch dialog',
      blocker: launchBlocker,
      onClick: () => setShowLaunchDialog(true),
      disabled: !canManageProject || Boolean(launchBlocker),
    },
  ]
  const completedStepCount = executionSteps.filter((step) => step.complete).length
  const latestActivity = project.githubActivity[0] || null
  const recentLifecycle = project.lifecycle.slice(-4).reverse()
  const executionHealth = latestSyncError
    ? {
        label: 'Needs attention',
        description: latestSyncError.description,
        tone: 'warn' as const,
      }
    : launchBlocker
    ? {
        label: 'In setup',
        description: launchBlocker,
        tone: 'neutral' as const,
      }
    : {
        label: 'Launch ready',
        description: 'The GitHub execution trail is healthy and this project can be launched now.',
        tone: 'good' as const,
      }
  const commandDeck = [
    { label: 'Owner', value: project.ownerName || 'Unknown owner' },
    { label: 'Delivery Stage', value: PROJECT_DELIVERY_STAGE_LABELS[project.deliveryStage] },
    { label: 'Workflow Status', value: GITHUB_WORKFLOW_STATUS_LABELS[project.githubWorkflowStatus] },
    { label: 'Last Synced', value: project.githubLastSyncedAt ? new Date(project.githubLastSyncedAt).toLocaleString() : 'Not yet' },
  ]

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

        <section className="mb-6 rounded-xl border border-gray-700 bg-gray-800/60 p-6">
          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">Execution overview</h2>
              <p className="mt-1 text-sm text-gray-400">
                This workbench tracks the live path from project intake to GitHub execution to launch.
              </p>
            </div>
            <div className="text-sm text-cyan-300">
              {completedStepCount}/{executionSteps.length} milestones complete
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <InfoCard label="Owner access" value={canManageProject ? 'You can operate this project' : 'Read-only view'} />
            <InfoCard label="Repository" value={repoConnected ? 'Connected' : 'Not connected'} />
            <InfoCard
              label="Bootstrap"
              value={project.githubPrimaryIssueNumber && project.githubPrimaryPrNumber ? 'Created' : 'Pending'}
            />
            <InfoCard label="Launch gate" value={launchBlocker ? 'Locked' : 'Open'} />
          </div>

          <div className="mt-4 rounded-lg border border-cyan-700/40 bg-cyan-900/20 p-4">
            <div className="text-sm text-cyan-200">Current operator guidance</div>
            <div className="mt-1 font-medium text-white">{nextAction.title}</div>
            <p className="mt-2 text-sm text-cyan-100/80">{nextAction.description}</p>
          </div>
        </section>

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
          <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <div className="rounded-xl border border-gray-700 bg-gray-800/50 p-6">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="text-sm uppercase tracking-wide text-cyan-300">Project Command Deck</div>
                  <h2 className="mt-1 text-2xl font-semibold text-white">{nextAction.title}</h2>
                  <p className="mt-2 max-w-2xl text-sm text-gray-300">{nextAction.description}</p>
                </div>
                <div
                  className={`rounded-full border px-3 py-1 text-sm ${
                    executionHealth.tone === 'good'
                      ? 'border-emerald-700 bg-emerald-900/20 text-emerald-200'
                      : executionHealth.tone === 'warn'
                      ? 'border-amber-700 bg-amber-900/20 text-amber-200'
                      : 'border-gray-700 bg-gray-900/40 text-gray-300'
                  }`}
                >
                  {executionHealth.label}
                </div>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {commandDeck.map((item) => (
                  <InfoCard key={item.label} label={item.label} value={item.value} />
                ))}
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <SummaryPanel
                  eyebrow="Project brief"
                  title={project.idea ? 'This project came from a source idea' : 'This is a direct project record'}
                  description={project.description || 'No project description provided.'}
                >
                  {project.idea && (
                    <Link href={`/idea/${project.idea.id}`} className="text-cyan-400 hover:text-cyan-300">
                      Open source idea: {project.idea.title}
                    </Link>
                  )}
                </SummaryPanel>
                <SummaryPanel
                  eyebrow="Execution health"
                  title={executionHealth.label}
                  description={executionHealth.description}
                >
                  {latestActivity && <span className="text-gray-400">Latest GitHub signal: {latestActivity.title}</span>}
                </SummaryPanel>
              </div>

              {latestSyncError && (
                <div className="mt-4 rounded-lg border border-red-700 bg-red-900/20 p-4">
                  <div className="text-sm text-red-200">Latest GitHub failure</div>
                  <div className="mt-1 font-medium text-white">{latestSyncError.title}</div>
                  <p className="mt-2 text-sm text-red-100/80">{latestSyncError.description}</p>
                </div>
              )}
            </div>

            <div className="space-y-6">
              <section className="rounded-xl border border-gray-700 bg-gray-800/50 p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-sm uppercase tracking-wide text-cyan-300">Execution progress</div>
                    <h2 className="mt-1 text-xl font-semibold text-white">
                      {completedStepCount}/{executionSteps.length} milestones complete
                    </h2>
                  </div>
                  {canLaunch && canManageProject && (
                    <button
                      onClick={() => setShowLaunchDialog(true)}
                      className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
                    >
                      Send to Launch
                    </button>
                  )}
                </div>
                <div className="mt-5 space-y-3">
                  {executionSteps.map((step) => (
                    <ExecutionLaneRow
                      key={step.id}
                      stepNumber={step.order}
                      title={step.title}
                      description={step.description}
                      complete={step.complete}
                      blocker={step.blocker}
                    />
                  ))}
                </div>
              </section>

              {agentTeam.length > 0 && (
                <section className="rounded-xl border border-gray-700 bg-gray-800/50 p-6">
                  <h2 className="text-xl font-semibold text-white">Agent Team</h2>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    {agentTeam.map((agent, index) => (
                      <div key={`${agent.name}-${index}`} className="rounded-lg border border-purple-500/20 bg-purple-500/10 p-4">
                        <div className="font-medium">{agent.name}</div>
                        <div className="mt-1 text-sm text-gray-400">{agent.type}</div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          </div>

          <section id="execution-layer" className="rounded-xl border border-gray-700 bg-gray-800/50 p-6">
            <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="text-sm uppercase tracking-wide text-cyan-300">Execution Workspace</div>
                <h2 className="mt-1 text-2xl font-semibold text-white">GitHub delivery control</h2>
                <p className="mt-2 text-sm text-gray-400">
                  This is the operational bridge between project intake and launch: connect GitHub, bind one repo, bootstrap, sync, and confirm readiness.
                </p>
              </div>
              <div className="text-sm text-gray-400">
                {githubConnected
                  ? `Owner GitHub: @${project.githubConnection?.login}`
                  : 'Owner GitHub is not connected yet'}
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

            <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
              <div className="space-y-4">
                {repoConnected && project.github ? (
                  <div className="rounded-lg border border-gray-700 bg-gray-900/30 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="text-sm text-gray-400">Connected repository</div>
                        <div className="mt-1 text-lg font-medium text-white">{project.github.connection.fullName}</div>
                        <div className="mt-2 flex flex-wrap gap-2">
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
                      <div className="flex flex-wrap items-center gap-3">
                        {project.github.connection.url && (
                          <a
                            href={project.github.connection.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-cyan-400 hover:text-cyan-300"
                          >
                            Open repository
                          </a>
                        )}
                        {canManageProject && (
                          <button
                            onClick={handleDisconnectRepo}
                            disabled={Boolean(repoDisconnectionBlocker) || disconnectingRepo}
                            className="rounded-lg border border-red-700 px-3 py-1.5 text-sm text-red-300 transition hover:bg-red-900/30 disabled:opacity-50"
                          >
                            {disconnectingRepo ? 'Disconnecting...' : 'Disconnect repo'}
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
                          Bootstrap issue
                        </a>
                      )}
                      {project.github.bootstrap.pullRequestUrl && (
                        <a href={project.github.bootstrap.pullRequestUrl} target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300">
                          Bootstrap pull request
                        </a>
                      )}
                      {project.github.stats.latestCommitUrl && (
                        <a href={project.github.stats.latestCommitUrl} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:text-cyan-300">
                          Latest commit
                        </a>
                      )}
                    </div>

                    {canManageProject && (
                      <p className={`mt-4 text-sm ${repoDisconnectionBlocker ? 'text-amber-300' : 'text-gray-500'}`}>
                        {repoDisconnectionBlocker ||
                          'You can disconnect and replace this repository until GitHub bootstrap artifacts are created.'}
                      </p>
                    )}

                  </div>
                ) : (
                  <SummaryPanel
                    eyebrow="Repository binding"
                    title="No repository connected"
                    description="Bind one GitHub repository to turn this project into a traceable execution workflow."
                  />
                )}

                {canManageProject && !repoConnected && (
                  <div className="rounded-lg border border-gray-700 bg-gray-900/30 p-4">
                    <h3 className="text-lg font-medium text-white">Connect repository</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Enter separate fields, or paste `owner/repo` into the first field.
                    </p>
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
                    {repoConnectionBlocker && <p className="mt-3 text-sm text-amber-300">{repoConnectionBlocker}</p>}
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <ActionCard
                  title="Bootstrap GitHub workflow"
                  description="Create the primary issue, bootstrap branch, and first pull request from OPC."
                  actionLabel={bootstrapping ? 'Bootstrapping...' : 'Start GitHub Workflow'}
                  onClick={handleBootstrap}
                  disabled={!canManageProject || !bootstrapReady || bootstrapping}
                  hint={
                    !canManageProject
                      ? 'Only the project owner can create the GitHub bootstrap workflow.'
                      : bootstrapBlocker || 'Run this once after the repository is connected.'
                  }
                  tone="purple"
                />
                <ActionCard
                  title="Sync GitHub activity"
                  description="Pull commits, issue state, pull requests, workflow runs, and releases back into OPC."
                  actionLabel={syncing ? 'Syncing...' : 'Sync GitHub Activity'}
                  onClick={handleSync}
                  disabled={!canManageProject || Boolean(syncBlocker) || syncing}
                  hint={
                    !canManageProject
                      ? 'Only the project owner can sync GitHub activity back into OPC.'
                      : syncBlocker || 'Use sync after meaningful repository changes to refresh launch status.'
                  }
                  tone="gray"
                />

                {project.github?.stats.latestCommitMessage && (
                  <SummaryPanel
                    eyebrow="Latest commit"
                    title={project.github.stats.latestCommitMessage}
                    description={project.github.stats.latestCommitSha || 'No SHA available'}
                  >
                    {project.github.stats.latestCommitUrl && (
                      <a href={project.github.stats.latestCommitUrl} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:text-cyan-300">
                        Open commit
                      </a>
                    )}
                  </SummaryPanel>
                )}

                {latestSnapshot && (
                  <div className="rounded-lg border border-gray-700 bg-gray-900/30 p-4">
                    <div className="text-sm text-gray-400">Latest sync snapshot</div>
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <InfoCard label="Workflow Runs" value={String(latestSnapshot.workflowRuns)} />
                      <InfoCard label="Tracked Commits" value={String(latestSnapshot.commitCount)} />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-4 text-sm">
                      {latestSnapshot.latestMergedPullRequestUrl && (
                        <a href={latestSnapshot.latestMergedPullRequestUrl} target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300">
                          Latest merged PR
                        </a>
                      )}
                      {latestSnapshot.latestReleaseUrl && (
                        <a href={latestSnapshot.latestReleaseUrl} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:text-emerald-300">
                          Latest release
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-gray-700 bg-gray-800/50 p-6">
            <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="text-sm uppercase tracking-wide text-cyan-300">Launch gate</div>
                <h2 className="mt-1 text-2xl font-semibold text-white">Launch readiness</h2>
                <p className="mt-2 text-sm text-gray-400">
                  OPC only opens launch after the GitHub execution trail is complete, current, and publicly attributable.
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

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="rounded-xl border border-gray-700 bg-gray-800/50 p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm uppercase tracking-wide text-cyan-300">GitHub evidence</div>
                  <h2 className="mt-1 text-2xl font-semibold text-white">Recent activity</h2>
                </div>
                {latestActivity && (
                  <div className="text-sm text-gray-500">
                    Latest: {new Date(latestActivity.createdAt).toLocaleString()}
                  </div>
                )}
              </div>
              <div className="mt-5 space-y-4">
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

            <section className="rounded-xl border border-gray-700 bg-gray-800/50 p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm uppercase tracking-wide text-cyan-300">Product provenance</div>
                  <h2 className="mt-1 text-2xl font-semibold text-white">Lifecycle timeline</h2>
                </div>
                <div className="text-sm text-gray-500">{recentLifecycle.length} recent milestones</div>
              </div>
              <div className="mt-5 space-y-4">
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

function SummaryPanel({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string
  title: string
  description: string
  children?: React.ReactNode
}) {
  return (
    <div className="rounded-lg border border-gray-700 bg-gray-900/30 p-4">
      <div className="text-sm text-gray-400">{eyebrow}</div>
      <div className="mt-1 text-lg font-medium text-white">{title}</div>
      <p className="mt-2 text-sm text-gray-400">{description}</p>
      {children && <div className="mt-3 text-sm">{children}</div>}
    </div>
  )
}

function ActionCard({
  title,
  description,
  actionLabel,
  onClick,
  disabled,
  hint,
  tone,
}: {
  title: string
  description: string
  actionLabel: string
  onClick: () => void
  disabled: boolean
  hint: string
  tone: 'purple' | 'gray'
}) {
  return (
    <div className="rounded-lg border border-gray-700 bg-gray-900/30 p-4">
      <div className="text-lg font-medium text-white">{title}</div>
      <p className="mt-1 text-sm text-gray-500">{description}</p>
      <button
        onClick={onClick}
        disabled={disabled}
        className={`mt-4 w-full rounded-lg px-4 py-2 text-sm font-medium text-white transition disabled:opacity-50 ${
          tone === 'purple'
            ? 'bg-purple-600 hover:bg-purple-700'
            : 'border border-gray-600 bg-transparent text-gray-200 hover:bg-gray-700'
        }`}
      >
        {actionLabel}
      </button>
      <p className={`mt-3 text-sm ${disabled ? 'text-amber-300' : 'text-gray-500'}`}>{hint}</p>
    </div>
  )
}

function ExecutionLaneRow({
  stepNumber,
  title,
  description,
  complete,
  blocker,
}: {
  stepNumber: number
  title: string
  description: string
  complete: boolean
  blocker?: string | null
}) {
  return (
    <div className="rounded-lg border border-gray-700 bg-gray-900/35 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="rounded-full border border-gray-600 px-2 py-0.5 text-xs text-gray-300">
            Step {stepNumber}
          </span>
          <div className="font-medium text-white">{title}</div>
        </div>
        <span
          className={`rounded-full border px-2 py-0.5 text-xs ${
            complete
              ? 'border-emerald-500 text-emerald-200'
              : 'border-amber-500 text-amber-200'
          }`}
        >
          {complete ? 'Done' : 'Pending'}
        </span>
      </div>
      <p className="mt-2 text-sm text-gray-400">{description}</p>
      {!complete && blocker && <p className="mt-2 text-sm text-amber-300">{blocker}</p>}
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
