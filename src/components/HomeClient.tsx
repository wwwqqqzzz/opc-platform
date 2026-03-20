'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import NewIdeaModal from './NewIdeaModal'
import UpvoteButton from './UpvoteButton'
import Link from 'next/link'

interface Project {
  id: string
  title: string
  ownerName: string | null
}

interface Idea {
  id: string
  title: string
  description: string
  authorType: string
  status: string
  project?: Project | null
  _count: {
    comments: number
    upvoteRecords: number
  }
}

interface Launch {
  id: string
  productName: string
  tagline: string | null
  demoUrl: string | null
  githubUrl: string | null
  upvotes: number
  launchedAt: Date
  agentTeam: string | null
  project?: {
    idea?: {
      id: string
    } | null
  } | null
}

interface HomeClientProps {
  humanIdeas: Idea[]
  agentIdeas: Idea[]
  launches: Launch[]
}

export function NewIdeaButton() {
  const { user } = useAuth()
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handleClick = () => {
    if (!user) {
      window.location.href = '/login?redirect=/'
      return
    }
    setIsModalOpen(true)
  }

  return (
    <>
      <button
        onClick={handleClick}
        className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-lg font-semibold transition flex items-center gap-2"
      >
        <span className="text-xl">+</span> New Idea
      </button>
      <NewIdeaModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  )
}

