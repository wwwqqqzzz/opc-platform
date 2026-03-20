'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { PROJECT_DELIVERY_STAGE_LABELS, type ProjectDeliveryStage } from '@/lib/project-stage'

interface Project {
  id: string
  title: string
  description: string
  userId: string
  ownerName: string
  status: string
  deliveryStage: ProjectDeliveryStage
  ideaId: string
  agentGithubUrl?: string | null
  createdAt: string
  updatedAt: string
  idea?: {
    id: string
    title: string
  }
}

export default function MyProjectsPage() {
  const { user } = useAuth()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'in_progress' | 'completed' | 'cancelled'>('all')

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

      const data: Project[] = await response.json()
      const userProjects = data.filter((project) => project.userId === user.id)
      setProjects(userProjects)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch projects')
    } finally {
      setLoading(false)
    }
  }

  const deleteProject = async (projectId: string) => {
    if (!confirm('Are you sure you want to delete this project?')) return

    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete project')
      await fetchProjects()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete project')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in_progress':
        return 'border-blue-700 bg-blue-900/50 text-blue-400'
      case 'completed':
        return 'border-emerald-700 bg-emerald-900/50 text-emerald-400'
      case 'cancelled':
        return 'border-red-700 bg-red-900/50 text-red-400'
      default:
        return 'bg-gray-700 text-gray-300'
    }
  }

  const filteredProjects = projects.filter((project) => {
    if (filter === 'all') return true
    return project.status === filter
  })

  const stats = {
    total: projects.length,
    inProgress: projects.filter((project) => project.status === 'in_progress').length,
    completed: projects.filter((project) => project.status === 'completed').length,
    cancelled: projects.filter((project) => project.status === 'cancelled').length,
  }

  if (!user) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-400">Please login to view your projects</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-400">Loading...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">My Projects</h1>
        <p className="mt-1 text-sm text-gray-400">
          Track projects as they move through OPC Platform and Agent GitHub.
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
        <StatButton label="Total" value={stats.total} active={filter === 'all'} onClick={() => setFilter('all')} />
        <StatButton
          label="In Progress"
          value={stats.inProgress}
          active={filter === 'in_progress'}
          onClick={() => setFilter('in_progress')}
        />
        <StatButton
          label="Completed"
          value={stats.completed}
          active={filter === 'completed'}
          onClick={() => setFilter('completed')}
        />
        <StatButton
          label="Cancelled"
          value={stats.cancelled}
          active={filter === 'cancelled'}
          onClick={() => setFilter('cancelled')}
        />
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-700 bg-gray-800">
        {filteredProjects.length === 0 ? (
          <div className="p-12 text-center">
            <p className="mt-2 text-lg text-gray-400">No projects yet</p>
            <p className="mt-1 text-sm text-gray-500">Projects will be created from claimed ideas</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-700">
            {filteredProjects.map((project) => (
              <div key={project.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-lg font-medium text-white">{project.title}</h3>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(project.status)}`}>
                        {project.status}
                      </span>
                      <span className="inline-flex items-center rounded-full border border-cyan-700 px-2.5 py-0.5 text-xs font-medium text-cyan-300">
                        {PROJECT_DELIVERY_STAGE_LABELS[project.deliveryStage]}
                      </span>
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm text-gray-400">{project.description}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-6 text-sm text-gray-500">
                      <span>Created: {new Date(project.createdAt).toLocaleDateString()}</span>
                      <span>Owner: {project.ownerName}</span>
                      {project.agentGithubUrl && (
                        <a
                          href={project.agentGithubUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-cyan-400 hover:underline"
                        >
                          Agent GitHub
                        </a>
                      )}
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
                  <div className="ml-4 flex items-center space-x-2">
                    <Link
                      href={`/project/${project.id}`}
                      className="inline-flex items-center rounded border border-gray-600 px-3 py-1.5 text-xs font-medium text-gray-300 transition-colors hover:bg-gray-700"
                    >
                      View
                    </Link>
                    <button
                      onClick={() => deleteProject(project.id)}
                      className="inline-flex items-center rounded border border-red-700 px-3 py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-900/30"
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

function StatButton({
  label,
  value,
  active,
  onClick,
}: {
  label: string
  value: number
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg border bg-gray-800 p-4 text-left transition-all ${
        active ? 'border-yellow-500' : 'border-gray-700 hover:border-gray-500'
      }`}
    >
      <p className="text-sm font-medium text-gray-400">{label}</p>
      <p className="mt-2 text-2xl font-bold text-white">{value}</p>
    </button>
  )
}
