'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import Link from 'next/link'

interface Stats {
  botsCount: number
  ideasCount: number
  projectsCount: number
}

interface DashboardIdeaSummary {
  userId?: string | null
}

interface DashboardProjectSummary {
  userId?: string | null
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState<Stats>({ botsCount: 0, ideasCount: 0, projectsCount: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      fetchStats()
    }
  }, [user])

  const fetchStats = async () => {
    try {
      // Fetch bots count
      const botsRes = await fetch('/api/bots')
      if (botsRes.ok) {
        const bots = await botsRes.json()
        setStats(prev => ({ ...prev, botsCount: bots.length || 0 }))
      }

      // Fetch ideas count
      const ideasRes = await fetch('/api/ideas')
      if (ideasRes.ok) {
        const ideas: DashboardIdeaSummary[] = await ideasRes.json()
        const userIdeas = ideas.filter((idea) => idea.userId === user?.id)
        setStats(prev => ({ ...prev, ideasCount: userIdeas.length }))
      }

      // Fetch projects count
      const projectsRes = await fetch('/api/projects')
      if (projectsRes.ok) {
        const projects: DashboardProjectSummary[] = await projectsRes.json()
        const userProjects = projects.filter((project) => project.userId === user?.id)
        setStats(prev => ({ ...prev, projectsCount: userProjects.length }))
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const quickActions = [
    {
      name: 'Create New Bot',
      description: 'Set up a new AI agent',
      href: '/dashboard/bots',
      icon: 'M12 4v16m8-8H4',
      color: 'bg-emerald-500 hover:bg-emerald-600',
    },
    {
      name: 'Post Idea',
      description: 'Share your startup idea',
      href: '/idea',
      icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z',
      color: 'bg-purple-500 hover:bg-purple-600',
    },
    {
      name: 'View Projects',
      description: 'See ongoing projects',
      href: '/dashboard/projects',
      icon: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z',
      color: 'bg-yellow-500 hover:bg-yellow-600',
    },
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">
          Welcome back, {user?.name || 'User'}!
        </h1>
        <p className="mt-2 text-gray-400">
          Here's what's happening with your account
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Bots Count */}
        <Link
          href="/dashboard/bots"
          className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-emerald-500 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Total Bots</p>
              <p className="mt-2 text-3xl font-bold text-white">
                {loading ? '...' : stats.botsCount}
              </p>
            </div>
            <div className="h-12 w-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <svg className="h-6 w-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
        </Link>

        {/* Ideas Count */}
        <Link
          href="/dashboard/ideas"
          className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-purple-500 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Published Ideas</p>
              <p className="mt-2 text-3xl font-bold text-white">
                {loading ? '...' : stats.ideasCount}
              </p>
            </div>
            <div className="h-12 w-12 rounded-full bg-purple-500/20 flex items-center justify-center">
              <svg className="h-6 w-6 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
          </div>
        </Link>

        {/* Projects Count */}
        <Link
          href="/dashboard/projects"
          className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-yellow-500 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">My Projects</p>
              <p className="mt-2 text-3xl font-bold text-white">
                {loading ? '...' : stats.projectsCount}
              </p>
            </div>
            <div className="h-12 w-12 rounded-full bg-yellow-500/20 flex items-center justify-center">
              <svg className="h-6 w-6 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
            </div>
          </div>
        </Link>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-semibold text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {quickActions.map((action) => (
            <Link
              key={action.name}
              href={action.href}
              className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-gray-500 transition-all hover:scale-105"
            >
              <div className="flex items-center mb-4">
                <div className={`h-10 w-10 rounded-lg ${action.color} flex items-center justify-center`}>
                  <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={action.icon} />
                  </svg>
                </div>
              </div>
              <h3 className="text-lg font-semibold text-white">{action.name}</h3>
              <p className="mt-1 text-sm text-gray-400">{action.description}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Recent Activity</h2>
        <div className="space-y-4">
          <div className="flex items-start space-x-3">
            <div className="h-8 w-8 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
              <svg className="h-4 w-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-white">Welcome to OPC Platform Dashboard!</p>
              <p className="text-xs text-gray-400">Get started by creating your first bot or posting an idea.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
