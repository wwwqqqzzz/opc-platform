'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import ProductTodoBoard from '@/components/product/ProductTodoBoard'
import { useAuth } from '@/contexts/AuthContext'
import { useDashboardOnboarding } from '@/hooks/useDashboardExecutionState'
import { getProjectExecutionLabel } from '@/lib/projects/onboarding'
import type { DiscoverySnapshot } from '@/types/discovery'

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
  const [discovery, setDiscovery] = useState<DiscoverySnapshot | null>(null)
  const [discoveryLoading, setDiscoveryLoading] = useState(true)
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

  useEffect(() => {
    void fetchDiscoveryData()
  }, [])

  const fetchDiscoveryData = async () => {
    try {
      setDiscoveryLoading(true)
      const response = await fetch('/api/discovery')
      if (!response.ok) {
        throw new Error('Failed to fetch discovery data')
      }

      const data: DiscoverySnapshot = await response.json()
      setDiscovery(data)
    } catch (error) {
      console.error('Failed to fetch discovery data:', error)
    } finally {
      setDiscoveryLoading(false)
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
        <p className="mt-2 text-[color:var(--opc-muted)]">
          This dashboard keeps the whole product loop visible: discovery, intake, execution bridge, and launch.
        </p>
      </div>

      <section className="opc-panel-green rounded-2xl p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <div className="opc-kicker text-sm">Execution Onboarding</div>
            <h2 className="mt-2 text-2xl font-semibold text-white">{onboarding.title}</h2>
            <p className="mt-2 text-gray-300">{onboarding.description}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href={onboarding.ctaHref}
              className="opc-button-primary px-5 py-2.5 text-sm"
            >
              {onboarding.ctaLabel}
            </Link>
            {onboarding.activeProject && (
              <Link
                href={`/project/${onboarding.activeProject.id}`}
                className="opc-button-secondary px-5 py-2.5 text-sm"
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
          label="Published Posts"
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

      <div className="grid gap-6 xl:grid-cols-3">
        <WorkspaceCard
          href="/dashboard/channels"
          title="Channels Workspace"
          description="Human rooms, bot rooms, and announcement rooms now live under dashboard operations instead of floating as a top-level module."
          cta="Open channels"
        />
        <WorkspaceCard
          href="/dashboard/network"
          title="Network Workspace"
          description="Human follow graph and bot follow graph now have a dedicated backend workspace so future DM, mention, and notification layers have a stable home."
          cta="Open network"
        />
        <WorkspaceCard
          href="/dashboard/inbox"
          title="Inbox Workspace"
          description="Private conversations now have a dedicated backend home so human-bot and bot-bot direct messaging can grow into a full private communication layer."
          cta="Open inbox"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="opc-panel rounded-lg p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-white">Social Pulse</h2>
              <p className="mt-1 text-sm text-[color:var(--opc-muted)]">
                The social layer should stay visible here, not only on the public pages.
              </p>
            </div>
            <Link href="/explore" className="text-sm text-[var(--opc-green)] hover:text-[#7ef0bb]">
              Open explore
            </Link>
          </div>

          {discoveryLoading ? (
            <div className="mt-5 text-sm text-gray-500">Loading social pulse...</div>
          ) : discovery ? (
            <>
              <div className="mt-5 grid gap-3 md:grid-cols-4">
                <PulseCard label="Posts in feed" value={String(discovery.stats.totalIdeas)} />
                <PulseCard label="Claim-ready" value={String(discovery.stats.openIdeas)} />
                <PulseCard label="Active channels" value={String(discovery.stats.channels)} />
                <PulseCard label="Recent launches" value={String(discovery.stats.launches)} />
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                <div className="opc-panel-soft rounded-lg p-4">
                  <div className="text-sm font-medium text-white">Top claim-ready posts</div>
                  <div className="mt-3 space-y-3">
                    {discovery.claimReadyIdeas.slice(0, 3).map((idea) => (
                      <div key={idea.id} className="rounded-lg border border-white/6 bg-black/25 p-3">
                        <div className="font-medium text-white">{idea.title}</div>
                        <p className="mt-1 line-clamp-2 text-sm text-[color:var(--opc-muted)]">{idea.description}</p>
                        <div className="mt-2 flex gap-4 text-xs text-gray-500">
                          <span>{idea.upvotes} upvotes</span>
                          <span>{idea.commentCount} comments</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="opc-panel-soft rounded-lg p-4">
                  <div className="text-sm font-medium text-white">Active channels</div>
                  <div className="mt-3 space-y-3">
                    {discovery.activeChannels.slice(0, 3).map((channel) => (
                      <div key={channel.id} className="rounded-lg border border-white/6 bg-black/25 p-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="font-medium text-white">#{channel.name}</div>
                          <div className="text-xs text-gray-500">{channel.messageCount} messages</div>
                        </div>
                        <p className="mt-1 text-sm text-[color:var(--opc-muted)]">
                          {channel.description || 'No description yet.'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="mt-5 text-sm text-gray-500">Social pulse is temporarily unavailable.</div>
          )}
        </section>

        <section className="opc-panel rounded-lg p-6">
          <div>
            <h2 className="text-xl font-semibold text-white">Intake Truth</h2>
            <p className="mt-1 text-sm text-[color:var(--opc-muted)]">
              Projects should start with social context, not jump straight into execution tooling.
            </p>
          </div>

          <div className="mt-5 space-y-3">
            <IntakeRow
              label="Discovery surface"
              value="Live"
              note="Explore now combines posts, channels, project momentum, and launches."
            />
            <IntakeRow
              label="Claim brief"
              value="Live"
              note="Claiming a post now captures owner role, why-now context, and an initial goal."
            />
            <IntakeRow
              label="Execution bridge"
              value="Secondary"
              note="GitHub remains the bridge layer after intake, not the first experience."
            />
          </div>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
        <section className="opc-panel rounded-lg p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-white">Active Execution Queue</h2>
              <p className="mt-1 text-sm text-[color:var(--opc-muted)]">
                These projects are the best candidates to move forward right now.
              </p>
            </div>
            <Link href="/dashboard/projects" className="text-sm text-[var(--opc-green)] hover:text-[#7ef0bb]">
              View all
            </Link>
          </div>

          <div className="mt-5 space-y-4">
            {projects.length > 0 ? (
              projects.slice(0, 4).map((project) => (
                <div key={project.id} className="opc-panel-soft rounded-lg p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="text-lg font-medium text-white">{project.title}</div>
                      <p className="mt-1 line-clamp-2 text-sm text-[color:var(--opc-muted)]">
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
                      className="opc-button-secondary px-4 py-2 text-sm"
                    >
                      Open project
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState
                title="No projects yet"
                description="Claim one post first. That unlocks the rest of the GitHub execution onboarding flow."
                href="/social"
                cta="Open feed"
              />
            )}
          </div>
        </section>

        <div className="space-y-6">
          <section className="opc-panel rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white">Current Focus</h2>
            {onboarding.activeProject ? (
              <div className="opc-panel-soft mt-4 rounded-lg p-4">
                <div className="text-sm text-[color:var(--opc-muted)]">Project</div>
                <div className="mt-1 text-lg font-medium text-white">{onboarding.activeProject.title}</div>
                <p className="mt-2 text-sm text-[color:var(--opc-muted)]">{onboarding.description}</p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Link
                    href={`/project/${onboarding.activeProject.id}`}
                    className="opc-button-primary px-4 py-2 text-sm"
                  >
                    Continue
                  </Link>
                  <Link
                    href={onboarding.ctaHref}
                    className="opc-button-secondary px-4 py-2 text-sm"
                  >
                    Go to next step
                  </Link>
                </div>
              </div>
            ) : (
              <div className="opc-panel-soft mt-4 rounded-lg p-4 text-sm text-[color:var(--opc-muted)]">
                Your first focus appears here after you claim a post into a project.
              </div>
            )}
          </section>

          <section className="opc-panel rounded-lg p-6">
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
        intro="These placeholders now sit after a live social feed and project intake layer. They keep the roadmap anchored in the product so later development does not drift toward the wrong center of gravity."
        compact
      />
    </div>
  )
}

function PulseCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="opc-panel-soft rounded-lg p-4">
      <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-white">{value}</div>
    </div>
  )
}

function IntakeRow({
  label,
  value,
  note,
}: {
  label: string
  value: string
  note: string
}) {
  return (
    <div className="opc-panel-soft rounded-lg p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="font-medium text-white">{label}</div>
        <div className="opc-chip-green">
          {value}
        </div>
      </div>
      <p className="mt-2 text-sm text-[color:var(--opc-muted)]">{note}</p>
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
          ? 'opc-panel-green'
          : 'opc-panel-soft'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="font-medium text-white">{title}</div>
        <span
          className={complete ? 'opc-chip-green' : 'opc-chip-white'}
        >
          {complete ? 'Done' : 'Next'}
        </span>
      </div>
      <p className="mt-2 text-sm text-[color:var(--opc-muted)]">{description}</p>
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
      ? 'hover:border-[var(--opc-green)]'
      : tone === 'purple'
      ? 'hover:border-[var(--opc-purple)]'
      : 'hover:border-[var(--opc-yellow)]'

  return (
    <Link
      href={href}
      className={`opc-panel rounded-lg p-6 transition-colors ${borderTone}`}
    >
      <p className="text-sm font-medium text-[color:var(--opc-muted)]">{label}</p>
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
    <div className="opc-panel-soft rounded-lg border-dashed p-8 text-center">
      <div className="text-lg font-medium text-white">{title}</div>
      <p className="mt-2 text-sm text-[color:var(--opc-muted)]">{description}</p>
      <Link
        href={href}
        className="opc-button-primary mt-4 inline-block px-4 py-2 text-sm"
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
    <div className="opc-panel-soft flex items-center justify-between rounded-lg px-4 py-3">
      <span className="text-sm text-[color:var(--opc-muted)]">{label}</span>
      <span className={`text-sm font-medium ${textTone}`}>{value}</span>
    </div>
  )
}

function WorkspaceCard({
  href,
  title,
  description,
  cta,
}: {
  href: string
  title: string
  description: string
  cta: string
}) {
  return (
    <Link
      href={href}
      className="opc-panel rounded-lg p-6 transition hover:border-[var(--opc-green)]/60"
    >
      <div className="text-lg font-semibold text-white">{title}</div>
      <p className="mt-2 text-sm leading-6 text-[color:var(--opc-muted)]">{description}</p>
      <div className="mt-4 text-sm font-medium text-[var(--opc-green)]">{cta}</div>
    </Link>
  )
}
