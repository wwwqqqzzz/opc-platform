'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import {
  GITHUB_WORKFLOW_STATUS_LABELS,
  PROJECT_DELIVERY_STAGE_LABELS,
  type GithubWorkflowStatus,
  type ProjectDeliveryStage,
} from '@/lib/project-stage'
import type { ProjectDto } from '@/types/projects'

export default function MyProjectsPage() {
  const { user } = useAuth()
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
      const response = await fetch('/api/projects')
      if (!response.ok) throw new Error('Failed to fetch projects')

      const data: ProjectDto[] = await response.json()
      setProjects(data.filter((project) => project.userId === user.id))
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
        <p className="text-gray-400">Please login to view your projects</p>
      </div>
    )
  }

  if (loading) {
    return <div className="py-12 text-center text-gray-400">Loading...</div>
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">My Projects</h1>
        <p className="mt-1 text-sm text-gray-400">
          Track project intake, GitHub execution, and launch readiness in one place.
        </p>
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

      <div className="overflow-hidden rounded-lg border border-gray-700 bg-gray-800">
        {filteredProjects.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-lg text-gray-400">No projects match the current filters.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-700">
            {filteredProjects.map((project) => (
              <div key={project.id} className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-lg font-medium text-white">{project.title}</h3>
                      <Badge label={PROJECT_DELIVERY_STAGE_LABELS[project.deliveryStage]} tone="cyan" />
                      <Badge label={GITHUB_WORKFLOW_STATUS_LABELS[project.githubWorkflowStatus]} tone="blue" />
                    </div>

                    <p className="mt-2 line-clamp-2 text-sm text-gray-400">
                      {project.description || 'No description provided.'}
                    </p>

                    <div className="mt-3 flex flex-wrap items-center gap-6 text-sm text-gray-500">
                      <span>Created: {new Date(project.createdAt).toLocaleDateString()}</span>
                      <span>Owner: {project.ownerName || 'Unknown owner'}</span>
                      {project.githubRepoFullName && <span>Repo: {project.githubRepoFullName}</span>}
                      {project.idea && (
                        <span className="text-purple-400">
                          From Idea:{' '}
                          <Link href={`/idea/${project.idea.id}`} className="hover:underline">
                            {project.idea.title}
                          </Link>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      href={`/project/${project.id}`}
                      className="rounded border border-gray-600 px-3 py-1.5 text-xs font-medium text-gray-300 transition-colors hover:bg-gray-700"
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
    <div className="rounded-lg border border-gray-700 bg-gray-800 p-4">
      <p className="text-sm font-medium text-gray-400">{label}</p>
      <p className="mt-2 text-2xl font-bold text-white">{value}</p>
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
    <div className="rounded-lg border border-gray-700 bg-gray-800 p-4">
      <label className="mb-2 block text-sm font-medium text-gray-300">{label}</label>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
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
      ? 'border-cyan-700 bg-cyan-900/30 text-cyan-300'
      : 'border-blue-700 bg-blue-900/30 text-blue-300'

  return <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${className}`}>{label}</span>
}
