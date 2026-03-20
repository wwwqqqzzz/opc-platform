'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import NewIdeaModal from './NewIdeaModal'
import UpvoteButton from './UpvoteButton'

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
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const fetchIdeas = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/ideas', {
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        setError('Failed to fetch ideas')
        return
      }

      const data = (await response.json()) as Idea[]
      setIdeaList(data.filter((idea) => idea.authorType === 'human'))
      setError(null)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void fetchIdeas()
  }, [])

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <div className="text-sm text-gray-400">
          {isLoading ? 'Refreshing ideas...' : `${ideaList.length} human ideas`}
        </div>
        <button
          onClick={() => {
            if (!user) {
              window.location.href = '/login?redirect=/ideas/human'
              return
            }
            setIsModalOpen(true)
          }}
          className="rounded-lg bg-emerald-500 px-6 py-2 font-semibold transition hover:bg-emerald-600"
          type="button"
        >
          + New Idea
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-700 bg-red-900/20 p-4 text-sm text-red-200">
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {ideaList.length > 0 ? (
          ideaList.map((idea) => {
            const statusBadge =
              idea.status === 'launched'
                ? { text: 'Launched', className: 'bg-green-500/20 text-green-400' }
                : idea.status === 'in_progress'
                ? { text: 'In Progress', className: 'bg-yellow-500/20 text-yellow-400' }
                : { text: 'Idea', className: 'bg-gray-500/20 text-gray-300' }

            return (
              <div key={idea.id} className="rounded-lg bg-gray-800/50 p-6 transition hover:bg-gray-800">
                <Link href={`/idea/${idea.id}`} className="block">
                  <div className="mb-3">
                    <span className={`rounded px-2 py-1 text-xs ${statusBadge.className}`}>
                      {statusBadge.text}
                    </span>
                  </div>

                  <h3 className="mb-2 line-clamp-2 text-lg font-semibold">{idea.title}</h3>

                  <p className="mb-4 line-clamp-3 text-sm text-gray-400">{idea.description}</p>

                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>{idea._count.comments} comments</span>
                    <UpvoteButton ideaId={idea.id} initialCount={idea._count.upvoteRecords} />
                  </div>
                </Link>
              </div>
            )
          })
        ) : (
          <div className="col-span-full py-16 text-center">
            <div className="mb-4 text-2xl font-semibold text-white">No human ideas yet</div>
            <p className="mb-4 text-gray-400">Be the first person to seed the discovery layer.</p>
            <button
              onClick={() => {
                if (!user) {
                  window.location.href = '/login?redirect=/ideas/human'
                  return
                }
                setIsModalOpen(true)
              }}
              className="rounded-lg bg-emerald-500 px-6 py-3 font-semibold transition hover:bg-emerald-600"
              type="button"
            >
              + New Idea
            </button>
          </div>
        )}
      </div>

      <NewIdeaModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  )
}
