'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { notFound, useParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import {
  AGENT_GITHUB_STATUSES,
  AGENT_GITHUB_STATUS_LABELS,
  PROJECT_DELIVERY_STAGE_LABELS,
  type AgentGithubStatus,
  type ProjectDeliveryStage,
} from '@/lib/project-stage'

interface Idea {
  id: string
  title: string
  description: string
  authorType: string
  status: string
}

interface Launch {
  id: string
  productName: string
  tagline: string
  demoUrl: string | null
  launchedAt: string
}

interface ProjectUser {
  id: string
  name: string | null
  email: string
}

interface Project {
  id: string
  title: string
  description: string | null
  ownerName: string | null
  agentTeam: string | null
  githubUrl: string | null
  status: string
  deliveryStage: ProjectDeliveryStage
  agentGithubStatus: AgentGithubStatus
  agentGithubUrl: string | null
  agentGithubNotes: string | null
  handoffRequestedAt: string | null
  handoffCompletedAt: string | null
  createdAt: string
  idea: Idea | null
  launch: Launch | null
  user: ProjectUser | null
}

interface AgentGithubFormState {
  agentGithubUrl: string
  repositoryUrl: string
  notes: string
  status: AgentGithubStatus
}

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>()
  const { user } = useAuth()
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [showLaunchDialog, setShowLaunchDialog] = useState(false)
  const [launching, setLaunching] = useState(false)
  const [agentGithubSaving, setAgentGithubSaving] = useState(false)
  const [agentGithubError, setAgentGithubError] = useState<string | null>(null)
  const [launchForm, setLaunchForm] = useState({
    productName: '',
    tagline: '',
    demoUrl: '',
  })
  const [agentGithubForm, setAgentGithubForm] = useState<AgentGithubFormState>({
    agentGithubUrl: '',
    repositoryUrl: '',
    notes: '',
    status: 'queued',
  })

  useEffect(() => {
    void fetchProject()
  }, [params.id])

  const fetchProject = async () => {
    try {
      const response = await fetch(`/api/projects/${params.id}`)
      if (!response.ok) {
        notFound()
      }

      const data: Project = await response.json()
      setProject(data)
      setAgentGithubForm({
        agentGithubUrl: data.agentGithubUrl || '',
        repositoryUrl: data.githubUrl || '',
        notes: data.agentGithubNotes || '',
        status: data.agentGithubStatus || 'queued',
      })
    } catch (error) {
      console.error('Failed to fetch project:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLaunch = async () => {
    if (!project || !launchForm.productName || !launchForm.tagline) {
      alert('Product name and tagline are required')
      return
    }

    setLaunching(true)
    try {
      const response = await fetch('/api/launches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.id,
          productName: launchForm.productName,
          tagline: launchForm.tagline,
          demoUrl: launchForm.demoUrl,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        alert(error.details || error.error || 'Failed to launch project')
        return
      }

      setShowLaunchDialog(false)
      setLaunchForm({ productName: '', tagline: '', demoUrl: '' })
      await fetchProject()
      alert('Launch created successfully')
    } catch (error) {
      console.error('Failed to launch project:', error)
      alert('Failed to launch project')
    } finally {
      setLaunching(false)
    }
  }

  const handleAgentGithubHandoff = async () => {
    if (!project) return

    setAgentGithubSaving(true)
    setAgentGithubError(null)

    try {
      const response = await fetch(`/api/projects/${project.id}/agent-github`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentGithubUrl: agentGithubForm.agentGithubUrl || undefined,
          repositoryUrl: agentGithubForm.repositoryUrl || undefined,
          notes: agentGithubForm.notes || undefined,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        setAgentGithubError(data.error || 'Failed to hand off project')
        return
      }

      await fetchProject()
    } catch (error) {
      console.error('Failed to hand off project:', error)
      setAgentGithubError('Failed to hand off project to Agent GitHub')
    } finally {
      setAgentGithubSaving(false)
    }
  }

  const handleAgentGithubStatusUpdate = async () => {
    if (!project) return

    setAgentGithubSaving(true)
    setAgentGithubError(null)

    try {
      const response = await fetch(`/api/projects/${project.id}/agent-github`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentGithubStatus: agentGithubForm.status,
          agentGithubUrl: agentGithubForm.agentGithubUrl || undefined,
          repositoryUrl: agentGithubForm.repositoryUrl || undefined,
          notes: agentGithubForm.notes,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        setAgentGithubError(data.error || 'Failed to update Agent GitHub status')
        return
      }

      await fetchProject()
    } catch (error) {
      console.error('Failed to update Agent GitHub status:', error)
      setAgentGithubError('Failed to update Agent GitHub status')
    } finally {
      setAgentGithubSaving(false)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
        <div className="container mx-auto max-w-5xl px-4 py-8">
          <div className="py-12 text-center">Loading...</div>
        </div>
      </main>
    )
  }

  if (!project) {
    notFound()
  }

  const agentTeam = JSON.parse(project.agentTeam || '[]')
  const canManageProject = Boolean(user?.id && project.user?.id === user.id)
  const canLaunch =
    project.status === 'in_progress' &&
    !project.launch &&
    project.deliveryStage === 'launch_ready'

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      <div className="container mx-auto max-w-5xl px-4 py-8">
        <div className="mb-8">
          <Link href="/project" className="mb-4 inline-block text-gray-400 hover:text-white">
            Back to Projects
          </Link>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex-1">
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <span className="rounded px-3 py-1 text-sm text-yellow-300 bg-yellow-500/20">
                  {project.status === 'launched' ? 'Launched' : 'In Progress'}
                </span>
                <span className="rounded bg-cyan-500/20 px-3 py-1 text-sm text-cyan-300">
                  {PROJECT_DELIVERY_STAGE_LABELS[project.deliveryStage]}
                </span>
                <span className="rounded bg-purple-500/20 px-3 py-1 text-sm text-purple-300">
                  Agent GitHub: {AGENT_GITHUB_STATUS_LABELS[project.agentGithubStatus]}
                </span>
                {project.idea && (
                  <Link href={`/idea/${project.idea.id}`} className="text-cyan-400 hover:text-cyan-300 text-sm">
                    View Source Idea
                  </Link>
                )}
                {project.launch && (
                  <Link href={`/launch#${project.launch.id}`} className="text-emerald-400 hover:text-emerald-300 text-sm">
                    View Launch
                  </Link>
                )}
              </div>

              <h1 className="mb-3 text-4xl font-bold">{project.title}</h1>
              <p className="max-w-3xl text-gray-400">
                {project.description || 'No project description provided.'}
              </p>
            </div>

            {canLaunch && (
              <button
                onClick={() => setShowLaunchDialog(true)}
                className="rounded-lg bg-emerald-600 px-6 py-3 font-medium text-white transition hover:bg-emerald-700"
              >
                Send to Launch
              </button>
            )}
          </div>
        </div>

        {showLaunchDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-md rounded-lg bg-gray-800 p-6">
              <h2 className="mb-4 text-2xl font-bold">Create Launch</h2>
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium">Product Name</label>
                  <input
                    type="text"
                    value={launchForm.productName}
                    onChange={(e) => setLaunchForm((prev) => ({ ...prev, productName: e.target.value }))}
                    className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-2 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">Tagline</label>
                  <input
                    type="text"
                    value={launchForm.tagline}
                    onChange={(e) => setLaunchForm((prev) => ({ ...prev, tagline: e.target.value }))}
                    className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-2 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">Demo URL</label>
                  <input
                    type="url"
                    value={launchForm.demoUrl}
                    onChange={(e) => setLaunchForm((prev) => ({ ...prev, demoUrl: e.target.value }))}
                    className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-2 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>
              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => setShowLaunchDialog(false)}
                  className="flex-1 rounded-lg bg-gray-700 px-4 py-2 font-medium transition hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={handleLaunch}
                  disabled={launching}
                  className="flex-1 rounded-lg bg-emerald-600 px-4 py-2 font-medium transition hover:bg-emerald-700 disabled:opacity-50"
                >
                  {launching ? 'Launching...' : 'Create Launch'}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-[1.7fr_1fr]">
            <div className="rounded-lg bg-gray-800/50 p-6">
              <h2 className="mb-3 text-xl font-semibold">Project Overview</h2>
              <p className="leading-relaxed text-gray-300">
                {project.description || 'No description provided.'}
              </p>
            </div>

            <div className="rounded-lg bg-gray-800/50 p-6">
              <h2 className="mb-3 text-xl font-semibold">Owner</h2>
              <div className="text-lg font-medium">{project.ownerName || 'Unknown owner'}</div>
              <div className="mt-2 text-sm text-gray-400">
                Created on {new Date(project.createdAt).toLocaleDateString()}
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-gray-800/50 p-6">
            <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-xl font-semibold">Agent GitHub</h2>
                <p className="mt-1 text-sm text-gray-400">
                  Projects must pass through Agent GitHub before they can return for launch.
                </p>
              </div>
              <div className="text-sm text-gray-400">
                Current: <span className="text-cyan-300">{AGENT_GITHUB_STATUS_LABELS[project.agentGithubStatus]}</span>
              </div>
            </div>

            <div className="mb-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <InfoCard label="Delivery Stage" value={PROJECT_DELIVERY_STAGE_LABELS[project.deliveryStage]} />
              <InfoCard label="Agent GitHub Status" value={AGENT_GITHUB_STATUS_LABELS[project.agentGithubStatus]} />
              <InfoCard
                label="Handoff Requested"
                value={project.handoffRequestedAt ? new Date(project.handoffRequestedAt).toLocaleString() : 'Not yet'}
              />
              <InfoCard
                label="Handoff Completed"
                value={project.handoffCompletedAt ? new Date(project.handoffCompletedAt).toLocaleString() : 'Not yet'}
              />
            </div>

            {(project.agentGithubUrl || project.githubUrl) && (
              <div className="mb-4 space-y-2 text-sm">
                {project.agentGithubUrl && (
                  <a
                    href={project.agentGithubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-cyan-400 hover:text-cyan-300"
                  >
                    Open Agent GitHub workspace
                  </a>
                )}
                {project.githubUrl && (
                  <a
                    href={project.githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-emerald-400 hover:text-emerald-300"
                  >
                    Open repository
                  </a>
                )}
              </div>
            )}

            {project.agentGithubNotes && (
              <div className="mb-4 rounded-lg border border-gray-700 bg-gray-900/40 p-4">
                <div className="mb-1 text-sm text-gray-400">Agent GitHub Notes</div>
                <p className="whitespace-pre-wrap text-sm text-gray-300">{project.agentGithubNotes}</p>
              </div>
            )}

            {canManageProject && !project.launch && (
              <div className="space-y-4 rounded-lg border border-gray-700 bg-gray-900/30 p-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium">Agent GitHub URL</label>
                    <input
                      type="url"
                      value={agentGithubForm.agentGithubUrl}
                      onChange={(e) => setAgentGithubForm((prev) => ({ ...prev, agentGithubUrl: e.target.value }))}
                      className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-2 focus:border-cyan-500 focus:outline-none"
                      placeholder="https://agent-github.example.com/workspace/..."
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium">Repository URL</label>
                    <input
                      type="url"
                      value={agentGithubForm.repositoryUrl}
                      onChange={(e) => setAgentGithubForm((prev) => ({ ...prev, repositoryUrl: e.target.value }))}
                      className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-2 focus:border-emerald-500 focus:outline-none"
                      placeholder="https://github.com/..."
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">Notes for Agent GitHub</label>
                  <textarea
                    value={agentGithubForm.notes}
                    onChange={(e) => setAgentGithubForm((prev) => ({ ...prev, notes: e.target.value }))}
                    className="min-h-[100px] w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-2 focus:border-cyan-500 focus:outline-none"
                    placeholder="Describe the next build step, bot roles, or handoff context."
                  />
                </div>

                {project.deliveryStage === 'project' ? (
                  <button
                    onClick={handleAgentGithubHandoff}
                    disabled={agentGithubSaving}
                    className="rounded-lg bg-cyan-600 px-5 py-2 font-medium text-white transition hover:bg-cyan-700 disabled:opacity-50"
                  >
                    {agentGithubSaving ? 'Sending...' : 'Send to Agent GitHub'}
                  </button>
                ) : (
                  <div className="flex flex-col gap-4 md:flex-row md:items-end">
                    <div className="flex-1">
                      <label className="mb-2 block text-sm font-medium">Update Agent GitHub Status</label>
                      <select
                        value={agentGithubForm.status}
                        onChange={(e) =>
                          setAgentGithubForm((prev) => ({
                            ...prev,
                            status: e.target.value as AgentGithubStatus,
                          }))
                        }
                        className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-2 focus:border-cyan-500 focus:outline-none"
                      >
                        {AGENT_GITHUB_STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {AGENT_GITHUB_STATUS_LABELS[status]}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button
                      onClick={handleAgentGithubStatusUpdate}
                      disabled={agentGithubSaving}
                      className="rounded-lg bg-cyan-600 px-5 py-2 font-medium text-white transition hover:bg-cyan-700 disabled:opacity-50"
                    >
                      {agentGithubSaving ? 'Saving...' : 'Save Agent GitHub Status'}
                    </button>
                  </div>
                )}

                {agentGithubError && (
                  <div className="rounded-lg border border-red-700 bg-red-900/30 px-4 py-3 text-sm text-red-200">
                    {agentGithubError}
                  </div>
                )}
              </div>
            )}
          </div>

          {agentTeam.length > 0 && (
            <div className="rounded-lg bg-gray-800/50 p-6">
              <h2 className="mb-3 text-xl font-semibold">Agent Team</h2>
              <div className="grid gap-4 md:grid-cols-2">
                {agentTeam.map((agent: { name?: string; type?: string } | string, index: number) => {
                  const normalized = typeof agent === 'string' ? { name: agent, type: 'unspecified' } : agent

                  return (
                    <div key={`${normalized.name}-${index}`} className="rounded-lg border border-purple-500/20 bg-purple-500/10 p-4">
                      <div className="font-medium">{normalized.name || 'Unnamed agent'}</div>
                      <div className="mt-1 text-sm text-gray-400">{normalized.type || 'unspecified'}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div className="rounded-lg bg-gray-800/50 p-6">
            <h2 className="mb-4 text-xl font-semibold">Timeline</h2>
            <div className="space-y-5">
              <TimelineItem
                colorClassName="bg-emerald-500"
                dateLabel={new Date(project.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
                title="Project Created"
                description="The idea was claimed and turned into a project on OPC Platform."
              />

              {project.handoffRequestedAt && (
                <TimelineItem
                  colorClassName="bg-cyan-500"
                  dateLabel={new Date(project.handoffRequestedAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                  title="Handoff to Agent GitHub"
                  description="The build moved from OPC Platform into Agent GitHub for execution."
                />
              )}

              {project.handoffCompletedAt && (
                <TimelineItem
                  colorClassName="bg-purple-500"
                  dateLabel={new Date(project.handoffCompletedAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                  title="Agent GitHub Completed"
                  description="The Agent GitHub phase completed and the project returned as launch-ready."
                />
              )}

              {project.launch && (
                <TimelineItem
                  colorClassName="bg-yellow-500"
                  dateLabel={new Date(project.launch.launchedAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                  title="Launched"
                  description="The product was published to the launch leaderboard."
                  isLast
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
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

function TimelineItem({
  colorClassName,
  dateLabel,
  title,
  description,
  isLast = false,
}: {
  colorClassName: string
  dateLabel: string
  title: string
  description: string
  isLast?: boolean
}) {
  return (
    <div className="flex items-start gap-4">
      <div className="flex flex-col items-center">
        <div className={`h-3 w-3 rounded-full ${colorClassName}`}></div>
        {!isLast && <div className="mt-2 h-full w-0.5 bg-gray-700"></div>}
      </div>
      <div className="flex-1 pb-4">
        <div className="text-sm text-gray-400">{dateLabel}</div>
        <div className="font-medium">{title}</div>
        <div className="mt-1 text-sm text-gray-400">{description}</div>
      </div>
    </div>
  )
}
