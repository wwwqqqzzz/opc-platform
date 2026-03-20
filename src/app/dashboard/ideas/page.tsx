'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import Link from 'next/link'

interface Idea {
  id: string
  title: string
  description: string
  authorType: string
  authorId: string
  status: string
  createdAt: string
  updatedAt: string
  project?: {
    id: string
    title: string
  }
  _count?: {
    comments: number
    upvoteRecords: number
  }
}

export default function MyIdeasPage() {
  const { user } = useAuth()
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'pending' | 'in_progress' | 'completed'>('all')

  useEffect(() => {
    if (user) {
      fetchIdeas()
    }
  }, [user])

  const fetchIdeas = async () => {
    if (!user) return

    try {
      setLoading(true)
      const response = await fetch('/api/ideas')
      if (!response.ok) throw new Error('Failed to fetch ideas')
      const data = await response.json()
      // Filter only user's ideas
      const userIdeas = data.filter((idea: Idea) => idea.authorId === user.id)
      setIdeas(userIdeas)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch ideas')
    } finally {
      setLoading(false)
    }
  }

  const deleteIdea = async (ideaId: string) => {
    if (!confirm('Are you sure you want to delete this idea?')) return

    try {
      const response = await fetch(`/api/ideas/${ideaId}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete idea')

      await fetchIdeas()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete idea')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-900/50 text-yellow-400 border border-yellow-700'
      case 'in_progress':
        return 'bg-blue-900/50 text-blue-400 border border-blue-700'
      case 'completed':
        return 'bg-emerald-900/50 text-emerald-400 border border-emerald-700'
      default:
        return 'bg-gray-700 text-gray-300'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pending'
      case 'in_progress':
        return 'In Progress'
      case 'completed':
        return 'Completed'
      default:
        return status
    }
  }

  const filteredIdeas = ideas.filter(idea => {
    if (filter === 'all') return true
    return idea.status === filter
  })

  const stats = {
    total: ideas.length,
    pending: ideas.filter(i => i.status === 'pending').length,
    inProgress: ideas.filter(i => i.status === 'in_progress').length,
    completed: ideas.filter(i => i.status === 'completed').length,
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">Please login to view your ideas</p>
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
          <h1 className="text-2xl font-bold text-white">My Ideas</h1>
          <p className="mt-1 text-sm text-gray-400">
            Manage your startup ideas
          </p>
        </div>
        <Link
          href="/idea"
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors"
        >
          <svg className="mr-2 -ml-1 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Post New Idea
        </Link>
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
            filter === 'all' ? 'border-purple-500' : 'border-gray-700 hover:border-gray-500'
          }`}
        >
          <p className="text-sm font-medium text-gray-400">Total</p>
          <p className="mt-2 text-2xl font-bold text-white">{stats.total}</p>
        </button>
        <button
          onClick={() => setFilter('pending')}
          className={`bg-gray-800 rounded-lg p-4 border text-left transition-all ${
            filter === 'pending' ? 'border-yellow-500' : 'border-gray-700 hover:border-gray-500'
          }`}
        >
          <p className="text-sm font-medium text-gray-400">Pending</p>
          <p className="mt-2 text-2xl font-bold text-white">{stats.pending}</p>
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
      </div>

      {/* Ideas List */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        {filteredIdeas.length === 0 ? (
          <div className="p-12 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <p className="mt-2 text-lg text-gray-400">No ideas yet</p>
            <p className="mt-1 text-sm text-gray-500">Post your first idea to get started</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-700">
            {filteredIdeas.map((idea) => (
              <div key={idea.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <h3 className="text-lg font-medium text-white">
                        {idea.title}
                      </h3>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(idea.status)}`}>
                        {getStatusLabel(idea.status)}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-gray-400 line-clamp-2">
                      {idea.description}
                    </p>
                    <div className="mt-3 flex items-center space-x-6 text-sm text-gray-500">
                      <span>Created: {new Date(idea.createdAt).toLocaleDateString()}</span>
                      {idea._count && (
                        <>
                          <span>Comments: {idea._count.comments}</span>
                          <span>Upvotes: {idea._count.upvoteRecords}</span>
                        </>
                      )}
                      {idea.project && (
                        <span className="text-emerald-400">
                          Project: <Link href={`/project/${idea.project.id}`} className="hover:underline">
                            {idea.project.title}
                          </Link>
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="ml-4 flex items-center space-x-2">
                    <Link
                      href={`/idea/${idea.id}`}
                      className="inline-flex items-center px-3 py-1.5 border border-gray-600 text-xs font-medium rounded text-gray-300 hover:bg-gray-700 transition-colors"
                    >
                      View
                    </Link>
                    <button
                      onClick={() => deleteIdea(idea.id)}
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
