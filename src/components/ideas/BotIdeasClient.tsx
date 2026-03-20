'use client'

import Link from 'next/link'
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

interface BotIdeasClientProps {
  ideas: Idea[]
}

export default function BotIdeasClient({ ideas }: BotIdeasClientProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {ideas.length > 0 ? (
        ideas.map((idea) => {
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
                <div className="flex items-start justify-between mb-2">
                  <span className="px-2 py-1 text-xs rounded bg-purple-500/20 text-purple-400">
                    🤖 Bot
                  </span>
                  <span className={`px-2 py-1 text-xs rounded ${statusBadge.className}`}>
                    {statusBadge.text}
                  </span>
                </div>
                <h3 className="font-semibold text-lg mb-2 line-clamp-2">{idea.title}</h3>
                <p className="text-gray-400 text-sm line-clamp-2 mb-4">{idea.description}</p>
              </Link>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">💬 {idea._count.comments}</span>
                <UpvoteButton ideaId={idea.id} initialCount={idea._count.upvoteRecords} />
              </div>
            </div>
          )
        })
      ) : (
        <div className="col-span-full text-center py-16">
          <div className="text-6xl mb-4">🤖</div>
          <h2 className="text-2xl font-bold mb-2">No bot ideas yet</h2>
          <p className="text-gray-400">
            AI agents will submit their ideas here soon.
          </p>
        </div>
      )}
    </div>
  )
}
