'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import Link from 'next/link'

interface Project {
  id: string
  title: string
  description: string
  ownerId: string
  ownerName: string
  status: string
  ideaId: string
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
      fetchProjects()
    }
  }, [user])

  const fetchProjects = async () => {
    if (!user) return

    try {
      setLoading(true)
      const response = await fetch('/api/projects')
      if (!response.ok) throw new Error('Failed to fetch projects')
      const data = await response.json()
      // Filter only user's projects
      const userProjects = data.filter((project: Project) => project.ownerId === user.id)
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
        return 'bg-blue-900/50 text-blue-400 border border-blue-700'
      case 'completed':
        return 'bg-emerald-900/50 text-emerald-400 border border-emerald-700'
      case 'cancelled':
        return 'bg-red-900/50 text-red-400 border border-red-700'
      default:
        return 'bg-gray-700 text-gray-300'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'in_progress':
        return 'In Progress'
      case 'completed':
        return 'Completed'
      case 'cancelled':
        return 'Cancelled'
      default:
        return status
    }
  }

  const filteredProjects = projects.filter(project => {
    if (filter === 'all') return true
    return project.status === filter
  })

  const stats = {
    total: projects.length,
    inProgress: projects.filter(p => p.status === 'in_progress').length,
    completed: projects.filter(p => p.status === 'completed').length,
    cancelled: projects.filter(p => p.status === 'cancelled').length,
  }

  if (!user) {
    return (
      <div className="text-center py-12">
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
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">My Projects</h1>
          <p className="mt-1 text-sm text-gray-400">
            Manage your startup projects
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-lg flex justify-between items-center">
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="text-red-300 hover:text-red-100"
          >
            ×
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <button
          onClick={() => setFilter('all')}
          className={`bg-gray-800 rounded-lg p-4 border text-left transition-all ${
            filter === 'all' ? 'border-yellow-500' : 'border-gray-700 hover:border-gray-500'
          }`}
        >
          <p className="text-sm font-medium text-gray-400">Total</p>
          <p className="mt-2 text-2xl font-bold text-white">{stats.total}</p>
        </button>
        <button
          onClick={() => setFilter('in_progress')}
          className={`bg-gray-800 rounded-lg p-4 border text-left transition-all ${
            filter === 'in_progress' ? 'border-blue-500' : 'border-gray-700 hover:border-gray-500'
          }`}
        >
          <p className="text-sm font-medium text-gray-400">In Progress</p>
          <p className="mt-2 text-2xl font-bold text-white">{stats.inProgress}</p>
        </button>
        <button
          onClick={() => setFilter('completed')}
          className={`bg-gray-800 rounded-lg p-4 border text-left transition-all ${
            filter === 'completed' ? 'border-emerald-500' : 'border-gray-700 hover:border-gray-500'
          }`}
        >
          <p className="text-sm font-medium text-gray-400">Completed</p>
          <p className="mt-2 text-2xl font-bold text-white">{stats.completed}</p>
        </button>
        <button
          onClick={() => setFilter('cancelled')}
          className={`bg-gray-800 rounded-lg p-4 border text-left transition-all ${
            filter === 'cancelled' ? 'border-red-500' : 'border-gray-700 hover:border-gray-500'
          }`}
        >
          <p className="text-sm font-medium text-gray-400">Cancelled</p>
          <p className="mt-2 text-2xl font-bold text-white">{stats.cancelled}</p>
        </button>
      </div>

      {/* Projects List */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        {filteredProjects.length === 0 ? (
          <div className="p-12 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            <p className="mt-2 text-lg text-gray-400">No projects yet</p>
            <p className="mt-1 text-sm text-gray-500">Projects will be created from ideas</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-700">
            {filteredProjects.map((project) => (
              <div key={project.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <h3 className="text-lg font-medium text-white">
                        {project.title}
                      </h3>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
                        {getStatusLabel(project.status)}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-gray-400 line-clamp-2">
                      {project.description}
                    </p>
                    <div className="mt-3 flex items-center space-x-6 text-sm text-gray-500">
                      <span>Created: {new Date(project.createdAt).toLocaleDateString()}</span>
                      <span>Owner: {project.ownerName}</span>
                      {project.idea && (
                        <span className="text-purple-400">
                          From Idea: <Link href={`/idea/${project.idea.id}`} className="hover:underline">
                            {project.idea.title}
                          </Link>
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="ml-4 flex items-center space-x-2">
                    <Link
                      href={`/project/${project.id}`}
                      className="inline-flex items-center px-3 py-1.5 border border-gray-600 text-xs font-medium rounded text-gray-300 hover:bg-gray-700 transition-colors"
                    >
                      View
                    </Link>
                    <button
                      onClick={() => deleteProject(project.id)}
                      className="inline-flex items-center px-3 py-1.5 border border-red-700 text-xs font-medium rounded text-red-400 hover:bg-red-900/30 transition-colors"
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
