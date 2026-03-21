'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import DashboardEmptyState from '@/components/dashboard/DashboardEmptyState'
import { useDashboardExecutionState } from '@/hooks/useDashboardExecutionState'
import { getUserOnboardingState } from '@/lib/projects/onboarding'
import {
  GITHUB_WORKFLOW_STATUS_LABELS,
  PROJECT_DELIVERY_STAGE_LABELS,
  type GithubWorkflowStatus,
  type ProjectDeliveryStage,
} from '@/lib/project-stage'
import type { ProjectDto } from '@/types/projects'

export default function MyProjectsPage() {
  const { user } = useAuth()
  const { githubStatus } = useDashboardExecutionState()
  const [projects, setProjects] = useState<ProjectDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deliveryFilter, setDeliveryFilter] = useState<'all' | ProjectDeliveryStage>('all')
  const [workflowFilter, setWorkflowFilter] = useState<'all' | GithubWorkflowStatus>('all')

  useEffect(() => {
    if (user) {
      void fetchProjects()
    }
  }, [user])

  const fetchProjects = async () => {
    if (!user) return

    try {
      setLoading(true)
      const response = await fetch(`/api/projects?userId=${user.id}`)
      if (!response.ok) throw new Error('Failed to fetch projects')

      const data: ProjectDto[] = await response.json()
      setProjects(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch projects')
    } finally {
      setLoading(false)
    }
  }

  const deleteProject = async (projectId: string) => {
    if (!confirm('Are you sure you want to delete this project?')) return

    try {
      const response = await fetch(`/api/projects/${projectId}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Failed to delete project')
      await fetchProjects()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete project')
    }
  }

  if (!user) {
    return (
      <div className="py-12 text-center">
        <p className="text-[color:var(--opc-muted)]">Please login to view your projects</p>
      </div>
    )
  }

  if (loading) {
    return <div className="py-12 text-center text-[color:var(--opc-muted)]">Loading...</div>
  }

  const filteredProjects = projects.filter((project) => {
    const deliveryMatches = deliveryFilter === 'all' || project.deliveryStage === deliveryFilter
    const workflowMatches = workflowFilter === 'all' || project.githubWorkflowStatus === workflowFilter
    return deliveryMatches && workflowMatches
  })

  const stats = {
    total: projects.length,
    repoConnected: projects.filter((project) => Boolean(project.githubRepoFullName)).length,
    launchReady: projects.filter((project) => project.deliveryStage === 'launch_ready').length,
    blocked: projects.filter((project) => project.githubWorkflowStatus === 'blocked').length,
  }

  const actionQueue = {
    connectRepo: projects.filter((project) => !project.githubRepoFullName).length,
    bootstrap: projects.filter(
      (project) =>
        Boolean(project.githubRepoFullName) &&
        !project.githubPrimaryIssueNumber &&
        !project.githubPrimaryPrNumber
    ).length,
    readyToLaunch: projects.filter((project) => project.deliveryStage === 'launch_ready' && !project.launch).length,
  }
  const onboarding = getUserOnboardingState(projects, Boolean(githubStatus?.connection.connected))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">My Projects</h1>
        <p className="mt-1 text-sm text-[color:var(--opc-muted)]">
          Track project prep, GitHub execution, and launch readiness in one place.
        </p>
      </div>

      <div className="opc-panel-green rounded-lg p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="opc-kicker text-sm">Current onboarding step</div>
            <div className="mt-1 text-lg font-medium text-white">{onboarding.title}</div>
            <p className="mt-1 text-sm text-gray-300">{onboarding.description}</p>
          </div>
          <Link
            href={onboarding.ctaHref}
            className="opc-button-primary px-4 py-2 text-sm"
          >
            {onboarding.ctaLabel}
          </Link>
        </div>
      </div>

      {error && (
        <div className="flex items-center justify-between rounded-lg border border-red-700 bg-red-900/50 px-4 py-3 text-red-200">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-300 hover:text-red-100">
            x
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard label="Total" value={stats.total} />
        <StatCard label="Repo Connected" value={stats.repoConnected} />
        <StatCard label="Launch Ready" value={stats.launchReady} />
        <StatCard label="Blocked" value={stats.blocked} />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <ActionCard
          label="Need repository"
          value={actionQueue.connectRepo}
          description="Projects waiting for their first GitHub repo connection."
        />
        <ActionCard
          label="Need bootstrap"
          value={actionQueue.bootstrap}
          description="Projects with a repo but no issue or pull request created yet."
        />
        <ActionCard
          label="Ready to launch"
          value={actionQueue.readyToLaunch}
          description="Projects that can be sent into the launch board right now."
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <SelectFilter
          label="Delivery Stage"
          value={deliveryFilter}
          onChange={(value) => setDeliveryFilter(value as typeof deliveryFilter)}
          options={[
            { value: 'all', label: 'All Stages' },
            { value: 'project', label: PROJECT_DELIVERY_STAGE_LABELS.project },
            { value: 'agent_github', label: PROJECT_DELIVERY_STAGE_LABELS.agent_github },
            { value: 'launch_ready', label: PROJECT_DELIVERY_STAGE_LABELS.launch_ready },
            { value: 'launched', label: PROJECT_DELIVERY_STAGE_LABELS.launched },
          ]}
        />
        <SelectFilter
          label="GitHub Workflow"
          value={workflowFilter}
          onChange={(value) => setWorkflowFilter(value as typeof workflowFilter)}
          options={[
            { value: 'all', label: 'All Workflow States' },
            ...Object.entries(GITHUB_WORKFLOW_STATUS_LABELS).map(([value, label]) => ({ value, label })),
          ]}
        />
      </div>

      <div className="opc-panel overflow-hidden rounded-lg">
        {filteredProjects.length === 0 ? (
          projects.length === 0 ? (
            <div className="p-6">
              <DashboardEmptyState
                title="No projects yet"
                description="Projects are where GitHub execution starts. Move one post into project prep first, then come back here to manage repository connection, bootstrap, sync, and launch."
                primaryLabel="Open feed"
                primaryHref="/social"
                secondaryLabel="Open dashboard overview"
                secondaryHref="/dashboard"
              />
            </div>
          ) : (
            <div className="p-12 text-center">
              <p className="text-lg text-[color:var(--opc-muted)]">No projects match the current filters.</p>
            </div>
          )
        ) : (
          <div className="divide-y divide-white/8">
            {filteredProjects.map((project) => (
              <div key={project.id} className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-lg font-medium text-white">{project.title}</h3>
                      <Badge label={PROJECT_DELIVERY_STAGE_LABELS[project.deliveryStage]} tone="cyan" />
                      <Badge label={GITHUB_WORKFLOW_STATUS_LABELS[project.githubWorkflowStatus]} tone="blue" />
                    </div>

                    <p className="mt-2 line-clamp-2 text-sm text-[color:var(--opc-muted)]">
                      {project.description || 'No description provided.'}
                    </p>

                    <div className="mt-3 flex flex-wrap items-center gap-6 text-sm text-gray-500">
                      <span>Created: {new Date(project.createdAt).toLocaleDateString()}</span>
                      <span>Owner: {project.ownerName || 'Unknown owner'}</span>
                      {project.githubRepoFullName && <span>Repo: {project.githubRepoFullName}</span>}
                      <span>Next: {getProjectNextAction(project)}</span>
                      {project.sourcePost && (
                        <span className="text-purple-400">
                          From Post:{' '}
                          <Link href={`/idea/${project.sourcePost.id}`} className="hover:underline">
                            {project.sourcePost.title}
                          </Link>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      href={`/project/${project.id}`}
                      className="opc-button-secondary px-3 py-1.5 text-xs"
                    >
                      View
                    </Link>
                    <button
                      onClick={() => deleteProject(project.id)}
                      className="rounded border border-red-700 px-3 py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-900/30"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="opc-panel rounded-lg p-4">
      <p className="text-sm font-medium text-[color:var(--opc-muted)]">{label}</p>
      <p className="mt-2 text-2xl font-bold text-white">{value}</p>
    </div>
  )
}

function ActionCard({
  label,
  value,
  description,
}: {
  label: string
  value: number
  description: string
}) {
  return (
    <div className="opc-panel rounded-lg p-4">
      <p className="text-sm font-medium text-[color:var(--opc-muted)]">{label}</p>
      <p className="mt-2 text-2xl font-bold text-white">{value}</p>
      <p className="mt-2 text-sm text-gray-500">{description}</p>
    </div>
  )
}

function SelectFilter({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: Array<{ value: string; label: string }>
}) {
  return (
    <div className="opc-panel rounded-lg p-4">
      <label className="mb-2 block text-sm font-medium text-gray-300">{label}</label>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-white/10 bg-black px-4 py-2 text-sm text-white focus:border-[var(--opc-green)] focus:outline-none"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}

function Badge({ label, tone }: { label: string; tone: 'cyan' | 'blue' }) {
  const className =
    tone === 'cyan'
      ? 'opc-chip-green'
      : 'opc-chip-purple'

  return <span className={className}>{label}</span>
}

function getProjectNextAction(project: ProjectDto) {
  if (!project.githubRepoFullName) {
    return 'Connect repository'
  }

  if (!project.githubPrimaryIssueNumber || !project.githubPrimaryPrNumber) {
    return 'Bootstrap workflow'
  }

  if (project.deliveryStage === 'launch_ready' && !project.launch) {
    return 'Send to launch'
  }

  if (project.githubWorkflowStatus === 'blocked') {
    return 'Resolve block and sync'
  }

  if (project.launch) {
    return 'Monitor launch'
  }

  return 'Keep syncing GitHub'
}
