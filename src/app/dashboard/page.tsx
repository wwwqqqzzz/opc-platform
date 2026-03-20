'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import ProductTodoBoard from '@/components/product/ProductTodoBoard'
import { useAuth } from '@/contexts/AuthContext'
import { useDashboardOnboarding } from '@/hooks/useDashboardExecutionState'
import { getProjectExecutionLabel } from '@/lib/projects/onboarding'

interface Stats {
  botsCount: number
  ideasCount: number
  projectsCount: number
}

interface DashboardIdeaSummary {
  userId?: string | null
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState<Stats>({ botsCount: 0, ideasCount: 0, projectsCount: 0 })
  const [statsLoading, setStatsLoading] = useState(true)
  const { projects, githubStatus, onboarding } = useDashboardOnboarding()

  useEffect(() => {
    if (user) {
      void fetchDashboardData()
    }
  }, [user])

  const fetchDashboardData = async () => {
    if (!user) {
      return
    }

    try {
      setStatsLoading(true)

      const [botsRes, ideasRes, projectsRes] = await Promise.all([
        fetch('/api/bots'),
        fetch('/api/ideas'),
        fetch(`/api/projects?userId=${user.id}`),
      ])

      if (botsRes.ok) {
        const bots = await botsRes.json()
        setStats((prev) => ({ ...prev, botsCount: bots.length || 0 }))
      }

      if (ideasRes.ok) {
        const ideas: DashboardIdeaSummary[] = await ideasRes.json()
        const userIdeas = ideas.filter((idea) => idea.userId === user.id)
        setStats((prev) => ({ ...prev, ideasCount: userIdeas.length }))
      }

      if (projectsRes.ok) {
        const data = await projectsRes.json()
        setStats((prev) => ({ ...prev, projectsCount: data.length }))
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setStatsLoading(false)
    }
  }

  const launchReadyProjects = projects.filter(
    (project) => project.deliveryStage === 'launch_ready' && !project.launch
  )
  const blockedProjects = projects.filter((project) => project.githubSyncStatus === 'error')

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Welcome back, {user?.name || 'User'}!</h1>
        <p className="mt-2 text-gray-400">
          This dashboard now guides your first execution loop from project claim to launch.
        </p>
      </div>

      <section className="rounded-2xl border border-cyan-700/40 bg-gradient-to-r from-cyan-900/30 to-gray-800 p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <div className="text-sm uppercase tracking-wide text-cyan-300">Execution Onboarding</div>
            <h2 className="mt-2 text-2xl font-semibold text-white">{onboarding.title}</h2>
            <p className="mt-2 text-gray-300">{onboarding.description}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href={onboarding.ctaHref}
              className="rounded-lg bg-cyan-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-cyan-700"
            >
              {onboarding.ctaLabel}
            </Link>
            {onboarding.activeProject && (
              <Link
                href={`/project/${onboarding.activeProject.id}`}
                className="rounded-lg border border-gray-600 px-5 py-2.5 text-sm font-medium text-gray-200 transition hover:bg-gray-800"
              >
                Open active project
              </Link>
            )}
          </div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {onboarding.steps.map((step) => (
            <OnboardingCard
              key={step.id}
              title={step.title}
              description={step.description}
              complete={step.complete}
            />
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <StatLink
          href="/dashboard/bots"
          label="Total Bots"
          value={statsLoading ? '...' : String(stats.botsCount)}
          tone="emerald"
        />
        <StatLink
          href="/dashboard/ideas"
          label="Published Ideas"
          value={statsLoading ? '...' : String(stats.ideasCount)}
          tone="purple"
        />
        <StatLink
          href="/dashboard/projects"
          label="My Projects"
          value={statsLoading ? '...' : String(stats.projectsCount)}
          tone="yellow"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
        <section className="rounded-lg border border-gray-700 bg-gray-800 p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-white">Active Execution Queue</h2>
              <p className="mt-1 text-sm text-gray-400">
                These projects are the best candidates to move forward right now.
              </p>
            </div>
            <Link href="/dashboard/projects" className="text-sm text-cyan-400 hover:text-cyan-300">
              View all
            </Link>
          </div>

          <div className="mt-5 space-y-4">
            {projects.length > 0 ? (
              projects.slice(0, 4).map((project) => (
                <div key={project.id} className="rounded-lg border border-gray-700 bg-gray-900/40 p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="text-lg font-medium text-white">{project.title}</div>
                      <p className="mt-1 line-clamp-2 text-sm text-gray-400">
                        {project.description || 'No description provided.'}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-500">
                        <span>Next: {getProjectExecutionLabel(project)}</span>
                        {project.githubRepoFullName && <span>Repo: {project.githubRepoFullName}</span>}
                        {project.githubSyncStatus === 'error' && <span className="text-red-300">Sync needs attention</span>}
                      </div>
                    </div>
                    <Link
                      href={`/project/${project.id}`}
                      className="rounded-lg border border-gray-600 px-4 py-2 text-sm font-medium text-gray-200 transition hover:bg-gray-800"
                    >
                      Open project
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState
                title="No projects yet"
                description="Claim one idea first. That unlocks the rest of the GitHub execution onboarding flow."
                href="/ideas/human"
                cta="Browse ideas"
              />
            )}
          </div>
        </section>

        <div className="space-y-6">
          <section className="rounded-lg border border-gray-700 bg-gray-800 p-6">
            <h2 className="text-xl font-semibold text-white">Current Focus</h2>
            {onboarding.activeProject ? (
              <div className="mt-4 rounded-lg border border-gray-700 bg-gray-900/40 p-4">
                <div className="text-sm text-gray-400">Project</div>
                <div className="mt-1 text-lg font-medium text-white">{onboarding.activeProject.title}</div>
                <p className="mt-2 text-sm text-gray-400">{onboarding.description}</p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Link
                    href={`/project/${onboarding.activeProject.id}`}
                    className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
                  >
                    Continue
                  </Link>
                  <Link
                    href={onboarding.ctaHref}
                    className="rounded-lg border border-gray-600 px-4 py-2 text-sm font-medium text-gray-200 transition hover:bg-gray-800"
                  >
                    Go to next step
                  </Link>
                </div>
              </div>
            ) : (
              <div className="mt-4 rounded-lg border border-gray-700 bg-gray-900/40 p-4 text-sm text-gray-400">
                Your first focus appears here after you claim an idea into a project.
              </div>
            )}
          </section>

          <section className="rounded-lg border border-gray-700 bg-gray-800 p-6">
            <h2 className="text-xl font-semibold text-white">Health Signals</h2>
            <div className="mt-4 space-y-3">
              <HealthRow
                label="GitHub connected"
                value={githubStatus?.connection.connected ? 'Yes' : 'No'}
                tone={githubStatus?.connection.connected ? 'good' : 'warn'}
              />
              <HealthRow
                label="Launch-ready projects"
                value={String(launchReadyProjects.length)}
                tone={launchReadyProjects.length > 0 ? 'good' : 'neutral'}
              />
              <HealthRow
                label="Projects with sync errors"
                value={String(blockedProjects.length)}
                tone={blockedProjects.length > 0 ? 'warn' : 'good'}
              />
            </div>
          </section>
        </div>
      </div>

      <ProductTodoBoard
        title="Future product TODO placeholders"
        intro="These placeholders mark the layers we intentionally are not building yet. They keep the roadmap anchored in the product so later development does not drift toward the wrong center of gravity."
        compact
      />
    </div>
  )
}

function OnboardingCard({
  title,
  description,
  complete,
}: {
  title: string
  description: string
  complete: boolean
}) {
  return (
    <div
      className={`rounded-lg border p-4 ${
        complete
          ? 'border-emerald-700 bg-emerald-900/20'
          : 'border-gray-700 bg-gray-900/50'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="font-medium text-white">{title}</div>
        <span
          className={`rounded-full border px-2 py-0.5 text-xs ${
            complete
              ? 'border-emerald-500 text-emerald-200'
              : 'border-gray-600 text-gray-400'
          }`}
        >
          {complete ? 'Done' : 'Next'}
        </span>
      </div>
      <p className="mt-2 text-sm text-gray-400">{description}</p>
    </div>
  )
}

function StatLink({
  href,
  label,
  value,
  tone,
}: {
  href: string
  label: string
  value: string
  tone: 'emerald' | 'purple' | 'yellow'
}) {
  const borderTone =
    tone === 'emerald'
      ? 'hover:border-emerald-500'
      : tone === 'purple'
      ? 'hover:border-purple-500'
      : 'hover:border-yellow-500'

  return (
    <Link
      href={href}
      className={`rounded-lg border border-gray-700 bg-gray-800 p-6 transition-colors ${borderTone}`}
    >
      <p className="text-sm font-medium text-gray-400">{label}</p>
      <p className="mt-2 text-3xl font-bold text-white">{value}</p>
    </Link>
  )
}

function EmptyState({
  title,
  description,
  href,
  cta,
}: {
  title: string
  description: string
  href: string
  cta: string
}) {
  return (
    <div className="rounded-lg border border-dashed border-gray-700 bg-gray-900/30 p-8 text-center">
      <div className="text-lg font-medium text-white">{title}</div>
      <p className="mt-2 text-sm text-gray-400">{description}</p>
      <Link
        href={href}
        className="mt-4 inline-block rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-cyan-700"
      >
        {cta}
      </Link>
    </div>
  )
}

function HealthRow({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone: 'good' | 'warn' | 'neutral'
}) {
  const textTone =
    tone === 'good'
      ? 'text-emerald-300'
      : tone === 'warn'
      ? 'text-amber-300'
      : 'text-gray-300'

  return (
    <div className="flex items-center justify-between rounded-lg border border-gray-700 bg-gray-900/40 px-4 py-3">
      <span className="text-sm text-gray-400">{label}</span>
      <span className={`text-sm font-medium ${textTone}`}>{value}</span>
    </div>
  )
}
