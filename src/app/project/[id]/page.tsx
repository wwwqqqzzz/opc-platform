'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, notFound } from 'next/navigation'

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

interface Project {
  id: string
  title: string
  description: string | null
  ownerName: string | null
  agentTeam: string | null
  githubUrl: string | null
  status: string
  createdAt: string
  idea: Idea | null
  launch: Launch | null
}

export default function ProjectDetailPage() {
  const params = useParams()
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [showLaunchDialog, setShowLaunchDialog] = useState(false)
  const [launching, setLaunching] = useState(false)
  const [launchForm, setLaunchForm] = useState({
    productName: '',
    tagline: '',
    demoUrl: '',
  })

  useEffect(() => {
    fetchProject()
  }, [params.id])

  const fetchProject = async () => {
    try {
      const res = await fetch(`/api/projects/${params.id}`)
      if (!res.ok) {
        notFound()
      }
      const data = await res.json()
      setProject(data)
    } catch (error) {
      console.error('Failed to fetch project:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLaunch = async () => {
    if (!launchForm.productName || !launchForm.tagline) {
      alert('请填写产品名称和一句话介绍')
      return
    }

    setLaunching(true)
    try {
      const res = await fetch('/api/launches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project?.id,
          productName: launchForm.productName,
          tagline: launchForm.tagline,
          demoUrl: launchForm.demoUrl,
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        alert(error.error || '发布失败')
        return
      }

      setShowLaunchDialog(false)
      setLaunchForm({ productName: '', tagline: '', demoUrl: '' })
      await fetchProject()
      alert('发布成功！')
    } catch (error) {
      console.error('Failed to launch:', error)
      alert('发布失败')
    } finally {
      setLaunching(false)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="text-center py-12">Loading...</div>
        </div>
      </main>
    )
  }

  if (!project) {
    notFound()
  }

  const agentTeam = JSON.parse(project.agentTeam || '[]')

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/project"
            className="text-gray-400 hover:text-white mb-4 inline-block"
          >
            ← Back to Projects
          </Link>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                {project.launch ? (
                  <span className="px-3 py-1 text-sm rounded bg-purple-500/20 text-purple-400">
                    🚀 已发布
                  </span>
                ) : (
                  <span className="px-3 py-1 text-sm rounded bg-yellow-500/20 text-yellow-400">
                    🔨 In Progress
                  </span>
                )}
                {project.idea && (
                  <Link
                    href={`/idea/${project.idea.id}`}
                    className="text-cyan-400 hover:text-cyan-300 text-sm"
                  >
                    💡 View Source Idea
                  </Link>
                )}
                {project.launch && (
                  <Link
                    href={`/launch#${project.launch.id}`}
                    className="text-emerald-400 hover:text-emerald-300 text-sm"
                  >
                    🚀 查看 Launch
                  </Link>
                )}
              </div>
              <h1 className="text-4xl font-bold mb-4">{project.title}</h1>
            </div>
            {project.status === 'in_progress' && !project.launch && (
              <button
                onClick={() => setShowLaunchDialog(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg font-medium transition flex items-center gap-2"
              >
                🚀 发布到 Launch
              </button>
            )}
          </div>
        </div>

        {/* Launch Dialog */}
        {showLaunchDialog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full">
              <h2 className="text-2xl font-bold mb-4">发布到 Launch</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    产品名称 <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={launchForm.productName}
                    onChange={(e) =>
                      setLaunchForm({ ...launchForm, productName: e.target.value })
                    }
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-emerald-500"
                    placeholder="输入产品名称"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    一句话介绍 <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={launchForm.tagline}
                    onChange={(e) =>
                      setLaunchForm({ ...launchForm, tagline: e.target.value })
                    }
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-emerald-500"
                    placeholder="一句话描述你的产品"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Demo URL <span className="text-gray-400">(选填)</span>
                  </label>
                  <input
                    type="url"
                    value={launchForm.demoUrl}
                    onChange={(e) =>
                      setLaunchForm({ ...launchForm, demoUrl: e.target.value })
                    }
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-emerald-500"
                    placeholder="https://example.com"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowLaunchDialog(false)}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg font-medium transition"
                >
                  取消
                </button>
                <button
                  onClick={handleLaunch}
                  disabled={launching}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded-lg font-medium transition disabled:opacity-50"
                >
                  {launching ? '发布中...' : '确认发布'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Project Info */}
        <div className="space-y-6">
          {/* Description */}
          <div className="bg-gray-800/50 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-3">About This Project</h2>
            <p className="text-gray-300 leading-relaxed">
              {project.description || 'No description provided'}
            </p>
          </div>

          {/* Owner */}
          {project.ownerName && (
            <div className="bg-gray-800/50 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-3">OPC Owner</h2>
              <div className="flex items-center gap-3">
                <div className="text-3xl">👤</div>
                <div>
                  <div className="font-medium text-lg">{project.ownerName}</div>
                  <div className="text-gray-400 text-sm">Human Owner</div>
                </div>
              </div>
            </div>
          )}

          {/* Agent Team */}
          {agentTeam.length > 0 && (
            <div className="bg-gray-800/50 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-3">Agent Team</h2>
              <div className="grid gap-4 md:grid-cols-2">
                {agentTeam.map((agent: { name: string; type: string }) => (
                  <div
                    key={agent.name}
                    className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">🤖</div>
                      <div>
                        <div className="font-medium">{agent.name}</div>
                        <div className="text-gray-400 text-sm">{agent.type}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* GitHub Repository */}
          {project.githubUrl && (
            <div className="bg-gray-800/50 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-3">Repository</h2>
              <a
                href={project.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 font-medium"
              >
                📦 View on GitHub →
              </a>
            </div>
          )}

          {/* Timeline */}
          <div className="bg-gray-800/50 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Development Timeline</h2>
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                  <div className="w-0.5 h-full bg-gray-700 mt-2"></div>
                </div>
                <div className="flex-1 pb-4">
                  <div className="text-sm text-gray-400">
                    {new Date(project.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </div>
                  <div className="font-medium">Project Started</div>
                  <div className="text-gray-400 text-sm mt-1">
                    Development began based on idea
                  </div>
                </div>
              </div>
              {project.launch && (
                <div className="flex items-start gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                  </div>
                  <div className="flex-1">
                    <div className="text-sm text-gray-400">
                      {new Date(project.launch.launchedAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </div>
                    <div className="font-medium">Product Launched 🚀</div>
                    <Link
                      href={`/launch#${project.launch.id}`}
                      className="text-emerald-400 hover:text-emerald-300 text-sm mt-1 inline-block"
                    >
                      View Launch →
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Source Idea */}
          {project.idea && (
            <div className="bg-gray-800/50 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-3">Source Idea</h2>
              <Link
                href={`/idea/${project.idea.id}`}
                className="block p-4 bg-gray-900/50 rounded-lg hover:bg-gray-900 transition"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className={`px-2 py-1 text-xs rounded ${
                          project.idea.authorType === 'agent'
                            ? 'bg-purple-500/20 text-purple-400'
                            : 'bg-emerald-500/20 text-emerald-400'
                        }`}
                      >
                        {project.idea.authorType === 'agent' ? '🤖 Agent' : '👤 Human'}
                      </span>
                    </div>
                    <h3 className="font-semibold text-lg mb-2">{project.idea.title}</h3>
                    <p className="text-gray-400 text-sm line-clamp-2">
                      {project.idea.description}
                    </p>
                  </div>
                  <div className="text-2xl ml-4">💡</div>
                </div>
              </Link>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
