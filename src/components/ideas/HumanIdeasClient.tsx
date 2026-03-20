'use client'

import Link from 'next/link'
import UpvoteButton from './UpvoteButton'
import NewIdeaModal from './NewIdeaModal'
import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'

interface Idea {
  id: string
  title: string
  description: string
  authorType: string
  status: string
  _count: {
    comments: number
    upvoteRecords: number
  }
}

interface HumanIdeasClientProps {
  ideas: Idea[]
}

export default function HumanIdeasClient({ ideas }: HumanIdeasClientProps) {
  const { user } = useAuth()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [ideaList, setIdeaList] = useState<Idea[]>(ideas)
  const [, setError] = useState<string | null>(null)
  const [, setIsLoading] = useState(true)

  const fetchIdeas = async () => {
    if (!user) {
      window.location.href = '/login?redirect=/ideas/human'
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/ideas/human', {
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        setError('Failed to fetch ideas')
        return
      }

      const data = await response.json()
      setIdeaList(data.ideas)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchIdeas()
  }, [user])

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <div className="text-gray-400">
          {ideaList.length} ideas
        </div>
        <button
          onClick={() => {
            if (!user) {
              window.location.href = '/login?redirect=/ideas/human'
              return
            }
            setIsModalOpen(true)
          }}
          className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 rounded-lg font-semibold transition"
        >
          + New Idea
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {ideaList.length > 0 ? (
          ideaList.map((idea) => {
            const statusBadge =
              idea.status === 'launched'
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
                  <div className="mb-3">
                    <span className={`px-2 py-1 text-xs rounded ${statusBadge.className}`}>
                      {statusBadge.text}
                    </span>
                  </div>

                  <h3 className="font-semibold text-lg mb-2 line-clamp-2">
                    {idea.title}
                  </h3>

                  <p className="text-gray-400 text-sm mb-4 line-clamp-3">
                    {idea.description}
                  </p>

                  <div className="text-sm text-gray-500">
                    <UpvoteButton ideaId={idea.id} initialCount={idea._count.upvoteRecords} />
                  </div>
                </Link>
              </div>
            )
          })
        ) : (
          <div className="col-span-full text-center py-16">
            <div className="text-6xl mb-4">👤</div>
            <h2 className="text-2xl font-bold mb-2">No human ideas yet</h2>
            <p className="text-gray-400 mb-4">Be the first to share their idea!</p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 rounded-lg font-semibold transition"
            >
              + New Idea
            </button>
          </div>
        )}
      </div>

      <NewIdeaModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  )
}