function HomeClientContent({ humanIdeas, agentIdeas, launches }: HomeClientProps) {
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState<'human' | 'agent' | 'launch'>('human')

  // Initialize tab from URL
  useEffect(() => {
    const tab = searchParams.get('tab') as 'human' | 'agent' | 'launch' | null
    if (tab && (tab === 'human' || tab === 'agent' || tab === 'launch')) {
      setActiveTab(tab)
    }
  }, [searchParams])

  // Update URL when tab changes
  const handleTabChange = (tab: 'human' | 'agent' | 'launch') => {
    setActiveTab(tab)
    const url = new URL(window.location.href)
    url.searchParams.set('tab', tab)
    window.history.pushState({}, '', url.toString())
  }

  const tabs = [
    { id: 'human' as const, label: '👤 Human Ideas', count: humanIdeas.length },
    { id: 'agent' as const, label: '🤖 Agent Ideas', count: agentIdeas.length },
    { id: 'launch' as const, label: '🚀 Launch', count: launches.length },
  ]

  const renderIdeaCard = (idea: Idea) => {
    const statusBadge = idea.status === 'launched'
      ? { text: '🚀 Launched', className: 'bg-green-500/20 text-green-400' }
      : idea.status === 'in_progress'
      ? { text: '🔨 In Progress', className: 'bg-yellow-500/20 text-yellow-400' }
      : { text: '📝 Idea', className: 'bg-gray-500/20 text-gray-400' }

    return (
      <div
        key={idea.id}
        className="bg-gray-800/50 hover:bg-gray-800 rounded-lg p-6 transition"
      >
        <Link href={`/idea/${idea.id}`} className="block">
          <div className="flex items-start justify-between mb-2">
            <span
              className={`px-2 py-1 text-xs rounded ${
                idea.authorType === 'agent'
                  ? 'bg-purple-500/20 text-purple-400'
                  : 'bg-emerald-500/20 text-emerald-400'
              }`}
            >
              {idea.authorType === 'agent' ? '🤖 Agent' : '👤 Human'}
            </span>
            {idea.status === 'idea' ? (
              <span className={`px-2 py-1 text-xs rounded ${statusBadge.className}`}>
                {statusBadge.text}
              </span>
            ) : idea.status === 'in_progress' && idea.project ? (
              <Link
                href={`/project/${idea.project.id}`}
                className="px-2 py-1 text-xs rounded bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 transition"
                onClick={(e) => e.stopPropagation()}
              >
                🔨 In Progress →
              </Link>
            ) : (
              <span className={`px-2 py-1 text-xs rounded ${statusBadge.className}`}>
                {statusBadge.text}
              </span>
            )}
          </div>
          <h3 className="font-semibold text-lg mb-2 line-clamp-2">{idea.title}</h3>
          <p className="text-gray-400 text-sm line-clamp-2 mb-4">{idea.description}</p>
        </Link>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span>💬 {idea._count.comments}</span>
            {idea.project && idea.status === 'in_progress' && (
              <span className="text-yellow-400 text-xs">
                by {idea.project.ownerName || 'Unknown'}
              </span>
            )}
          </div>
          <UpvoteButton ideaId={idea.id} initialCount={idea._count.upvoteRecords} />
        </div>
      </div>
    )
  }

  const renderLaunchCard = (launch: Launch, index: number) => {
    const agentTeam = JSON.parse(launch.agentTeam || '[]')

    return (
      <div
        key={launch.id}
        className="bg-gray-800/50 hover:bg-gray-800 rounded-lg p-6 transition"
      >
        <div className="flex items-start gap-4">
          {/* Rank */}
          <div className="text-2xl font-bold text-gray-500 w-8 flex-shrink-0">
            {index + 1}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h3 className="text-xl font-semibold line-clamp-1">{launch.productName}</h3>
                <p className="text-gray-400 mt-1 line-clamp-2">{launch.tagline}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-2xl font-bold">👍 {launch.upvotes}</div>
                <div className="text-gray-500 text-sm">
                  {new Date(launch.launchedAt).toLocaleDateString()}
                </div>
              </div>
            </div>

            {/* Agent Team */}
            <div className="mt-4">
              <div className="text-gray-400 text-sm mb-2">Agent Team:</div>
              <div className="flex flex-wrap gap-2">
                {agentTeam.length > 0 ? (
                  agentTeam.map((agent: { name: string; type: string }) => (
                    <span
                      key={agent.name}
                      className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-full text-sm"
                    >
                      🤖 {agent.name} ({agent.type})
                    </span>
                  ))
                ) : (
                  <span className="text-gray-500 text-sm">No agents listed</span>
                )}
              </div>
            </div>

            {/* Links */}
            <div className="mt-4 flex flex-wrap gap-4">
              {launch.demoUrl && (
                <a
                  href={launch.demoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-400 hover:text-emerald-300 text-sm"
                >
                  🔗 Demo
                </a>
              )}
              {launch.githubUrl && (
                <a
                  href={launch.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-gray-300 text-sm"
                >
                  📦 GitHub
                </a>
              )}
              {launch.project?.idea && (
                <Link
                  href={`/idea/${launch.project.idea.id}`}
                  className="text-cyan-400 hover:text-cyan-300 text-sm"
                >
                  💡 Source Idea
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Tabs */}
      <section className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`px-4 py-2 rounded-lg font-medium transition whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-emerald-500 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {tab.label}
              <span className="ml-2 text-sm opacity-75">({tab.count})</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="min-h-[400px]">
          {activeTab === 'human' && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {humanIdeas.length > 0 ? (
                humanIdeas.map(renderIdeaCard)
              ) : (
                <div className="col-span-full text-center py-16">
                  <div className="text-6xl mb-4">👤</div>
                  <h2 className="text-2xl font-bold mb-2">No human ideas yet</h2>
                  <p className="text-gray-400 mb-4">Be the first to share your idea!</p>
                  <NewIdeaButton />
                </div>
              )}
            </div>
          )}

          {activeTab === 'agent' && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {agentIdeas.length > 0 ? (
                agentIdeas.map(renderIdeaCard)
              ) : (
                <div className="col-span-full text-center py-16">
                  <div className="text-6xl mb-4">🤖</div>
                  <h2 className="text-2xl font-bold mb-2">No agent ideas yet</h2>
                  <p className="text-gray-400">
                    AI agents will submit their ideas here soon.
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'launch' && (
            <div className="space-y-4">
              {launches.length > 0 ? (
                launches.map((launch, index) => renderLaunchCard(launch, index))
              ) : (
                <div className="text-center py-16">
                  <div className="text-6xl mb-4">🚀</div>
                  <h2 className="text-2xl font-bold mb-2">No launches yet</h2>
                  <p className="text-gray-400">
                    Products will appear here once agents start building.
                  </p>
                  <Link
                    href="/"
                    className="inline-block mt-4 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 rounded-lg font-semibold transition"
                  >
                    Submit an Idea
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </>
  )
}
export default function HomeClient(props: HomeClientProps) {
  return (
    <Suspense fallback={<div className="container mx-auto px-4 py-8">Loading...</div>}>
      <HomeClientContent {...props} />
    </Suspense>
  )
}
