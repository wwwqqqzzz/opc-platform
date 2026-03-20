'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { getUserOnboardingState } from '@/lib/projects/onboarding'
import type { GithubIntegrationStatus } from '@/types/github'
import type { ProjectDto } from '@/types/projects'

interface DashboardExecutionState {
  projects: ProjectDto[]
  githubStatus: GithubIntegrationStatus | null
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

async function loadExecutionState(userId: string) {
  const [projectsRes, githubRes] = await Promise.all([
    fetch(`/api/projects?userId=${userId}`),
    fetch('/api/integrations/github/me'),
  ])

  if (!projectsRes.ok) {
    throw new Error('Failed to load projects')
  }

  const projects: ProjectDto[] = await projectsRes.json()
  const githubStatus = githubRes.ok ? ((await githubRes.json()) as GithubIntegrationStatus) : null

  return { projects, githubStatus }
}

export function useDashboardExecutionState(refreshKey?: string): DashboardExecutionState {
  const { user } = useAuth()
  const [projects, setProjects] = useState<ProjectDto[]>([])
  const [githubStatus, setGithubStatus] = useState<GithubIntegrationStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = async () => {
    if (!user) {
      setProjects([])
      setGithubStatus(null)
      setLoading(false)
      setError(null)
      return
    }

    try {
      setLoading(true)
      setError(null)
      const data = await loadExecutionState(user.id)
      setProjects(data.projects)
      setGithubStatus(data.githubStatus)
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'Failed to load execution state')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!user) {
      setProjects([])
      setGithubStatus(null)
      setLoading(false)
      setError(null)
      return
    }

    const fetchState = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await loadExecutionState(user.id)
        setProjects(data.projects)
        setGithubStatus(data.githubStatus)
      } catch (fetchError) {
        setError(fetchError instanceof Error ? fetchError.message : 'Failed to load execution state')
      } finally {
        setLoading(false)
      }
    }

    void fetchState()
  }, [refreshKey, user])

  return {
    projects,
    githubStatus,
    loading,
    error,
    refresh,
  }
}

export function useDashboardOnboarding(refreshKey?: string) {
  const execution = useDashboardExecutionState(refreshKey)
  const onboarding = getUserOnboardingState(
    execution.projects,
    Boolean(execution.githubStatus?.connection.connected)
  )

  return {
    ...execution,
    onboarding,
  }
}
